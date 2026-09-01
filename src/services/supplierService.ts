import { db } from '../db/db';
import { Supplier } from '../types';
import { supplierSchema, sanitizeString } from './security';
import { logAuditEvent } from './authService';
import { z } from 'zod';

export async function saveSupplier(
  data: {
    name: string;
    company: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  },
  savedByName: string = 'Admin'
): Promise<{ success: boolean; supplier?: Supplier; error?: string }> {
  try {
    const validated = supplierSchema.parse({
      name: sanitizeString(data.name),
      company: sanitizeString(data.company),
      phone: sanitizeString(data.phone),
      email: data.email ? sanitizeString(data.email) : undefined,
      address: data.address ? sanitizeString(data.address) : undefined,
      notes: data.notes ? sanitizeString(data.notes) : undefined,
    });

    const id = `sup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newSupplier: Supplier = {
      id,
      name: validated.name,
      company: validated.company,
      phone: validated.phone,
      email: validated.email || undefined,
      address: validated.address || undefined,
      notes: validated.notes || undefined,
      totalPurchased: 0,
      balancePayable: 0,
      createdAt: new Date().toISOString(),
    };

    await db.suppliers.add(newSupplier);

    await logAuditEvent({
      userId: 'system',
      userName: savedByName,
      action: 'SUPPLIER_CREATE',
      details: `New supplier created: ${validated.company} (${validated.name})`,
    });

    return { success: true, supplier: newSupplier };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to save supplier' };
  }
}
