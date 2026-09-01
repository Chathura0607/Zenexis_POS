import Dexie, { Table } from 'dexie';
import {
  Product,
  Category,
  Sale,
  Customer,
  Supplier,
  PurchaseOrder,
  RepairJob,
  ReloadTransaction,
  Employee,
  Shift,
  Expense,
  SalaryPayment,
  AuditLog,
  AppSettings,
} from '../types';

export class ZenexisDB extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  sales!: Table<Sale, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  purchases!: Table<PurchaseOrder, string>;
  repairJobs!: Table<RepairJob, string>;
  reloadTransactions!: Table<ReloadTransaction, string>;
  employees!: Table<Employee, string>;
  shifts!: Table<Shift, string>;
  expenses!: Table<Expense, string>;
  salaries!: Table<SalaryPayment, string>;
  auditLogs!: Table<AuditLog, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('ZenexisPOS_DB');

    this.version(1).stores({
      products: 'id, barcode, sku, name, category, stockQty, supplierId, isService, createdAt',
      categories: 'id, name, slug',
      sales: 'id, invoiceNumber, customerId, customerPhone, cashierId, shiftId, paymentMethod, status, timestamp',
      customers: 'id, name, phone, createdAt',
      suppliers: 'id, name, company, phone, createdAt',
      purchases: 'id, invoiceNo, supplierId, timestamp',
      repairJobs: 'id, ticketNumber, jobType, customerPhone, status, receivedDate',
      reloadTransactions: 'id, provider, customerPhone, cashierId, shiftId, timestamp',
      employees: 'id, name, phone, role, pin, active',
      shifts: 'id, shiftNumber, cashierId, startTime, status',
      expenses: 'id, category, amount, shiftId, timestamp',
      salaries: 'id, employeeId, month, status',
      auditLogs: 'id, userId, action, timestamp',
      settings: 'id',
    });
  }
}

export const db = new ZenexisDB();

