import { db } from '../db/db';
import { Customer } from '../types';
import { customerSchema, sanitizeString } from './security';
import { logAuditEvent } from './authService';
import { z } from 'zod';

export async function saveCustomer(
  data: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  },
  savedByName: string = 'Staff'
): Promise<{ success: boolean; customer?: Customer; error?: string }> {
  try {
    const validated = customerSchema.parse({
      name: sanitizeString(data.name),
      phone: sanitizeString(data.phone),
      address: data.address ? sanitizeString(data.address) : undefined,
      notes: data.notes ? sanitizeString(data.notes) : undefined,
    });

    // Check existing customer with same phone number
    const existing = await db.customers.where('phone').equals(validated.phone).first();
    if (existing) {
      // Return existing customer if found
      return { success: true, customer: existing };
    }

    const id = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newCustomer: Customer = {
      id,
      name: validated.name,
      phone: validated.phone,
      address: validated.address || undefined,
      loyaltyPoints: 0,
      totalSpent: 0,
      totalVisits: 0,
      createdAt: new Date().toISOString(),
    };

    await db.customers.add(newCustomer);

    await logAuditEvent({
      userId: 'system',
      userName: savedByName,
      action: 'CUSTOMER_CREATE',
      details: `New customer registered: ${validated.name} (${validated.phone})`,
    });

    return { success: true, customer: newCustomer };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to save customer' };
  }
}
