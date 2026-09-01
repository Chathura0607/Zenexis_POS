import { db } from '../db/db';
import { ReloadTransaction, TelcoProvider } from '../types';
import { logAuditEvent } from './authService';
import { reloadTransactionSchema, sanitizeString } from './security';
import { z } from 'zod';

export const TELCO_COMMISSIONS: Record<TelcoProvider, number> = {
  Dialog: 3.5, // 3.5% commission
  Mobitel: 3.5,
  Hutch: 4.0,
  Airtel: 4.0,
  SLT: 2.0,
  CEB_Electricity: 1.5,
  Water_Board: 1.5,
  Other: 2.0,
};

export async function processReloadTransaction(params: {
  provider: TelcoProvider;
  customerPhone: string;
  amount: number;
  cashierId: string;
  cashierName: string;
  shiftId: string;
}): Promise<{ success: boolean; transaction?: ReloadTransaction; error?: string }> {
  try {
    const validated = reloadTransactionSchema.parse(params);

    const rate = TELCO_COMMISSIONS[validated.provider] || 2.0;
    const commissionAmount = (validated.amount * rate) / 100;
    const id = `reload_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const transaction: ReloadTransaction = {
      id,
      provider: validated.provider,
      customerPhone: sanitizeString(validated.customerPhone),
      amount: validated.amount,
      commissionRate: rate,
      commissionAmount,
      cashierId: validated.cashierId,
      cashierName: sanitizeString(validated.cashierName),
      shiftId: validated.shiftId || '',
      timestamp: new Date().toISOString(),
      status: 'Success',
    };

    await db.transaction('rw', [db.reloadTransactions, db.shifts], async () => {
      await db.reloadTransactions.add(transaction);

      if (validated.shiftId) {
        const shift = await db.shifts.get(validated.shiftId);
        if (shift && shift.status === 'Open') {
          // Cash received from customer adds to cash drawer
          const newCashSales = (shift.cashSales || 0) + validated.amount;
          await db.shifts.update(validated.shiftId, {
            cashSales: newCashSales,
            expectedCash: shift.openingCash + newCashSales + (shift.cashIn || 0) - (shift.cashOut || 0),
          });
        }
      }
    });

    // Write audit log
    await logAuditEvent({
      userId: validated.cashierId,
      userName: validated.cashierName,
      action: 'RELOAD_TRANSACTION',
      details: `${validated.provider} reload of Rs. ${validated.amount.toLocaleString()} processed for ${transaction.customerPhone}`,
    });

    return { success: true, transaction };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Reload failed' };
  }
}

