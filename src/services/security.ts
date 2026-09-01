import { z } from 'zod';

/**
 * Hash a plaintext PIN using SHA-256 (Web Crypto API)
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a PIN against either a SHA-256 hash or legacy plaintext PIN
 */
export async function verifyPin(inputPin: string, storedPinOrHash: string): Promise<boolean> {
  const trimmedInput = inputPin.trim();
  const trimmedStored = storedPinOrHash.trim();

  // Legacy plaintext match
  if (trimmedInput === trimmedStored) {
    return true;
  }

  // SHA-256 Hash match
  const inputHash = await hashPin(trimmedInput);
  return inputHash === trimmedStored;
}

/**
 * Sanitize text input to avoid script injection or control character issues
 */
export function sanitizeString(val: string): string {
  if (!val) return '';
  return val
    .replace(/[<>]/g, '') // strip potential HTML tags
    .trim();
}

/**
 * Standard Sri Lankan phone number validation regex
 * Matches: 07XXXXXXXX, 011XXXXXXX, 034XXXXXXX, +947XXXXXXXX, 947XXXXXXXX, etc.
 */
export const PHONE_REGEX = /^(?:0|\+?94)?(?:7[01245678]|11|21|23|24|25|26|27|31|32|33|34|35|36|37|38|41|45|47|51|52|54|55|57|63|65|66|67|81|91)\d{7}$/;

// ----------------------------------------------------
// Zod Validation Schemas
// ----------------------------------------------------

export const phoneSchema = z
  .string()
  .min(9, 'Phone number must be at least 9 digits')
  .max(15, 'Phone number cannot exceed 15 characters')
  .regex(/^[0-9+ -]+$/, 'Invalid phone number format');

export const customerSchema = z.object({
  name: z.string().min(2, 'Customer name must be at least 2 characters').max(100, 'Customer name too long'),
  phone: phoneSchema,
  address: z.string().max(300, 'Address too long').optional().or(z.literal('')),
  notes: z.string().max(500, 'Notes too long').optional().or(z.literal('')),
});

export const cartItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  name: z.string().min(1).max(200),
  category: z.enum([
    'stationery',
    'photo_print',
    'mug_print',
    'rubber_seal',
    'mobile_accessories',
    'pc_accessories',
    'color_print_photocopy',
    'reloads',
    'gifts',
    'services',
    'other',
  ]),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  discountAmount: z.number().min(0),
  total: z.number().min(0),
  isCustomPrice: z.boolean().optional(),
});

export const checkoutPayloadSchema = z.object({
  items: z.array(cartItemSchema).min(1, 'Cart cannot be empty'),
  customerId: z.string().optional(),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(20).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0, 'Discount cannot be negative'),
  paymentMethod: z.enum(['Cash', 'Card', 'Bank_Transfer', 'Split']),
  cashReceived: z.number().min(0).optional(),
  cardAmount: z.number().min(0).optional(),
  transferAmount: z.number().min(0).optional(),
  cashierId: z.string().min(1, 'Cashier ID is required'),
  cashierName: z.string().min(1, 'Cashier Name is required'),
  shiftId: z.string().optional(),
  notes: z.string().max(500).optional(),
}).refine((data) => {
  if (data.discountType === 'percentage' && data.discountValue > 100) {
    return false;
  }
  return true;
}, {
  message: 'Percentage discount cannot exceed 100%',
  path: ['discountValue'],
});

export const reloadTransactionSchema = z.object({
  provider: z.enum(['Dialog', 'Mobitel', 'Hutch', 'Airtel', 'SLT', 'CEB_Electricity', 'Water_Board', 'Other']),
  customerPhone: phoneSchema,
  amount: z.number().min(10, 'Minimum reload amount is Rs. 10').max(100000, 'Maximum reload amount is Rs. 100,000'),
  cashierId: z.string().min(1, 'Cashier ID is required'),
  cashierName: z.string().min(1, 'Cashier Name is required'),
  shiftId: z.string().optional(),
});

