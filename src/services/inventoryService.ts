import { db } from '../db/db';
import { Product, PurchaseOrder, Supplier } from '../types';
import { z } from 'zod';
import { logAuditEvent } from './authService';
import { sanitizeString, purchaseOrderSchema } from './security';

export const productSchema = z.object({
  barcode: z.string().min(1, 'Barcode is required').max(50, 'Barcode cannot exceed 50 characters'),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU cannot exceed 50 characters'),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(150, 'Product name cannot exceed 150 characters'),
  category: z.string().min(1, 'Category is required').max(100),
  buyPrice: z.number().min(0, 'Buy price cannot be negative').max(10000000, 'Buy price exceeds limit'),
  sellPrice: z.number().min(0, 'Sell price cannot be negative').max(10000000, 'Sell price exceeds limit'),
  stockQty: z.number().int().min(0, 'Stock quantity cannot be negative').max(1000000, 'Stock quantity exceeds limit'),
  minStockLevel: z.number().int().min(0, 'Minimum stock level cannot be negative').max(100000, 'Minimum stock level exceeds limit'),
  unit: z.string().min(1, 'Unit is required').max(30),
  supplierId: z.string().max(100).optional(),
  supplierName: z.string().max(150).optional(),
  isService: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export async function saveProduct(
  productData: z.infer<typeof productSchema>,
  existingId?: string,
  updatedByName: string = 'Admin'
): Promise<{ success: boolean; product?: Product; error?: string }> {
  try {
    const validated = productSchema.parse({
      ...productData,
      barcode: sanitizeString(productData.barcode),
      sku: sanitizeString(productData.sku),
      name: sanitizeString(productData.name),
      supplierName: productData.supplierName ? sanitizeString(productData.supplierName) : undefined,
      notes: productData.notes ? sanitizeString(productData.notes) : undefined,
    });

    if (existingId) {
      const existing = await db.products.get(existingId);
      if (!existing) return { success: false, error: 'Product not found' };

      const updated: Product = {
        ...existing,
        ...validated,
        category: validated.category as any,
        updatedAt: new Date().toISOString(),
      };

      await db.products.put(updated);

      await logAuditEvent({
        userId: 'system',
        userName: updatedByName,
        action: 'PRODUCT_UPDATE',
        details: `Product updated: ${updated.name} (Stock: ${updated.stockQty}, Price: Rs. ${updated.sellPrice})`,
      });

      return { success: true, product: updated };
    } else {
      // Check duplicate barcode
      const existingBarcode = await db.products.where('barcode').equals(validated.barcode.trim()).first();
      if (existingBarcode) {
        return { success: false, error: `Barcode "${validated.barcode}" is already assigned to ${existingBarcode.name}` };
      }

      const id = `prd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const newProduct: Product = {
        id,
        ...validated,
        category: validated.category as any,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.products.add(newProduct);

      await logAuditEvent({
        userId: 'system',
        userName: updatedByName,
        action: 'PRODUCT_CREATE',
        details: `New product registered: ${newProduct.name} (SKU: ${newProduct.sku}, Stock: ${newProduct.stockQty})`,
      });

      return { success: true, product: newProduct };
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to save product' };
  }
}

export async function processStockInward(
  purchase: Omit<PurchaseOrder, 'id' | 'timestamp'>,
  recordedByName: string = 'Admin'
): Promise<{ success: boolean; order?: PurchaseOrder; error?: string }> {
  try {
    const validated = purchaseOrderSchema.parse({
      ...purchase,
      invoiceNo: sanitizeString(purchase.invoiceNo),
      supplierName: sanitizeString(purchase.supplierName),
      notes: purchase.notes ? sanitizeString(purchase.notes) : undefined,
    });

    const id = `po_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newOrder: PurchaseOrder = {
      ...validated,
      id,
      timestamp: new Date().toISOString(),
    };

    await db.transaction('rw', [db.purchases, db.products, db.suppliers], async () => {
      await db.purchases.add(newOrder);

      // Increase stock quantity & update buy/sell prices for each item
      for (const item of validated.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          await db.products.update(item.productId, {
            stockQty: (product.stockQty || 0) + item.qty,
            buyPrice: item.unitBuyPrice,
            sellPrice: item.unitSellPrice || product.sellPrice,
            supplierId: validated.supplierId,
            supplierName: validated.supplierName,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update supplier purchase total and balance payable
      if (validated.supplierId) {
        const supplier = await db.suppliers.get(validated.supplierId);
        if (supplier) {
          const unpaid = Math.max(0, validated.totalCost - validated.paidAmount);
          await db.suppliers.update(validated.supplierId, {
            totalPurchased: (supplier.totalPurchased || 0) + validated.totalCost,
            balancePayable: (supplier.balancePayable || 0) + unpaid,
          });
        }
      }
    });

    await logAuditEvent({
      userId: 'system',
      userName: recordedByName,
      action: 'STOCK_INWARD',
      details: `Stock inward recorded #${validated.invoiceNo} from ${validated.supplierName} (Total: Rs. ${validated.totalCost.toLocaleString()}, ${validated.items.length} items)`,
    });

    return { success: true, order: newOrder };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to record purchase' };
  }
}