// Seed initial database state if empty
export async function initializeDatabaseSeed() {
  try {
    const settingsCount = await db.settings.count();
    if (settingsCount === 0) {
      // 1. Initial Settings
      await db.settings.add({
        id: 'default_settings',
        shopName: 'Zenexis',
        shopLocation: 'Polhena, Ambalangoda',
        shopPhone: '0707120945',
        shopEmail: 'zenexis@gmail.com',
        currency: 'Rs.',
        receiptHeaderNotice: 'COMMUNICATION, PRINTING & REPAIRS',
        receiptFooterMessage: 'Thank you for choosing Zenexis! Please visit again.',
        printerType: '80mm',
        autoPrintReceipt: true,
        lowStockThresholdDefault: 5,
        enableSoundEffects: true,
        enableAIInsights: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const employeeCount = await db.employees.count();
    if (employeeCount === 0) {
      // 2. Default Users (Owner: 1234, Cashier: 5678) stored as SHA-256 hashes
      await db.employees.bulkAdd([
        {
          id: 'emp_owner_1',
          name: 'Owner (Admin)',
          phone: '0707120945',
          role: 'owner',
          pin: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', // SHA-256 hash of '1234'
          basicSalary: 85000,
          commissionRate: 10,
          active: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'emp_cashier_1',
          name: 'Kasun (Cashier)',
          phone: '0771234567',
          role: 'cashier',
          pin: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f', // SHA-256 hash of '5678'
          basicSalary: 38000,
          commissionRate: 5,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } else {
      // Auto-migrate any unhashed legacy PINs in existing database
      const existingEmployees = await db.employees.toArray();
      for (const emp of existingEmployees) {
        if (emp.pin && emp.pin.length !== 64) {
          const encoder = new TextEncoder();
          const data = encoder.encode(emp.pin.trim());
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashedPin = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          await db.employees.update(emp.id, { pin: hashedPin });
        }
      }
    }

    const categoryCount = await db.categories.count();
    if (categoryCount === 0) {
      // 3. Service & Product Categories
      await db.categories.bulkAdd([
        { id: 'cat_stationery', name: 'Stationery', slug: 'stationery', iconName: 'BookOpen', color: 'from-amber-500 to-orange-600' },
        { id: 'cat_print_copy', name: 'Color Print & Photocopy', slug: 'color_print_photocopy', iconName: 'Printer', color: 'from-blue-500 to-cyan-600' },
        { id: 'cat_photo_print', name: 'Photo Printing', slug: 'photo_print', iconName: 'Camera', color: 'from-pink-500 to-rose-600' },
        { id: 'cat_mug_print', name: 'Mug & Sublimation', slug: 'mug_print', iconName: 'Coffee', color: 'from-purple-500 to-indigo-600' },
        { id: 'cat_rubber_seal', name: 'Rubber Seals', slug: 'rubber_seal', iconName: 'Stamp', color: 'from-emerald-500 to-teal-600' },
        { id: 'cat_mobile_acc', name: 'Mobile & Accessories', slug: 'mobile_accessories', iconName: 'Smartphone', color: 'from-sky-500 to-blue-600' },
        { id: 'cat_pc_acc', name: 'Computer & Accessories', slug: 'pc_accessories', iconName: 'Laptop', color: 'from-violet-500 to-purple-600' },
        { id: 'cat_reloads', name: 'Reloads & Bill Pay', slug: 'reloads', iconName: 'Zap', color: 'from-yellow-500 to-amber-600' },
        { id: 'cat_gifts', name: 'Gifts & Toys', slug: 'gifts', iconName: 'Gift', color: 'from-red-500 to-pink-600' },
        { id: 'cat_services', name: 'Repairs & Technical Services', slug: 'services', iconName: 'Wrench', color: 'from-cyan-500 to-teal-600' },
      ]);
    }

    const supplierCount = await db.suppliers.count();
    if (supplierCount === 0) {
      // 4. Sample Suppliers
      await db.suppliers.bulkAdd([
        {
          id: 'sup_atlas',
          name: 'Nimal Perera',
          company: 'Atlas Stationery Distributors',
          phone: '0714567890',
          email: 'atlas.distributors@gmail.com',
          address: 'Galle Road, Colombo 03',
          totalPurchased: 45000,
          balancePayable: 0,
          notes: 'Standard 30 days credit terms for books and pens',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sup_techlk',
          name: 'Dinesh Fernando',
          company: 'TechZone Mobile & PC Spares',
          phone: '0778899001',
          email: 'orders@techzonelk.com',
          address: 'Liberty Plaza, Colombo 03',
          totalPurchased: 98000,
          balancePayable: 15000,
          notes: 'Displays, chargers, tempered glasses and laptop spares',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'sup_printsub',
          name: 'Chaminda Silva',
          company: 'Photo & Sublimation Direct',
          phone: '0751122334',
          email: 'sublimationlk@gmail.com',
          address: 'Maharagama, Colombo',
          totalPurchased: 32000,
          balancePayable: 0,
          notes: 'Blank mugs, sublimation paper, inks, flash stamps',
          createdAt: new Date().toISOString(),
        }
      ]);
    }

    const productCount = await db.products.count();
    if (productCount === 0) {
      // 5. Initial Seed Products for Zenexis
      await db.products.bulkAdd([
        // Photocopy & Printout Services (On-demand services)
        {
          id: 'prd_pc_a4_bw_s',
          barcode: 'SRV-001',
          sku: 'COPY-A4-BW',
          name: 'A4 Photocopy B/W (Single Side)',
          category: 'color_print_photocopy',
          buyPrice: 3,
          sellPrice: 10,
          stockQty: 9999,
          minStockLevel: 100,
          unit: 'sheet',
          isService: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_pc_a4_bw_d',
          barcode: 'SRV-002',
          sku: 'COPY-A4-BWD',
          name: 'A4 Photocopy B/W (Double Side)',
          category: 'color_print_photocopy',
          buyPrice: 5,
          sellPrice: 15,
          stockQty: 9999,
          minStockLevel: 100,
          unit: 'sheet',
          isService: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_pc_a4_col',
          barcode: 'SRV-003',
          sku: 'PRINT-A4-COL',
          name: 'A4 Color Printout (High Quality)',
          category: 'color_print_photocopy',
          buyPrice: 15,
          sellPrice: 50,
          stockQty: 9999,
          minStockLevel: 100,
          unit: 'sheet',
          isService: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Photo Printing
        {
          id: 'prd_photo_pass',
          barcode: 'SRV-004',
          sku: 'PHOTO-PASS-4',
          name: 'Passport Size Photo Set (4 Copies)',
          category: 'photo_print',
          buyPrice: 50,
          sellPrice: 350,
          stockQty: 9999,
          minStockLevel: 50,
          unit: 'set',
          isService: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_photo_4r',
          barcode: 'SRV-005',
          sku: 'PHOTO-4R-GLOSS',
          name: '4R Glossy Photo Print (4x6)',
          category: 'photo_print',
          buyPrice: 35,
          sellPrice: 120,
          stockQty: 9999,
          minStockLevel: 50,
          unit: 'pcs',
          isService: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Custom Mug & Rubber Seal
        {
          id: 'prd_mug_sub',
          barcode: 'SRV-006',
          sku: 'MUG-PRINT-11OZ',
          name: 'Custom Photo Mug Printing (White 11oz)',
          category: 'mug_print',
          buyPrice: 380,
          sellPrice: 950,
          stockQty: 24,
          minStockLevel: 5,
          unit: 'pcs',
          supplierId: 'sup_printsub',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_seal_flash_round',
          barcode: 'SRV-007',
          sku: 'SEAL-FLASH-R38',
          name: 'Round Rubber Flash Seal (Pre-Inked 38mm)',
          category: 'rubber_seal',
          buyPrice: 650,
          sellPrice: 1850,
          stockQty: 18,
          minStockLevel: 4,
          unit: 'pcs',
          supplierId: 'sup_printsub',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Stationery Items
        {
          id: 'prd_cr_book_120',
          barcode: '893500123001',
          sku: 'ATLAS-CR-120',
          name: 'Atlas CR Book 120 Pages (Square/Single)',
          category: 'stationery',
          buyPrice: 210,
          sellPrice: 280,
          stockQty: 45,
          minStockLevel: 10,
          unit: 'pcs',
          supplierId: 'sup_atlas',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_pen_blue_05',
          barcode: '893500123002',
          sku: 'PEN-ATLAS-BL',
          name: 'Atlas Chooty Blue Ballpoint Pen 0.5mm',
          category: 'stationery',
          buyPrice: 22,
          sellPrice: 35,
          stockQty: 150,
          minStockLevel: 25,
          unit: 'pcs',
          supplierId: 'sup_atlas',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_a4_paper_pack',
          barcode: '893500123003',
          sku: 'PAPER-A4-70G',
          name: 'Double A / JK A4 70GSM Paper Ream (500 Sheets)',
          category: 'stationery',
          buyPrice: 1450,
          sellPrice: 1850,
          stockQty: 3, // Low stock on purpose for testing alert!
          minStockLevel: 5,
          unit: 'pack',
          supplierId: 'sup_atlas',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Mobile Accessories
        {
          id: 'prd_typec_cable',
          barcode: '6971234567890',
          sku: 'CABLE-TYPEC-6A',
          name: 'Fast Charging Type-C Braided Cable 6A (1m)',
          category: 'mobile_accessories',
          buyPrice: 220,
          sellPrice: 650,
          stockQty: 32,
          minStockLevel: 6,
          unit: 'pcs',
          supplierId: 'sup_techlk',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_fast_charger_20w',
          barcode: '6971234567891',
          sku: 'CHARGER-20W-PD',
          name: '20W PD Fast Charger Adapter (Type-C + USB)',
          category: 'mobile_accessories',
          buyPrice: 680,
          sellPrice: 1450,
          stockQty: 14,
          minStockLevel: 5,
          unit: 'pcs',
          supplierId: 'sup_techlk',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_tempered_glass',
          barcode: '6971234567892',
          sku: 'TEMP-9D-UNIV',
          name: '9D Edge-to-Edge Tempered Glass (Fitting Included)',
          category: 'mobile_accessories',
          buyPrice: 85,
          sellPrice: 450,
          stockQty: 60,
          minStockLevel: 15,
          unit: 'pcs',
          supplierId: 'sup_techlk',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Computer Accessories
        {
          id: 'prd_wireless_mouse',
          barcode: '6971234567893',
          sku: 'MOUSE-WL-24G',
          name: 'Logitech / Jedel 2.4G Optical Wireless Mouse',
          category: 'pc_accessories',
          buyPrice: 750,
          sellPrice: 1650,
          stockQty: 8,
          minStockLevel: 3,
          unit: 'pcs',
          supplierId: 'sup_techlk',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'prd_flash_drive_32gb',
          barcode: '6971234567894',
          sku: 'USB-SANDISK-32',
          name: 'SanDisk Cruzer Blade 32GB USB 2.0 Pen Drive',
          category: 'pc_accessories',
          buyPrice: 1100,
          sellPrice: 1850,
          stockQty: 12,
          minStockLevel: 4,
          unit: 'pcs',
          supplierId: 'sup_techlk',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    const customerCount = await db.customers.count();
    if (customerCount === 0) {
      // 6. Sample Customers
      await db.customers.bulkAdd([
        {
          id: 'cust_sample_1',
          name: 'Kamal Bandara',
          phone: '0772345678',
          email: 'kamal@gmail.com',
          address: 'Polhena, Ambalangoda',
          totalSpent: 4200,
          totalVisits: 3,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'cust_sample_2',
          name: 'Nadeeka Senanayake',
          phone: '0719876543',
          address: 'Maha Ambalangoda',
          totalSpent: 8500,
          totalVisits: 5,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    const salesCount = await db.sales.count();
    if (salesCount === 0) {
      // 7. Sample Initial Sales for Demonstration
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 1000 * 60 * 65).toISOString();
      const threeHoursAgo = new Date(now.getTime() - 1000 * 60 * 180).toISOString();
      const yesterday = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString();
      const twoDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString();

      await db.sales.bulkAdd([
        {
          id: 'sale_demo_1',
          invoiceNumber: 'INV-849201',
          customerId: 'cust_sample_1',
          customerName: 'Kamal Bandara',
          customerPhone: '0772345678',
          items: [
            {
              id: 'cart_item_1',
              productId: 'prd_pc_a4_col',
              name: 'A4 Color Printout (High Quality)',
              category: 'color_print_photocopy',
              unitPrice: 50,
              costPrice: 15,
              qty: 12,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 600,
            },
            {
              id: 'cart_item_2',
              productId: 'prd_photo_pass',
              name: 'Passport Size Photo Set (4 Copies)',
              category: 'photo_print',
              unitPrice: 350,
              costPrice: 50,
              qty: 2,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 700,
            },
          ],
          itemCount: 14,
          subtotal: 1300,
          discountType: 'fixed',
          discountValue: 100,
          discountAmount: 100,
          netTotal: 1200,
          costTotal: 280,
          grossProfit: 920,
          paymentMethod: 'Cash',
          cashReceived: 1500,
          balanceChange: 300,
          cashierId: 'emp_cashier_1',
          cashierName: 'Kasun (Cashier)',
          shiftId: '',
          status: 'Completed',
          notes: 'Color printing for project report',
          timestamp: oneHourAgo,
        },
        {
          id: 'sale_demo_2',
          invoiceNumber: 'INV-849202',
          customerId: 'cust_sample_2',
          customerName: 'Nadeeka Senanayake',
          customerPhone: '0719876543',
          items: [
            {
              id: 'cart_item_3',
              productId: 'prd_mug_sub',
              name: 'Custom Photo Mug Printing (White 11oz)',
              category: 'mug_print',
              unitPrice: 950,
              costPrice: 380,
              qty: 2,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 1900,
            },
            {
              id: 'cart_item_4',
              productId: 'prd_typec_cable',
              name: 'Fast Charging Type-C Braided Cable 6A (1m)',
              category: 'mobile_accessories',
              unitPrice: 650,
              costPrice: 220,
              qty: 1,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 650,
            },
          ],
          itemCount: 3,
          subtotal: 2550,
          discountType: 'percentage',
          discountValue: 5,
          discountAmount: 127.5,
          netTotal: 2422.5,
          costTotal: 980,
          grossProfit: 1442.5,
          paymentMethod: 'Card',
          cardAmount: 2422.5,
          cashierId: 'emp_owner_1',
          cashierName: 'Owner (Admin)',
          shiftId: '',
          status: 'Completed',
          notes: 'Gift order with customized photo',
          timestamp: threeHoursAgo,
        },
        {
          id: 'sale_demo_3',
          invoiceNumber: 'INV-849203',
          customerName: 'Walk-in Customer',
          items: [
            {
              id: 'cart_item_5',
              productId: 'prd_flash_drive_32gb',
              name: 'SanDisk Cruzer Blade 32GB USB 2.0 Pen Drive',
              category: 'pc_accessories',
              unitPrice: 1850,
              costPrice: 1100,
              qty: 1,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 1850,
            },
            {
              id: 'cart_item_6',
              productId: 'prd_cr_book_120',
              name: 'Atlas CR Book 120 Pages (Square/Single)',
              category: 'stationery',
              unitPrice: 280,
              costPrice: 210,
              qty: 3,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 840,
            },
          ],
          itemCount: 4,
          subtotal: 2690,
          discountType: 'percentage',
          discountValue: 0,
          discountAmount: 0,
          netTotal: 2690,
          costTotal: 1730,
          grossProfit: 960,
          paymentMethod: 'Bank_Transfer',
          transferAmount: 2690,
          cashierId: 'emp_cashier_1',
          cashierName: 'Kasun (Cashier)',
          shiftId: '',
          status: 'Completed',
          notes: 'Online bank transfer via QR',
          timestamp: yesterday,
        },
        {
          id: 'sale_demo_4',
          invoiceNumber: 'INV-849204',
          customerName: 'Sahan Wickrama',
          customerPhone: '0765544332',
          items: [
            {
              id: 'cart_item_7',
              productId: 'prd_seal_flash_round',
              name: 'Round Rubber Flash Seal (Pre-Inked 38mm)',
              category: 'rubber_seal',
              unitPrice: 1850,
              costPrice: 650,
              qty: 1,
              discountType: 'fixed',
              discountValue: 0,
              discountAmount: 0,
              total: 1850,
            },
          ],
          itemCount: 1,
          subtotal: 1850,
          discountType: 'fixed',
          discountValue: 0,
          discountAmount: 0,
          netTotal: 1850,
          costTotal: 650,
          grossProfit: 1200,
          paymentMethod: 'Cash',
          cashReceived: 2000,
          balanceChange: 150,
          cashierId: 'emp_owner_1',
          cashierName: 'Owner (Admin)',
          shiftId: '',
          status: 'Completed',
          notes: 'Company seal urgent order',
          timestamp: twoDaysAgo,
        },
      ]);
    }

    console.log('Zenexis DB initialized successfully with seed data.');
  } catch (error) {
    console.error('Error seeding Zenexis DB:', error);
  }
}
