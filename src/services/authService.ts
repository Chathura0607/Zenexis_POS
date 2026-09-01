import { db } from '../db/db';
import { Employee, AuditLog, UserRole } from '../types';
import { verifyPin, hashPin, sanitizeString, employeeSchema } from './security';
import { z } from 'zod';

export async function authenticateWithPin(pin: string): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const trimmed = pin.trim();
    if (!trimmed || trimmed.length < 4) {
      return { success: false, error: 'PIN must be at least 4 digits.' };
    }

    const employees = await db.employees.toArray();
    const activeEmployees = employees.filter(e => e.active);

    let matchedEmployee: Employee | null = null;
    for (const emp of activeEmployees) {
      const isMatch = await verifyPin(trimmed, emp.pin);
      if (isMatch) {
        matchedEmployee = emp;
        break;
      }
    }

    if (!matchedEmployee) {
      await logAuditEvent({
        userId: 'anonymous',
        userName: 'Unknown',
        action: 'AUTH_FAILED',
        details: 'Failed PIN unlock attempt'
      });
      return { success: false, error: 'Invalid PIN. Please try again.' };
    }

    // Auto-migrate legacy plaintext PIN to SHA-256 hash if not already hashed
    if (matchedEmployee.pin.length !== 64) {
      const hashed = await hashPin(trimmed);
      await db.employees.update(matchedEmployee.id, { pin: hashed });
      matchedEmployee.pin = hashed;
    }

    // Log the successful authentication
    await logAuditEvent({
      userId: matchedEmployee.id,
      userName: matchedEmployee.name,
      action: 'LOGIN',
      details: `${matchedEmployee.role.toUpperCase()} authenticated successfully via PIN`
    });

    return { success: true, employee: matchedEmployee };
  } catch (error: any) {
    return { success: false, error: error.message || 'Authentication failed' };
  }
}

export async function createEmployee(
  payload: {
    name: string;
    phone: string;
    role: UserRole;
    pin: string;
    basicSalary: number;
    commissionRate: number;
    active?: boolean;
  },
  createdByName: string = 'Admin'
): Promise<{ success: boolean; employee?: Employee; error?: string }> {
  try {
    const validated = employeeSchema.parse({
      name: sanitizeString(payload.name),
      phone: sanitizeString(payload.phone),
      role: payload.role,
      pin: payload.pin.trim(),
      basicSalary: payload.basicSalary,
      commissionRate: payload.commissionRate,
      active: payload.active ?? true,
    });

    // Check if phone already registered for another staff member
    const existing = await db.employees.where('phone').equals(validated.phone).first();
    if (existing) {
      return { success: false, error: `Phone number ${validated.phone} is already registered to ${existing.name}` };
    }

    const hashedPin = await hashPin(validated.pin);
    const id = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const newEmp: Employee = {
      id,
      name: validated.name,
      phone: validated.phone,
      role: validated.role,
      pin: hashedPin,
      basicSalary: validated.basicSalary,
      commissionRate: validated.commissionRate,
      active: validated.active,
      createdAt: new Date().toISOString(),
    };

    await db.employees.add(newEmp);

    await logAuditEvent({
      userId: 'system',
      userName: createdByName,
      action: 'EMPLOYEE_CREATE',
      details: `New ${validated.role.toUpperCase()} staff member created: ${validated.name} (${validated.phone})`
    });

    return { success: true, employee: newEmp };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to create employee' };
  }
}

export async function updateEmployeePin(
  employeeId: string,
  newPin: string,
  updatedByName: string = 'Admin'
): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = newPin.trim();
    if (!/^\d{4,6}$/.test(trimmed)) {
      return { success: false, error: 'PIN must be 4 to 6 numeric digits' };
    }

    const employee = await db.employees.get(employeeId);
    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const hashed = await hashPin(trimmed);
    await db.employees.update(employeeId, { pin: hashed });

    await logAuditEvent({
      userId: employeeId,
      userName: employee.name,
      action: 'PIN_UPDATE',
      details: `PIN credential updated for ${employee.name} (${employee.role}) by ${updatedByName}`
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update PIN' };
  }
}

export async function logAuditEvent(log: Omit<AuditLog, 'id' | 'timestamp'>) {
  try {
    await db.auditLogs.add({
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...log,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}


