import { db } from '../db/db';
import { Expense } from '../types';
import { expenseSchema, sanitizeString } from './security';
import { logAuditEvent } from './authService';
import { z } from 'zod';

export async function createExpense(
  data: {
    title: string;
    category: Expense['category'];
    amount: number;
    paymentMethod: 'Cash' | 'Bank_Transfer' | 'Card';
    paidTo?: string;
    shiftId?: string;
    recordedBy: string;
    notes?: string;
  }
): Promise<{ success: boolean; expense?: Expense; error?: string }> {
  try {
    const validated = expenseSchema.parse({
      title: sanitizeString(data.title),
      category: data.category,
      amount: Number(data.amount),
      paymentMethod: data.paymentMethod,
      paidTo: data.paidTo ? sanitizeString(data.paidTo) : undefined,
      shiftId: data.shiftId || undefined,
      recordedBy: sanitizeString(data.recordedBy),
      notes: data.notes ? sanitizeString(data.notes) : undefined,
    });

    const id = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newExpense: Expense = {
      id,
      title: validated.title,
      category: validated.category as any,
      amount: validated.amount,
      paymentMethod: validated.paymentMethod,
      paidTo: validated.paidTo,
      shiftId: validated.shiftId,
      recordedBy: validated.recordedBy,
      notes: validated.notes,
      timestamp: new Date().toISOString(),
    };

    await db.transaction('rw', [db.expenses, db.shifts], async () => {
      await db.expenses.add(newExpense);

      // If paid with Cash and active shift is attached, atomically register Cash Out
      if (validated.paymentMethod === 'Cash' && validated.shiftId) {
        const shift = await db.shifts.get(validated.shiftId);
        if (shift && shift.status === 'Open') {
          const newCashOut = (shift.cashOut || 0) + validated.amount;
          const newExpectedCash = shift.openingCash + (shift.cashSales || 0) + (shift.cashIn || 0) - newCashOut;
          await db.shifts.update(validated.shiftId, {
            cashOut: newCashOut,
            expectedCash: newExpectedCash,
          });
        }
      }
    });

    await logAuditEvent({
      userId: 'system',
      userName: validated.recordedBy,
      action: 'EXPENSE_CREATE',
      details: `Expense logged: ${validated.title} (Rs. ${validated.amount.toLocaleString()}) via ${validated.paymentMethod}`,
    });

    return { success: true, expense: newExpense };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to create expense' };
  }
}
