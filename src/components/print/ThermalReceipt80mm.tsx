import React, { useEffect, useRef } from 'react';
import { Sale, AppSettings } from '../../types';
import { formatCurrency, formatDateTime } from '../../services/printService';
import JsBarcode from 'jsbarcode';

interface ThermalReceipt80mmProps {
  sale: Sale;
  settings?: AppSettings;
}

export const ThermalReceipt80mm: React.FC<ThermalReceipt80mmProps> = ({ sale, settings }) => {
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (barcodeRef.current && sale.invoiceNumber) {
      try {
        JsBarcode(barcodeRef.current, sale.invoiceNumber, {
          format: 'CODE128',
          width: 1.5,
          height: 32,
          displayValue: true,
          fontSize: 9,
          margin: 0,
        });
      } catch (err) {
        console.error('Barcode generation error:', err);
      }
    }
  }, [sale.invoiceNumber]);

  return (
    <div id="thermal-receipt-content" className="bg-white text-black p-2 font-mono text-[11px] leading-tight w-[76mm] mx-auto select-none">
      {/* Shop Header */}
      <div className="text-center pb-2 border-b border-black border-dashed">
        <h1 className="text-lg font-bold tracking-wider">{settings?.shopName || 'ZENEXIS'}</h1>
        <p className="text-[10px] font-medium uppercase tracking-wide">
          {settings?.receiptHeaderNotice || 'COMMUNICATION & DIGITAL PRINT LAB'}
        </p>
        <p className="text-[10px]">{settings?.shopLocation || 'Polhena, Ambalangoda'}</p>
        <p className="text-[10px] font-bold">Tel: {settings?.shopPhone || '0707120945'}</p>
        <p className="text-[9px]">{settings?.shopEmail || 'zenexis@gmail.com'}</p>
      </div>

      {/* Invoice Meta */}
      <div className="py-1.5 border-b border-black border-dashed text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">INVOICE: {sale.invoiceNumber}</span>
          <span>{new Date(sale.timestamp).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Date/Time: {formatDateTime(sale.timestamp)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier: {sale.cashierName}</span>
          <span>Shift: {sale.shiftId ? 'Active' : 'Regular'}</span>
        </div>
        {sale.customerPhone && (
          <div className="flex justify-between font-bold pt-0.5">
            <span>Customer: {sale.customerName}</span>
            <span>{sale.customerPhone}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="py-1.5 border-b border-black border-dashed">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-0.5">ITEM</th>
              <th className="text-center py-0.5">QTY</th>
              <th className="text-right py-0.5">PRICE</th>
              <th className="text-right py-0.5">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="py-1 pr-1 font-medium leading-none">
                  {item.name}
                  {item.discountAmount > 0 && (
                    <div className="text-[8px] text-gray-600">Disc: -Rs.{item.discountAmount}</div>
                  )}
                </td>
                <td className="text-center py-1">{item.qty}</td>
                <td className="text-right py-1">{item.unitPrice.toFixed(2)}</td>
                <td className="text-right py-1 font-bold">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Totals */}
      <div className="py-1.5 space-y-1 text-[11px] border-b border-black border-dashed">
        <div className="flex justify-between">
          <span>Total Items ({sale.itemCount}):</span>
          <span>Rs. {sale.subtotal.toFixed(2)}</span>
        </div>
        {sale.discountAmount > 0 && (
          <div className="flex justify-between text-[10px] font-bold">
            <span>Discount ({sale.discountType === 'percentage' ? `${sale.discountValue}%` : 'Fixed'}):</span>
            <span>-Rs. {sale.discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-extrabold border-t border-black pt-1">
          <span>NET TOTAL:</span>
          <span>Rs. {sale.netTotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="py-1.5 text-[10px] space-y-0.5 border-b border-black border-dashed">
        <div className="flex justify-between">
          <span>Payment Method:</span>
          <span className="font-bold">{sale.paymentMethod}</span>
        </div>
        {sale.paymentMethod === 'Cash' && sale.cashReceived && (
          <>
            <div className="flex justify-between">
              <span>Cash Tendered:</span>
              <span>Rs. {sale.cashReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-[11px]">
              <span>Change Returned:</span>
              <span>Rs. {(sale.balanceChange || 0).toFixed(2)}</span>
            </div>
          </>
        )}
      </div>

      {/* Barcode for Invoice */}
      <div className="pt-2 text-center flex flex-col items-center">
        <svg ref={barcodeRef} className="max-w-full h-8"></svg>
      </div>

      {/* Footer Greeting */}
      <div className="text-center pt-1.5 pb-2 text-[9px] space-y-0.5">
        <p className="font-bold">{settings?.receiptFooterMessage || 'Thank you for your business! Come again.'}</p>
        <p className="text-[8px] text-gray-700">Returns/Exchanges accepted within 7 days with bill.</p>
        <p className="text-[8px] text-gray-500 font-mono">System by Zenexis Technologies</p>
      </div>
    </div>
  );
};
