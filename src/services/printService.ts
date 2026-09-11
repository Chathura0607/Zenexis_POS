import { Sale, RepairJob, Shift, SalaryPayment, AppSettings } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function formatCurrency(amount: number = 0): string {
  return `Rs. ${amount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-LK', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function exportSingleSaleToPDF(sale: Sale, settings?: AppSettings): void {
  const doc = new jsPDF();

  // Header - Shop Info
  doc.setFontSize(20);
  doc.setTextColor(14, 165, 233); // Sky-500
  doc.setFont('helvetica', 'bold');
  doc.text(settings?.shopName || 'ZENEXIS', 14, 20);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(settings?.receiptHeaderNotice || 'COMMUNICATION, DIGITAL PRINT LAB & REPAIRS', 14, 26);
  doc.text(`${settings?.shopLocation || 'Polhena, Ambalangoda'} | Tel: ${settings?.shopPhone || '0707120945'} | ${settings?.shopEmail || 'zenexis@gmail.com'}`, 14, 31);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 35, 196, 35);

  // Invoice Title & Meta Card
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE: ${sale.invoiceNumber}`, 14, 43);

  // Status Badge in PDF
  if (sale.status === 'Refunded') {
    doc.setFillColor(254, 226, 226);
    doc.setTextColor(225, 29, 72);
    doc.roundedRect(160, 37, 36, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REFUNDED', 167, 42.5);
  } else {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
    doc.roundedRect(160, 37, 36, 8, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID / COMPLETED', 162, 42.5);
  }

  // Meta details grid
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date & Time: ${formatDateTime(sale.timestamp)}`, 14, 50);
  doc.text(`Cashier: ${sale.cashierName}`, 14, 55);
  doc.text(`Payment: ${sale.paymentMethod}`, 14, 60);

  doc.text(`Customer: ${sale.customerName || 'Walk-in Customer'}`, 110, 50);
  doc.text(`Phone: ${sale.customerPhone || 'N/A'}`, 110, 55);
  if (sale.notes) {
    doc.text(`Notes: ${sale.notes}`, 110, 60);
  }

  // Items Table
  const tableRows = sale.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    (item.category || '').replace('_', ' ').toUpperCase(),
    `Rs. ${item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
    item.qty.toString(),
    item.discountAmount > 0 ? `-Rs. ${item.discountAmount.toFixed(2)}` : '-',
    `Rs. ${item.total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 66,
    head: [['#', 'Item Description', 'Category', 'Unit Price', 'Qty', 'Discount', 'Total']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      textColor: [51, 65, 85],
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 65 },
      2: { cellWidth: 35 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Summary Totals
  const rightX = 135;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text(`Subtotal (${sale.itemCount} items):`, rightX, finalY);
  doc.text(`Rs. ${sale.subtotal.toFixed(2)}`, 195, finalY, { align: 'right' });

  let offset = 6;
  if (sale.discountAmount > 0) {
    doc.text(`Discount (${sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Fixed'}):`, rightX, finalY + offset);
    doc.text(`-Rs. ${sale.discountAmount.toFixed(2)}`, 195, finalY + offset, { align: 'right' });
    offset += 6;
  }

  // Net Total Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(rightX - 4, finalY + offset - 4, 65, 10, 2, 2, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('NET TOTAL:', rightX, finalY + offset + 3);
  doc.text(`Rs. ${sale.netTotal.toFixed(2)}`, 195, finalY + offset + 3, { align: 'right' });

  // Payment Breakdown
  offset += 16;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  if (sale.paymentMethod === 'Cash' && sale.cashReceived) {
    doc.text(`Cash Tendered: Rs. ${sale.cashReceived.toFixed(2)} | Change: Rs. ${(sale.balanceChange || 0).toFixed(2)}`, rightX, finalY + offset);
  }

  // Footer Note
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(settings?.receiptFooterMessage || 'Thank you for your business! Please visit us again.', 105, pageHeight - 12, { align: 'center' });
  doc.text('Zenexis POS System • Software by Zenexis Technologies', 105, pageHeight - 8, { align: 'center' });

  doc.save(`${sale.invoiceNumber}_Receipt.pdf`);
}

import { PrintBridgeClient } from './printBridgeClient';
import { db } from '../db/db';

export async function triggerThermalPrint(
  elementId: string,
  overrideOptions?: {
    printerName?: string;
    width?: '80mm' | '58mm';
    cut?: boolean;
    openDrawer?: boolean;
    forceBrowserDialog?: boolean;
  }
): Promise<void> {
  const printContent = document.getElementById(elementId);
  if (!printContent) {
    console.error(`Print element #${elementId} not found`);
    return;
  }

  // Get current settings from DB
  let appSettings: AppSettings | undefined;
  try {
    appSettings = await db.settings.toCollection().first();
  } catch (e) {
    // DB query error fallback
  }

  const printerName = overrideOptions?.printerName || appSettings?.selectedPrinter || '';
  const paperWidth = overrideOptions?.width || (appSettings?.printerType === '58mm' ? '58mm' : '80mm');
  const shouldCut = overrideOptions?.cut ?? (appSettings?.autoCutPaper ?? true);
  const shouldOpenDrawer = overrideOptions?.openDrawer ?? (appSettings?.openCashDrawerOnSale ?? false);
  const forceDialog = overrideOptions?.forceBrowserDialog ?? false;

  // 1. Silent Direct Print via Zenexis Free Print Bridge (if not forced to dialog)
  if (!forceDialog) {
    // Check if Electron native print available
    if ((window as any).electronAPI?.printThermalReceipt) {
      try {
        const res = await (window as any).electronAPI.printThermalReceipt({
          silent: true,
          printerName: printerName || undefined,
          html: printContent.innerHTML,
          width: paperWidth,
        });
        if (res.success) {
          console.log('Printed silently via Electron Desktop Engine');
          return;
        }
      } catch (err) {
        console.warn('Electron silent print failed, trying local bridge:', err);
      }
    }

    // Check if Local Print Bridge is running
    const bridgeStatus = await PrintBridgeClient.checkStatus();
    if (bridgeStatus.online) {
      try {
        const bridgeRes = await PrintBridgeClient.print({
          printerName: printerName || undefined,
          html: printContent.innerHTML,
          width: paperWidth,
          cut: shouldCut,
          openDrawer: shouldOpenDrawer,
        });
        if (bridgeRes.success) {
          console.log('Printed silently via Zenexis Local Print Bridge');
          return;
        }
      } catch (bridgeErr) {
        console.warn('Local print bridge error:', bridgeErr);
      }
    }
  }

  // 2. Fallback: Standard browser iframe print dialog
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const bodyWidth = paperWidth === '58mm' ? '54mm' : '76mm';
  const pageSize = paperWidth === '58mm' ? '58mm auto' : '80mm auto';

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt Print</title>
        <style>
          @page {
            size: ${pageSize};
            margin: 0mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 2mm 1mm;
            font-family: 'JetBrains Mono', 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.25;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 16px; }
          .text-sm { font-size: 10px; }
          .text-xs { font-size: 9px; }
          .border-b { border-bottom: 1px dashed #000; }
          .border-t { border-top: 1px dashed #000; }
          .border-double-b { border-bottom: 2px solid #000; }
          .py-1 { padding-top: 2px; padding-bottom: 2px; }
          .my-1 { margin-top: 3px; margin-bottom: 3px; }
          .my-2 { margin-top: 6px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 2px 0; vertical-align: top; }
          .flex-between { display: flex; justify-content: space-between; }
          .barcode-container { text-align: center; margin: 4px 0; }
          .cut-line { margin-top: 8px; border-bottom: 1px dashed #444; text-align: center; font-size: 8px; padding-bottom: 2px; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);
}


