import { db } from '../db/db';
import { Shift, Employee, SalaryPayment, Expense } from '../types';

export async function openNewShift(cashierId: string, cashierName: string, openingCash: number): Promise<{ success: boolean; shift?: Shift; error?: string }> {
  try {
    // Check if there is already an open shift for this cashier
    const existing = await db.shifts.where('cashierId').equals(cashierId).and(s => s.status === 'Open').first();
    if (existing) {
      return { success: true, shift: existing };
    }

    const shiftCount = await db.shifts.count();
    const shiftNumber = `SH-${(shiftCount + 1).toString().padStart(4, '0')}`;
    const id = `shift_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newShift: Shift = {
      id,
      shiftNumber,
      cashierId,
      cashierName,
      startTime: new Date().toISOString(),
      openingCash,
      cashSales: 0,
      cardSales: 0,
      transferSales: 0,
      cashIn: 0,
      cashOut: 0,
      expectedCash: openingCash,
      status: 'Open',
    };

    await db.shifts.add(newShift);
    return { success: true, shift: newShift };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to open shift' };
  }
}

export async function closeCurrentShift(shiftId: string, actualCountedCash: number, notes?: string): Promise<{ success: boolean; shift?: Shift; error?: string }> {
  try {
    const shift = await db.shifts.get(shiftId);
    if (!shift) return { success: false, error: 'Shift not found' };

    const expectedCash = shift.openingCash + (shift.cashSales || 0) + (shift.cashIn || 0) - (shift.cashOut || 0);
    const difference = actualCountedCash - expectedCash;

    const updated: Shift = {
      ...shift,
      endTime: new Date().toISOString(),
      actualCash: actualCountedCash,
      expectedCash,
      difference,
      status: 'Closed',
      notes,
    };

    await db.shifts.put(updated);
    return { success: true, shift: updated };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to close shift' };
  }
}

export async function calculateMonthlyEmployeeSalary(employeeId: string, monthStr: string): Promise<{
  basicSalary: number;
  commissions: number;
  advances: number;
  netPayable: number;
}> {
  const employee = await db.employees.get(employeeId);
  const basicSalary = employee?.basicSalary || 0;
  const commissionRate = employee?.commissionRate || 0;

  // Calculate commissions from sales and repairs completed by this employee in the month
  const sales = await db.sales.where('cashierId').equals(employeeId).toArray();
  const monthSales = sales.filter(s => s.timestamp.startsWith(monthStr) && s.status === 'Completed');
  const serviceSalesTotal = monthSales.reduce((sum, s) => {
    const serviceItemsTotal = s.items.filter(i => i.isCustomPrice || i.category === 'services' || i.category === 'photo_print' || i.category === 'mug_print' || i.category === 'rubber_seal')
      .reduce((sub, i) => sub + i.total, 0);
    return sum + serviceItemsTotal;
  }, 0);

  const commissions = (serviceSalesTotal * commissionRate) / 100;

  // Calculate salary advances taken as expenses
  const expenses = await db.expenses.where('category').equals('Salary_Advance').toArray();
  const advances = expenses
    .filter(e => e.paidTo === employee?.name && e.timestamp.startsWith(monthStr))
    .reduce((sum, e) => sum + e.amount, 0);

  const netPayable = Math.max(0, basicSalary + commissions - advances);

  return {
    basicSalary,
    commissions,
    advances,
    netPayable,
  };
}
