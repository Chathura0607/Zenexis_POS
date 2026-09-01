import { db } from '../db/db';
import { RepairJob, RepairStatus, RepairJobType, AppSettings } from '../types';
import { logAuditEvent } from './authService';
import { repairJobSchema, sanitizeString } from './security';
import { z } from 'zod';

export async function createRepairJob(
  jobData: Omit<RepairJob, 'id' | 'ticketNumber' | 'receivedDate' | 'balanceDue'>
): Promise<{ success: boolean; job?: RepairJob; error?: string }> {
  try {
    const validated = repairJobSchema.parse(jobData);

    const count = await db.repairJobs.count();
    const prefix = validated.jobType === 'mobile_repair' ? 'MOB' :
                   validated.jobType === 'pc_repair' ? 'PC' :
                   validated.jobType === 'mug_print' ? 'MUG' :
                   validated.jobType === 'rubber_seal' ? 'SEAL' :
                   validated.jobType === 'photo_print' ? 'PHO' : 'JOB';

    const ticketNumber = `ZX-${prefix}-${(count + 1001).toString()}`;
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const balanceDue = Math.max(0, validated.estimatedCost - validated.advancePaid);

    const newJob: RepairJob = {
      ...validated,
      customerName: sanitizeString(validated.customerName),
      customerPhone: sanitizeString(validated.customerPhone),
      deviceOrItemName: sanitizeString(validated.deviceOrItemName),
      brandModel: validated.brandModel ? sanitizeString(validated.brandModel) : undefined,
      serialOrImei: validated.serialOrImei ? sanitizeString(validated.serialOrImei) : undefined,
      problemDescription: sanitizeString(validated.problemDescription),
      accessoriesReceived: validated.accessoriesReceived ? sanitizeString(validated.accessoriesReceived) : undefined,
      technicianName: validated.technicianName ? sanitizeString(validated.technicianName) : undefined,
      notes: validated.notes ? sanitizeString(validated.notes) : undefined,
      id,
      ticketNumber,
      balanceDue,
      receivedDate: new Date().toISOString(),
    };

    await db.repairJobs.add(newJob);

    await logAuditEvent({
      userId: 'system',
      userName: newJob.technicianName || 'Staff',
      action: 'REPAIR_CREATE',
      details: `New Service Job #${ticketNumber} created for ${newJob.customerName} (${newJob.deviceOrItemName})`,
    });

    return { success: true, job: newJob };
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0]?.message || 'Validation error' };
    }
    return { success: false, error: error.message || 'Failed to create job ticket' };
  }
}

export async function updateRepairStatus(
  jobId: string,
  status: RepairStatus,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await db.repairJobs.get(jobId);
    if (!job) return { success: false, error: 'Job ticket not found' };

    const updates: Partial<RepairJob> = {
      status,
      notes: notes ? sanitizeString(notes) : job.notes,
    };

    if (status === 'Ready' && !job.completedDate) {
      updates.completedDate = new Date().toISOString();
    } else if (status === 'Delivered' && !job.deliveredDate) {
      updates.deliveredDate = new Date().toISOString();
      updates.balanceDue = 0; // Cleared on delivery
    }

    await db.repairJobs.update(jobId, updates);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update repair status' };
  }
}

export function generateCustomerWhatsAppMessage(job: RepairJob, settings?: AppSettings): string {
  const shopName = settings?.shopName || 'Zenexis';
  const shopPhone = settings?.shopPhone || '0707120945';
  const location = settings?.shopLocation || 'Polhena, Ambalangoda';

  if (job.status === 'Ready') {
    return encodeURIComponent(
      `Hello ${job.customerName},\n\n` +
      `Great news! Your ${job.deviceOrItemName} (Job #${job.ticketNumber}) is ready for pickup at ${shopName} (${location}).\n\n` +
      `📌 Balance Due: Rs. ${job.balanceDue.toLocaleString()}\n` +
      `📞 Contact: ${shopPhone}\n\n` +
      `Thank you for trusting ${shopName}!`
    );
  }

  return encodeURIComponent(
    `Hello ${job.customerName},\n\n` +
    `Your service ticket #${job.ticketNumber} for "${job.deviceOrItemName}" has been received at ${shopName}.\n` +
    `Status: ${job.status}\n` +
    `Estimated Cost: Rs. ${job.estimatedCost.toLocaleString()} (Advance: Rs. ${job.advancePaid.toLocaleString()})\n\n` +
    `We will notify you once ready!\n` +
    `📞 ${shopPhone} | ${shopName} - ${location}`
  );
}

