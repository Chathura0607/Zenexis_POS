import { db } from '../db/db';
import { CartItem, Sale, PaymentMethod, Customer } from '../types';
import { logAuditEvent } from './authService';
import { checkoutPayloadSchema, sanitizeString } from './security';
import { z } from 'zod';

export interface CheckoutPayload {
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  cardAmount?: number;
  transferAmount?: number;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  notes?: string;
}

export function calculateCartTotals(
  items: CartItem[],
  invoiceDiscountType: 'percentage' | 'fixed' = 'percentage',
  invoiceDiscountValue: number = 0
) {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const costTotal = items.reduce((sum, item) => sum + ((Number(item.costPrice) || 0) * (Number(item.qty) || 1)), 0);

  let invoiceDiscountAmount = 0;
  if (invoiceDiscountType === 'percentage') {
    const pct = Math.min(Math.max(Number(invoiceDiscountValue) || 0, 0), 100);
    invoiceDiscountAmount = (subtotal * pct) / 100;
  } else {
    invoiceDiscountAmount = Math.min(Math.max(Number(invoiceDiscountValue) || 0, 0), subtotal);
  }

  const netTotal = Math.max(0, subtotal - invoiceDiscountAmount);
  const grossProfit = Math.max(0, netTotal - costTotal);
  const totalItemCount = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

  return {
    subtotal,
    costTotal,
    discountAmount: invoiceDiscountAmount,
    netTotal,
    grossProfit,
    totalItemCount,
  };
}

