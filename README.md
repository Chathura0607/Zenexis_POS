# ⚡ Zenexis POS — Multi-Service Retail & Communication Desktop Application

[![Electron](https://img.shields.io/badge/Electron-34.5.8-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/Database-Dexie.js%20(IndexedDB)-0ea5e9?style=for-the-badge)](https://dexie.org/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

> **Zenexis POS** is a modern, ultra-responsive, offline-first Desktop Point of Sale & Business Management application specifically engineered for retail communication centers, printing hubs, repair shops, stationery stores, and gift sublimation centers in Sri Lanka.

---

## 🌟 Key Highlights & Capabilities

### 🛒 1. Rapid POS Billing Terminal
- **Multi-Category Product Grid**: Fast category filtering (Stationery, Mobile Accessories, PC Accessories, Photocopy, Prints, Mugs, Rubber Seals, Reloads, Gifts).
- **Instant Barcode Scanning**: Full USB/HID barcode reader support with auto-add and instant quantity aggregation.
- **Custom Service Calculator**: Dynamic pricing for custom print runs, photo studio prints (passport/stamp/4R/6R/A4), custom sublimation mugs, and flash rubber seals.
- **Flexible Discounts**: Fixed (Rs.) or percentage (%) bill and item-level discount controls with maximum 100% validation boundaries.
- **Multi-Mode Payments**: Cash, Card, Bank Transfer, and Split Payment tender methods.

### 🖨️ 2. 80mm & 58mm Thermal Printer Engine
- Native ESC/POS thermal printing for **Xprinter XP-80T**, Epson, and compatible 80mm/58mm continuous roll receipt printers.
- Dual-copy **Repair & Service Job Tokens** with embedded **CODE128 barcodes** (Customer Claim Copy + Shop Device Tag with tear-off separation).
- Automatic receipt header, custom Sinhala/English footer notices, and cash drawer kick trigger.

### 🔧 3. Repair & Custom Job Hub
- Real-time ticket generation (`ZX-MOB-1001`, `ZX-PC-1002`, `ZX-SEAL-1003`, `ZX-MUG-1004`).
- Track repairs through 7 distinct lifecycle stages: `Received` $\to$ `Diagnosing` $\to$ `Waiting Parts` $\to$ `In Progress` $\to$ `Ready` $\to$ `Delivered`.
- **One-Click WhatsApp Notification Generator**: Auto-generates polite bilingual (Sinhala & English) customer ready-for-pickup notices with bill balance.

### 📱 4. Telco Reloads & Utility Bill Center
- Instant reload logging for **Dialog, Mobitel, Hutch, Airtel, SLT, CEB Electricity, and Water Board**.
- Quick preset buttons (Rs. 50, 100, 200, 500, 1000, 2000).
- Automatic commission computation and daily telco revenue breakdown.

### 📦 5. Inventory & Supplier Procurement
- Low stock threshold tracking with real-time visual warning badges.
- Stock inward purchase orders (`PO`) tracking supplier invoices, cost prices, retail prices, and balance payable.
- In-place barcode and SKU generator.

### 💰 6. Financial Analytics, Expenses & Payroll
- **Real-Time P&L**: Gross Revenue, Cost of Goods Sold (COGS), Gross Profit Margin, Operating Expenses, and Net Profit.
- Interactive **Recharts** visualizations: Daily sales trends, category revenue breakdown, and top 5 bestsellers.
- **Shift Cash Drawer Management**: Track opening cash float, expected drawer cash, cash in/out drops, and over/short variances.
- **Staff Payroll & Commission Tracking**: Employee basic salary, automated service commission calculation, salary advance deduction, and payslip generation.

### 🤖 7. Built-in AI Retail Assistant
- Inventory restock velocity predictions based on historical sales run rate.
- Dead-stock / slow-moving items alert.
- Peak transaction hours heatmap and revenue forecast models.

### 🛡️ 8. Enterprise-Grade Security
- **Zod Schema Validation**: Complete runtime input validation across all data models.
- **SHA-256 Cryptographic PIN Hashing**: Staff & Admin PINs are securely hashed using the Web Crypto API; zero plaintext credentials in database or seed exports.
- **XSS & Injection Sanitization**: Input sanitization strips dangerous HTML/script tags before IndexedDB transactions.
- **Atomic Dexie Transactions**: Multi-table operations (sales, refunds, drawer updates) run inside atomic `db.transaction('rw', ...)` to guarantee ACID consistency.
- **Security Audit Trail**: Every sensitive action (logins, refunds, settings updates, stock inward, price changes) is permanently recorded in the `AuditLog`.
- **Role-Based Access Control**: Strict separation between `Owner`, `Cashier`, and `Technician`.

---

## ⌨️ Global Cashier Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| `F1` | Open POS Billing Terminal | Global |
| `F2` | Open Repair & Service Hub | Global |
| `F3` | Open Reloads & Utility Bills | Global |
| `F4` | Open Inventory & Stock Manager | Global |
| `F5` | Open Supplier Management | Owner Only |
| `F6` | Open Financial Analytics & Reports | Owner Only |
| `F7` | Open Expense Tracker | Global |
| `F8` | Open Staff & Payroll Manager | Owner Only |
| `F9` | Open AI Insights Center | Global |
| `F10` | Instant Checkout / Print Thermal Receipt | POS Terminal / Payment |
| `F11` | Open Order History & Duplicate Receipts | Global |
| `F12` | Quick PIN Lock Screen | Global |
| `/` | Focus Barcode Search Field | POS Terminal |
| `Esc` | Clear Cart / Close Active Modal | Global |

---

## 🛠️ Technology Stack

- **Runtime & Desktop Framework**: [Electron 34](https://www.electronjs.org/) with Node.js 22
- **UI Framework**: [React 19](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/)
- **Bundler & Build Tool**: [Vite 6](https://vitejs.dev/) + [ESBuild](https://esbuild.github.io/)
- **Styling & Design System**: [Tailwind CSS 3.4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Client-Side Database**: [Dexie.js 4](https://dexie.org/) (Reactive IndexedDB wrapper)
- **Data Validation & Security**: [Zod 3.24](https://zod.dev/) + Web Crypto SHA-256
- **Barcode & Charts**: [JsBarcode](https://lindell.me/JsBarcode/) + [Recharts](https://recharts.org/)
- **PDF & Export Tools**: [jspdf](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) + [xlsx](https://sheetjs.com/)
- **Packaging**: [electron-builder 25](https://www.electron.build/) (NSIS Windows Installer & Portable EXE)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Chathura0607/Zenexis_POS.git
   cd Zenexis_POS
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start in Development Mode**:
   ```bash
   npm run electron:dev
   ```

---

## 📦 Building Production Desktop Executables

To package the standalone Windows application:

```bash
# Compile and build both NSIS Installer and Portable .exe
npm run electron:build
```

The output executables will be generated in the `release/` directory:
- **`Zenexis POS Setup 1.0.0.exe`**: Full Windows installer with desktop & start menu shortcuts.
- **`Zenexis POS-Portable-1.0.0.exe`**: Standalone single executable (runs instantly from USB drives without installation).

---

## 🔒 Default Credentials & Initial Setup

When the application is first launched, default administrative and staff accounts are seeded:

| User | Role | Default PIN | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin Owner** | `owner` | `1234` | Full access (Financials, Settings, Payroll, Security) |
| **Cashier Staff** | `cashier` | `5678` | POS Billing, Repairs, Reloads, Expenses |

> ⚠️ *Note: You can change all PINs anytime under **Settings (F10) $\to$ Security & PINs**.*

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  Crafted by <strong>Chathura Lakmina</strong>
</p>
