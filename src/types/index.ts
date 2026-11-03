export type UserRole = 'owner' | 'cashier' | 'technician';

export interface Employee {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  pin: string; // SHA-256 Hashed PIN or legacy
  basicSalary: number;
  commissionRate: number; // Percentage e.g. 5% on repairs/services
  active: boolean;
  createdAt: string;
}

export type ProductCategory = 
  | 'stationery' 
  | 'photo_print' 
  | 'mug_print' 
  | 'rubber_seal' 
  | 'mobile_accessories' 
  | 'pc_accessories' 
  | 'color_print_photocopy' 
  | 'reloads' 
  | 'gifts' 
  | 'services' 
  | 'other';

export interface Category {
  id: string;
  name: string;
  slug: ProductCategory;
  iconName: string;
  color: string;
}

export interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  category: ProductCategory;
  buyPrice: number; // Cost Price
  sellPrice: number; // Retail Price
  stockQty: number;
  minStockLevel: number;
  unit: string; // 'pcs', 'pack', 'sheet', 'box', 'item'
  supplierId?: string;
  supplierName?: string;
  isService?: boolean; // If true, not tracked by physical stock (e.g. photocopy page)
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints?: number;
  totalSpent?: number;
  totalVisits?: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchased: number;
  balancePayable: number;
  notes?: string;
  createdAt: string;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  qty: number;
  unitBuyPrice: number;
  unitSellPrice?: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  paidAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending';
  notes?: string;
  timestamp: string;
}

export interface CartItem {
  id: string; // unique item instance id
  productId: string;
  name: string;
  category: ProductCategory;
  unitPrice: number;
  costPrice: number;
  qty: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  total: number;
  notes?: string;
  isCustomPrice?: boolean;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank_Transfer' | 'Split';

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  netTotal: number;
  costTotal: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  balanceChange?: number;
  cardAmount?: number;
  transferAmount?: number;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  status: 'Completed' | 'Refunded' | 'Cancelled';
  notes?: string;
  timestamp: string;
}

export type RepairJobType = 
  | 'mobile_repair' 
  | 'pc_repair' 
  | 'photo_print' 
  | 'mug_print' 
  | 'rubber_seal' 
  | 'custom_gift'
  | 'general_service';

export type RepairStatus = 
  | 'Received' 
  | 'Diagnosing' 
  | 'Waiting_Parts' 
  | 'In_Progress' 
  | 'Ready' 
  | 'Delivered' 
  | 'Cancelled';

export interface RepairJob {
  id: string;
  ticketNumber: string;
  jobType: RepairJobType;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  deviceOrItemName: string; // e.g. "Samsung Galaxy A14" / "Custom 11oz Ceramic Mug" / "Office Stamp Flash Seal"
  brandModel?: string;
  serialOrImei?: string;
  problemDescription: string;
  accessoriesReceived?: string; // e.g. "With SIM tray, without charger"
  estimatedCost: number;
  actualCost?: number;
  advancePaid: number;
  balanceDue: number;
  partsCost?: number; // Cost of spare parts
  technicianName?: string;
  status: RepairStatus;
  receivedDate: string;
  estimatedDeliveryDate?: string;
  completedDate?: string;
  deliveredDate?: string;
  notes?: string;
}

export type TelcoProvider = 'Dialog' | 'Mobitel' | 'Hutch' | 'Airtel' | 'SLT' | 'CEB_Electricity' | 'Water_Board' | 'Other';

export interface ReloadTransaction {
  id: string;
  provider: TelcoProvider;
  customerPhone: string;
  amount: number;
  commissionRate: number; // e.g., 3.5%
  commissionAmount: number;
  cashierId: string;
  cashierName: string;
  shiftId: string;
  timestamp: string;
  status: 'Success' | 'Pending' | 'Failed';
}

export interface Shift {
  id: string;
  shiftNumber: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  transferSales: number;
  cashIn: number; // Additional cash float added
  cashOut: number; // Cash drops/payouts
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  status: 'Open' | 'Closed';
  notes?: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'Rent' | 'Electricity' | 'Supplies' | 'Tea_Snacks' | 'Salary_Advance' | 'Repair_Parts' | 'Transport' | 'Stationery_Stock' | 'Maintenance' | 'Other';
  amount: number;
  paymentMethod: 'Cash' | 'Bank_Transfer' | 'Card';
  paidTo?: string;
  shiftId?: string;
  recordedBy: string;
  notes?: string;
  timestamp: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g., '2026-09'
  basicSalary: number;
  allowances: number;
  commissions: number;
  advancesDeducted: number;
  netPayable: number;
  paidAmount: number;
  paymentDate: string;
  status: 'Paid' | 'Partial' | 'Pending';
  notes?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'AUTH_FAILED'
    | 'PIN_UPDATE'
    | 'SALE_CREATE'
    | 'SALE_VOID'
    | 'REPAIR_CREATE'
    | 'REPAIR_UPDATE'
    | 'RELOAD_TRANSACTION'
    | 'PRICE_OVERRIDE'
    | 'DISCOUNT_APPLIED'
    | 'STOCK_ADJUST'
    | 'STOCK_INWARD'
    | 'PRODUCT_CREATE'
    | 'PRODUCT_UPDATE'
    | 'CUSTOMER_CREATE'
    | 'EXPENSE_CREATE'
    | 'EXPENSE_DELETE'
    | 'SUPPLIER_CREATE'
    | 'SUPPLIER_UPDATE'
    | 'EMPLOYEE_CREATE'
    | 'EMPLOYEE_UPDATE'
    | 'BACKUP_EXPORT'
    | 'BACKUP_RESTORE'
    | 'SETTINGS_UPDATE';
  details: string;
  timestamp: string;
}

export interface AppSettings {
  id: string;
  shopName: string;
  shopLocation: string;
  shopPhone: string;
  shopEmail: string;
  currency: string;
  receiptHeaderNotice: string;
  receiptFooterMessage: string;
  printerType: '80mm' | '58mm' | 'A4';
  autoPrintReceipt: boolean;
  selectedPrinter?: string;
  printMethod?: 'bridge' | 'electron' | 'browser';
  bridgePort?: number;
  autoCutPaper?: boolean;
  openCashDrawerOnSale?: boolean;
  lowStockThresholdDefault: number;
  enableSoundEffects: boolean;
  enableAIInsights: boolean;
  updatedAt: string;
  firebaseConfig?: FirebaseConfig;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  shopId: string; // Branch or shop identifier (e.g. 'zenexis-pos-main')
  enabled: boolean;
  autoSync: boolean;
  syncIntervalMinutes: number; // default 2 minutes
  lastSyncTime?: string;
}

export interface SyncQueueItem {
  id: string;
  tableName: string;
  docId: string;
  action: 'upsert' | 'delete';
  data?: any;
  status: 'pending' | 'syncing' | 'failed';
  retries: number;
  lastAttempt?: string;
  errorMessage?: string;
  createdAt: string;
}

export type CloudSyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'disabled';

export interface CloudSyncStatus {
  state: CloudSyncState;
  pendingCount: number;
  lastSyncTime?: string;
  errorMessage?: string;
  isOnline: boolean;
}