export const repairJobSchema = z.object({
  jobType: z.enum(['mobile_repair', 'pc_repair', 'photo_print', 'mug_print', 'rubber_seal', 'custom_gift', 'general_service']),
  customerName: z.string().min(2, 'Customer name must be at least 2 characters').max(100),
  customerPhone: phoneSchema,
  deviceOrItemName: z.string().min(2, 'Device/Item description is required').max(150),
  brandModel: z.string().max(100).optional(),
  serialOrImei: z.string().max(100).optional(),
  problemDescription: z.string().min(2, 'Problem description is required').max(1000),
  accessoriesReceived: z.string().max(300).optional(),
  estimatedCost: z.number().min(0, 'Estimated cost cannot be negative'),
  advancePaid: z.number().min(0, 'Advance paid cannot be negative'),
  technicianName: z.string().max(100).optional(),
  status: z.enum(['Received', 'Diagnosing', 'Waiting_Parts', 'In_Progress', 'Ready', 'Delivered', 'Cancelled']),
  notes: z.string().max(1000).optional(),
}).refine((data) => data.advancePaid <= data.estimatedCost, {
  message: 'Advance paid cannot exceed the estimated cost',
  path: ['advancePaid'],
});

export const expenseSchema = z.object({
  title: z.string().min(2, 'Expense title is required').max(150),
  category: z.enum(['Tea_Snacks', 'Electricity', 'Rent', 'Stationery_Stock', 'Repair_Parts', 'Transport', 'Salary_Advance', 'Maintenance', 'Supplies', 'Other']),
  amount: z.number().min(1, 'Expense amount must be greater than 0').max(10000000, 'Expense amount exceeds limit'),
  paymentMethod: z.enum(['Cash', 'Bank_Transfer', 'Card']),
  paidTo: z.string().max(100).optional(),
  shiftId: z.string().optional(),
  recordedBy: z.string().min(1, 'Recorded by is required').max(100),
  notes: z.string().max(500).optional(),
});

export const supplierSchema = z.object({
  name: z.string().min(2, 'Contact person name is required').max(100),
  company: z.string().min(2, 'Company name is required').max(150),
  phone: phoneSchema,
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  qty: z.number().int().min(1, 'Quantity must be at least 1'),
  unitBuyPrice: z.number().min(0, 'Unit buy price cannot be negative'),
  unitSellPrice: z.number().min(0, 'Unit sell price cannot be negative').optional(),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
});

export const purchaseOrderSchema = z.object({
  invoiceNo: z.string().min(2, 'Invoice number is required').max(50),
  supplierId: z.string().min(1, 'Supplier ID is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  items: z.array(purchaseItemSchema).min(1, 'At least one purchase item is required'),
  totalCost: z.number().min(0, 'Total cost cannot be negative'),
  paidAmount: z.number().min(0, 'Paid amount cannot be negative'),
  paymentStatus: z.enum(['Paid', 'Partial', 'Pending']),
  notes: z.string().max(500).optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(2, 'Employee name is required').max(100),
  phone: phoneSchema,
  role: z.enum(['owner', 'cashier', 'technician']),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be a 4 to 6 digit numeric code'),
  basicSalary: z.number().min(0, 'Basic salary cannot be negative'),
  commissionRate: z.number().min(0, 'Commission rate cannot be negative').max(100, 'Commission rate cannot exceed 100%'),
  active: z.boolean().default(true),
});

export const settingsSchema = z.object({
  shopName: z.string().min(2, 'Shop name is required').max(100),
  shopLocation: z.string().min(2, 'Shop location is required').max(150),
  shopPhone: phoneSchema,
  shopEmail: z.string().email('Invalid email address').or(z.literal('')),
  currency: z.string().max(10).default('Rs.'),
  receiptHeaderNotice: z.string().max(200).default('COMMUNICATION, PRINTING & REPAIRS'),
  receiptFooterMessage: z.string().max(200).default('Thank you for choosing Zenexis! Please visit again.'),
  printerType: z.enum(['80mm', '58mm', 'A4']).default('80mm'),
  autoPrintReceipt: z.boolean().default(true),
  lowStockThresholdDefault: z.number().int().min(1).max(1000).default(5),
  enableSoundEffects: z.boolean().default(true),
  enableAIInsights: z.boolean().default(true),
});

export const databaseBackupSchema = z.object({
  version: z.number().int().min(1),
  exportedAt: z.string(),
  shopName: z.string(),
  data: z.object({
    products: z.array(z.any()),
    categories: z.array(z.any()),
    sales: z.array(z.any()),
    customers: z.array(z.any()),
    suppliers: z.array(z.any()),
    purchases: z.array(z.any()),
    repairJobs: z.array(z.any()),
    reloadTransactions: z.array(z.any()),
    employees: z.array(z.any()),
    shifts: z.array(z.any()),
    expenses: z.array(z.any()),
    salaries: z.array(z.any()),
    auditLogs: z.array(z.any()),
    settings: z.array(z.any()),
  }),
});


