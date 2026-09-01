import { db } from '../db/db';
import { logAuditEvent } from './authService';
import { databaseBackupSchema, hashPin } from './security';
import { z } from 'zod';

export interface DatabaseBackupPayload {
  version: number;
  exportedAt: string;
  shopName: string;
  data: {
    products: any[];
    categories: any[];
    sales: any[];
    customers: any[];
    suppliers: any[];
    purchases: any[];
    repairJobs: any[];
    reloadTransactions: any[];
    employees: any[];
    shifts: any[];
    expenses: any[];
    salaries: any[];
    auditLogs: any[];
    settings: any[];
  };
}

export async function exportDatabaseBackup(): Promise<{ success: boolean; dataString?: string; error?: string }> {
  try {
    const rawEmployees = await db.employees.toArray();
    // Ensure all exported employee PINs are hashed
    const employees = await Promise.all(
      rawEmployees.map(async (emp) => {
        if (emp.pin && emp.pin.length !== 64) {
          return { ...emp, pin: await hashPin(emp.pin) };
        }
        return emp;
      })
    );

    const backup: DatabaseBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      shopName: 'Zenexis',
      data: {
        products: await db.products.toArray(),
        categories: await db.categories.toArray(),
        sales: await db.sales.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        purchases: await db.purchases.toArray(),
        repairJobs: await db.repairJobs.toArray(),
        reloadTransactions: await db.reloadTransactions.toArray(),
        employees,
        shifts: await db.shifts.toArray(),
        expenses: await db.expenses.toArray(),
        salaries: await db.salaries.toArray(),
        auditLogs: await db.auditLogs.toArray(),
        settings: await db.settings.toArray(),
      },
    };

    const dataString = JSON.stringify(backup, null, 2);

    await logAuditEvent({
      userId: 'system',
      userName: 'Admin',
      action: 'BACKUP_EXPORT',
      details: `Full JSON Database backup generated with ${backup.data.sales.length} sales and ${backup.data.products.length} products`,
    });

    return { success: true, dataString };
  } catch (error: any) {
    return { success: false, error: error.message || 'Backup export failed' };
  }
}

export async function restoreDatabaseBackup(jsonString: string): Promise<{ success: boolean; error?: string }> {
  try {
    let parsedRaw: any;
    try {
      parsedRaw = JSON.parse(jsonString);
    } catch (e) {
      return { success: false, error: 'File is not a valid JSON document' };
    }

    // Strict schema validation before touching existing database
    const validationResult = databaseBackupSchema.safeParse(parsedRaw);
    if (!validationResult.success) {
      return {
        success: false,
        error: `Invalid backup schema: ${validationResult.error.errors[0]?.message || 'Structural error'}`,
      };
    }

    const parsed: DatabaseBackupPayload = validationResult.data as DatabaseBackupPayload;

    await db.transaction(
      'rw',
      [
        db.products,
        db.categories,
        db.sales,
        db.customers,
        db.suppliers,
        db.purchases,
        db.repairJobs,
        db.reloadTransactions,
        db.employees,
        db.shifts,
        db.expenses,
        db.salaries,
        db.auditLogs,
        db.settings,
      ],
      async () => {
        // Clear current tables only inside the transaction
        await db.products.clear();
        await db.categories.clear();
        await db.sales.clear();
        await db.customers.clear();
        await db.suppliers.clear();
        await db.purchases.clear();
        await db.repairJobs.clear();
        await db.reloadTransactions.clear();
        await db.employees.clear();
        await db.shifts.clear();
        await db.expenses.clear();
        await db.salaries.clear();
        await db.auditLogs.clear();
        await db.settings.clear();

        // Bulk add validated backup data with PIN hashing protection
        if (parsed.data.products?.length) await db.products.bulkAdd(parsed.data.products);
        if (parsed.data.categories?.length) await db.categories.bulkAdd(parsed.data.categories);
        if (parsed.data.sales?.length) await db.sales.bulkAdd(parsed.data.sales);
        if (parsed.data.customers?.length) await db.customers.bulkAdd(parsed.data.customers);
        if (parsed.data.suppliers?.length) await db.suppliers.bulkAdd(parsed.data.suppliers);
        if (parsed.data.purchases?.length) await db.purchases.bulkAdd(parsed.data.purchases);
        if (parsed.data.repairJobs?.length) await db.repairJobs.bulkAdd(parsed.data.repairJobs);
        if (parsed.data.reloadTransactions?.length) await db.reloadTransactions.bulkAdd(parsed.data.reloadTransactions);
        if (parsed.data.employees?.length) {
          const sanitizedEmployees = await Promise.all(
            parsed.data.employees.map(async (emp: any) => {
              if (emp.pin && emp.pin.length !== 64) {
                return { ...emp, pin: await hashPin(emp.pin) };
              }
              return emp;
            })
          );
          await db.employees.bulkAdd(sanitizedEmployees);
        }
        if (parsed.data.shifts?.length) await db.shifts.bulkAdd(parsed.data.shifts);
        if (parsed.data.expenses?.length) await db.expenses.bulkAdd(parsed.data.expenses);
        if (parsed.data.salaries?.length) await db.salaries.bulkAdd(parsed.data.salaries);
        if (parsed.data.auditLogs?.length) await db.auditLogs.bulkAdd(parsed.data.auditLogs);
        if (parsed.data.settings?.length) await db.settings.bulkAdd(parsed.data.settings);
      }
    );

    await logAuditEvent({
      userId: 'system',
      userName: 'Admin',
      action: 'BACKUP_RESTORE',
      details: `Database successfully restored from backup created at ${parsed.exportedAt}`,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to restore database' };
  }
}