export async function processCheckout(rawPayload: CheckoutPayload): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  try {
    const validated = checkoutPayloadSchema.parse(rawPayload);

    const totals = calculateCartTotals(validated.items, validated.discountType, validated.discountValue);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    let balanceChange = 0;
    if (validated.paymentMethod === 'Cash' && validated.cashReceived !== undefined) {
      if (validated.cashReceived < totals.netTotal) {
        return { success: false, error: 'Cash received is less than the net payable total.' };
      }
      balanceChange = Math.max(0, validated.cashReceived - totals.netTotal);
    } else if (validated.paymentMethod === 'Split') {
      const splitSum = (validated.cashReceived || 0) + (validated.cardAmount || 0) + (validated.transferAmount || 0);
      if (splitSum < totals.netTotal) {
        return { success: false, error: 'Split payment sum is less than the net payable total.' };
      }
      if (validated.cashReceived && validated.cashReceived > totals.netTotal) {
        balanceChange = validated.cashReceived - totals.netTotal;
      }
    }

    const sanitizedCustName = validated.customerName ? sanitizeString(validated.customerName) : undefined;
    const sanitizedPhone = validated.customerPhone ? sanitizeString(validated.customerPhone) : undefined;
    const sanitizedNotes = validated.notes ? sanitizeString(validated.notes) : undefined;

    const saleRecord: Sale = {
      id: saleId,
      invoiceNumber,
      customerId: validated.customerId,
      customerName: sanitizedCustName || (sanitizedPhone ? `Customer (${sanitizedPhone})` : 'Walk-in Customer'),
      customerPhone: sanitizedPhone,
      items: validated.items,
      itemCount: totals.totalItemCount,
      subtotal: totals.subtotal,
      discountType: validated.discountType,
      discountValue: validated.discountValue,
      discountAmount: totals.discountAmount,
      netTotal: totals.netTotal,
      costTotal: totals.costTotal,
      grossProfit: totals.grossProfit,
      paymentMethod: validated.paymentMethod,
      cashReceived: validated.cashReceived,
      balanceChange,
      cardAmount: validated.cardAmount,
      transferAmount: validated.transferAmount,
      cashierId: validated.cashierId,
      cashierName: validated.cashierName,
      shiftId: validated.shiftId || '',
      status: 'Completed',
      notes: sanitizedNotes,
      timestamp: new Date().toISOString(),
    };

    // Execute atomic Dexie transaction to ensure stock and sales are strictly updated together
    await db.transaction('rw', [db.sales, db.products, db.shifts, db.customers], async () => {
      // 1. Save Sale
      await db.sales.add(saleRecord);

      // 2. Decrement physical stock for non-service items
      for (const item of validated.items) {
        const product = await db.products.get(item.productId);
        if (product && !product.isService) {
          const newQty = Math.max(0, (product.stockQty || 0) - item.qty);
          await db.products.update(item.productId, {
            stockQty: newQty,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Update Shift Register balances
      if (validated.shiftId) {
        const shift = await db.shifts.get(validated.shiftId);
        if (shift && shift.status === 'Open') {
          let addCash = 0;
          let addCard = 0;
          let addTransfer = 0;

          if (validated.paymentMethod === 'Cash') {
            addCash = totals.netTotal;
          } else if (validated.paymentMethod === 'Card') {
            addCard = totals.netTotal;
          } else if (validated.paymentMethod === 'Bank_Transfer') {
            addTransfer = totals.netTotal;
          } else if (validated.paymentMethod === 'Split') {
            addCash = validated.cashReceived ? (validated.cashReceived - balanceChange) : 0;
            addCard = validated.cardAmount || 0;
            addTransfer = validated.transferAmount || 0;
          }

          const newCashSales = (shift.cashSales || 0) + addCash;
          const newExpectedCash = shift.openingCash + newCashSales + (shift.cashIn || 0) - (shift.cashOut || 0);

          await db.shifts.update(validated.shiftId, {
            cashSales: newCashSales,
            cardSales: (shift.cardSales || 0) + addCard,
            transferSales: (shift.transferSales || 0) + addTransfer,
            expectedCash: newExpectedCash,
          });
        }
      }

      // 4. Update Customer record if attached
      if (validated.customerId) {
        const cust = await db.customers.get(validated.customerId);
        if (cust) {
          await db.customers.update(validated.customerId, {
            totalSpent: (cust.totalSpent || 0) + totals.netTotal,
            totalVisits: (cust.totalVisits || 0) + 1,
            loyaltyPoints: (cust.loyaltyPoints || 0) + Math.floor(totals.netTotal / 100),
          });
        }
      } else if (sanitizedPhone && sanitizedPhone.length >= 9) {
        // Auto-register new walk-in customer with phone
        const existingCust = await db.customers.where('phone').equals(sanitizedPhone).first();
        if (!existingCust) {
          await db.customers.add({
            id: `cust_${Date.now()}`,
            name: sanitizedCustName || `Customer (${sanitizedPhone})`,
            phone: sanitizedPhone,
            totalSpent: totals.netTotal,
            totalVisits: 1,
            loyaltyPoints: Math.floor(totals.netTotal / 100),
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    // Write audit log with corrected action
    await logAuditEvent({
      userId: validated.cashierId,
      userName: validated.cashierName,
      action: 'SALE_CREATE',
      details: `Sale ${invoiceNumber} completed. Total: Rs. ${totals.netTotal.toLocaleString()}`,
    });

    return { success: true, sale: saleRecord };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    console.error('Checkout failed:', error);
    return { success: false, error: error.message || 'Transaction failed' };
  }
}

export async function refundSale(
  saleId: string,
  reason: string,
  refundedById: string,
  refundedByName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const sale = await db.sales.get(saleId);
    if (!sale) {
      return { success: false, error: 'Sale record not found' };
    }

    if (sale.status === 'Refunded') {
      return { success: false, error: 'This sale has already been refunded' };
    }

    await db.transaction('rw', [db.sales, db.products, db.shifts, db.customers], async () => {
      // 1. Mark Sale as Refunded
      const updatedNotes = sale.notes
        ? `${sale.notes} [Refunded: ${reason}]`
        : `[Refunded: ${reason}]`;

      await db.sales.update(saleId, {
        status: 'Refunded',
        notes: updatedNotes,
      });

      // 2. Restock physical products
      for (const item of sale.items) {
        const product = await db.products.get(item.productId);
        if (product && !product.isService) {
          const restoredQty = (product.stockQty || 0) + item.qty;
          await db.products.update(item.productId, {
            stockQty: restoredQty,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 3. Adjust shift if active
      if (sale.shiftId) {
        const shift = await db.shifts.get(sale.shiftId);
        if (shift && shift.status === 'Open') {
          let deductCash = 0;
          let deductCard = 0;
          let deductTransfer = 0;

          if (sale.paymentMethod === 'Cash') {
            deductCash = sale.netTotal;
          } else if (sale.paymentMethod === 'Card') {
            deductCard = sale.netTotal;
          } else if (sale.paymentMethod === 'Bank_Transfer') {
            deductTransfer = sale.netTotal;
          } else if (sale.paymentMethod === 'Split') {
            deductCash = sale.cashReceived ? Math.max(0, sale.cashReceived - (sale.balanceChange || 0)) : 0;
            deductCard = sale.cardAmount || 0;
            deductTransfer = sale.transferAmount || 0;
          }

          const newCashSales = Math.max(0, (shift.cashSales || 0) - deductCash);
          const newExpectedCash = shift.openingCash + newCashSales + (shift.cashIn || 0) - (shift.cashOut || 0);

          await db.shifts.update(sale.shiftId, {
            cashSales: newCashSales,
            cardSales: Math.max(0, (shift.cardSales || 0) - deductCard),
            transferSales: Math.max(0, (shift.transferSales || 0) - deductTransfer),
            expectedCash: newExpectedCash,
          });
        }
      }

      // 4. Adjust customer stats if attached
      if (sale.customerId) {
        const cust = await db.customers.get(sale.customerId);
        if (cust) {
          await db.customers.update(sale.customerId, {
            totalSpent: Math.max(0, (cust.totalSpent || 0) - sale.netTotal),
            loyaltyPoints: Math.max(0, (cust.loyaltyPoints || 0) - Math.floor(sale.netTotal / 100)),
          });
        }
      }
    });

    // Write audit log
    await logAuditEvent({
      userId: refundedById,
      userName: refundedByName,
      action: 'SALE_VOID',
      details: `Sale ${sale.invoiceNumber} refunded (Rs. ${sale.netTotal}). Reason: ${reason}`,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Refund failed:', error);
    return { success: false, error: error.message || 'Refund operation failed' };
  }
}

