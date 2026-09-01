import { db } from '../db/db';
import { Sale, Expense, Product } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface FinancialSummary {
  totalRevenue: number;
  totalCostOfGoods: number;
  grossProfit: number;
  grossMarginPct: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  totalInvoices: number;
  totalItemsSold: number;
  averageInvoiceValue: number;
}

export function computeFinancials(sales: Sale[], expenses: Expense[]): FinancialSummary {
  const completedSales = sales.filter(s => s.status === 'Completed');
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.netTotal, 0);
  const totalCostOfGoods = completedSales.reduce((sum, s) => sum + (s.costTotal || 0), 0);
  const grossProfit = Math.max(0, totalRevenue - totalCostOfGoods);
  const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const netMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const totalInvoices = completedSales.length;
  const totalItemsSold = completedSales.reduce((sum, s) => sum + s.itemCount, 0);
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  return {
    totalRevenue,
    totalCostOfGoods,
    grossProfit,
    grossMarginPct,
    totalExpenses,
    netProfit,
    netMarginPct,
    totalInvoices,
    totalItemsSold,
    averageInvoiceValue,
  };
}

export function exportSalesReportToExcel(sales: Sale[], expenses: Expense[], filename: string = 'Zenexis_Financial_Report.xlsx') {
  const summary = computeFinancials(sales, expenses);

  const summarySheetData = [
    ['ZENEXIS POS - FINANCIAL & SALES REPORT'],
    ['Generated At', new Date().toLocaleString()],
    [],
    ['Key Metric', 'Value (LKR)'],
    ['Total Revenue', summary.totalRevenue],
    ['Cost of Goods Sold (COGS)', summary.totalCostOfGoods],
    ['Gross Profit', summary.grossProfit],
    ['Gross Profit Margin', `${summary.grossMarginPct.toFixed(2)}%`],
    ['Total Operating Expenses', summary.totalExpenses],
    ['Net Profit', summary.netProfit],
    ['Net Profit Margin', `${summary.netMarginPct.toFixed(2)}%`],
    ['Total Invoices Completed', summary.totalInvoices],
    ['Total Units Sold', summary.totalItemsSold],
    ['Average Order Value', summary.averageInvoiceValue],
  ];

  const salesSheetData = [
    ['Invoice No', 'Date & Time', 'Customer', 'Phone', 'Items Count', 'Payment Method', 'Subtotal (Rs)', 'Discount (Rs)', 'Net Total (Rs)', 'Cost (Rs)', 'Profit (Rs)', 'Cashier'],
    ...sales.map(s => [
      s.invoiceNumber,
      new Date(s.timestamp).toLocaleString(),
      s.customerName,
      s.customerPhone || 'N/A',
      s.itemCount,
      s.paymentMethod,
      s.subtotal,
      s.discountAmount,
      s.netTotal,
      s.costTotal || 0,
      s.grossProfit || (s.netTotal - (s.costTotal || 0)),
      s.cashierName,
    ])
  ];

  const expenseSheetData = [
    ['Title', 'Category', 'Amount (Rs)', 'Payment Method', 'Paid To', 'Recorded By', 'Date'],
    ...expenses.map(e => [
      e.title,
      e.category,
      e.amount,
      e.paymentMethod,
      e.paidTo || 'N/A',
      e.recordedBy,
      new Date(e.timestamp).toLocaleString(),
    ])
  ];

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  const wsSales = XLSX.utils.aoa_to_sheet(salesSheetData);
  const wsExpenses = XLSX.utils.aoa_to_sheet(expenseSheetData);

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales Invoices');
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

  XLSX.writeFile(wb, filename);
}

export function exportSalesReportToPDF(sales: Sale[], expenses: Expense[]) {
  const summary = computeFinancials(sales, expenses);
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(14, 165, 233); // Brand color
  doc.text('ZENEXIS - Financial & Sales Report', 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Polhena, Ambalangoda | Tel: 0707120945 | Email: zenexis@gmail.com', 14, 26);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 14, 32);

  // Financial Cards in PDF
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 38, 182, 34, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Revenue: Rs. ${summary.totalRevenue.toLocaleString()}`, 20, 48);
  doc.text(`Gross Profit: Rs. ${summary.grossProfit.toLocaleString()} (${summary.grossMarginPct.toFixed(1)}%)`, 20, 56);
  doc.text(`Total Expenses: Rs. ${summary.totalExpenses.toLocaleString()}`, 20, 64);

  doc.text(`Net Profit: Rs. ${summary.netProfit.toLocaleString()} (${summary.netMarginPct.toFixed(1)}%)`, 110, 48);
  doc.text(`Total Invoices: ${summary.totalInvoices}`, 110, 56);
  doc.text(`Items Sold: ${summary.totalItemsSold}`, 110, 64);

  // Recent Sales Table
  const tableData: string[][] = sales.slice(0, 25).map(s => [
    s.invoiceNumber || 'INV',
    new Date(s.timestamp).toLocaleDateString(),
    s.customerName || 'Walk-in Customer',
    s.paymentMethod || 'Cash',
    `Rs. ${s.netTotal.toLocaleString()}`,
    `Rs. ${(s.grossProfit || 0).toLocaleString()}`,
    s.cashierName || 'Staff'
  ]);

  autoTable(doc, {
    startY: 78,
    head: [['Invoice', 'Date', 'Customer', 'Payment', 'Net Total', 'Profit', 'Cashier']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    styles: { fontSize: 8 },
  });

  doc.save(`Zenexis_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
