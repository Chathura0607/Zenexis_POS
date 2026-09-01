import React, { useEffect, useRef } from 'react';
import { RepairJob, AppSettings } from '../../types';
import { formatDateTime } from '../../services/printService';
import JsBarcode from 'jsbarcode';

interface RepairToken80mmProps {
  job: RepairJob;
  settings?: AppSettings;
}

export const RepairToken80mm: React.FC<RepairToken80mmProps> = ({ job, settings }) => {
  const barcodeRef1 = useRef<SVGSVGElement | null>(null);
  const barcodeRef2 = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (job.ticketNumber) {
      try {
        if (barcodeRef1.current) {
          JsBarcode(barcodeRef1.current, job.ticketNumber, {
            format: 'CODE128',
            width: 1.5,
            height: 28,
            displayValue: true,
            fontSize: 9,
            margin: 0,
          });
        }
        if (barcodeRef2.current) {
          JsBarcode(barcodeRef2.current, job.ticketNumber, {
            format: 'CODE128',
            width: 1.5,
            height: 24,
            displayValue: true,
            fontSize: 8,
            margin: 0,
          });
        }
      } catch (err) {
        console.error('Barcode error in token:', err);
      }
    }
  }, [job.ticketNumber]);

  return (
    <div id="repair-token-content" className="bg-white text-black p-2 font-mono text-[11px] leading-tight w-[76mm] mx-auto select-none">
      {/* ================= PART 1: CUSTOMER COPY ================= */}
      <div className="text-center pb-1 border-b border-black border-dashed">
        <h1 className="text-base font-bold">{settings?.shopName || 'ZENEXIS'}</h1>
        <p className="text-[10px] uppercase font-bold tracking-wider">SERVICE & REPAIR TOKEN (CUSTOMER COPY)</p>
        <p className="text-[9px]">{settings?.shopLocation || 'Polhena, Ambalangoda'} • Tel: {settings?.shopPhone || '0707120945'}</p>
      </div>

      <div className="py-1.5 border-b border-black border-dashed text-[10px] space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>TICKET: {job.ticketNumber}</span>
          <span>{new Date(job.receivedDate).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Customer: <strong>{job.customerName}</strong></span>
          <span>{job.customerPhone}</span>
        </div>
        <div className="pt-0.5">
          <span className="text-[9px] uppercase text-gray-700">Item / Device:</span>
          <p className="font-bold text-xs">{job.deviceOrItemName} {job.brandModel ? `(${job.brandModel})` : ''}</p>
        </div>
        <div>
          <span className="text-[9px] uppercase text-gray-700">Problem / Work:</span>
          <p className="font-medium">{job.problemDescription}</p>
        </div>
      </div>

      <div className="py-1.5 border-b border-black border-dashed text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span>Estimated Total:</span>
          <span className="font-bold">Rs. {job.estimatedCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>Advance Paid:</span>
          <span className="font-bold">Rs. {job.advancePaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-extrabold text-[11px] border-t border-black pt-1">
          <span>BALANCE PAYABLE:</span>
          <span>Rs. {job.balanceDue.toFixed(2)}</span>
        </div>
      </div>

      <div className="pt-2 text-center flex flex-col items-center">
        <svg ref={barcodeRef1} className="max-w-full h-8"></svg>
      </div>

      <div className="text-center pt-1 text-[8px] text-gray-600">
        <p>Please present this token at the time of pickup.</p>
      </div>

      {/* Dotted Cut Separator */}
      <div className="my-3 py-1 border-t-2 border-b-2 border-black border-dashed text-center text-[9px] font-bold">
        ✂ - - - - - - - - - - - - - - - - - - - - - - - - - - - ✂
      </div>

      {/* ================= PART 2: SHOP / DEVICE TAG COPY ================= */}
      <div className="text-center pb-1 text-[10px]">
        <p className="font-bold uppercase bg-black text-white py-0.5">SHOP & TECHNICIAN TAG (ATTACH TO DEVICE)</p>
      </div>

      <div className="py-1 border-b border-black border-dashed text-[10px] space-y-0.5">
        <div className="flex justify-between font-bold">
          <span>TICKET: {job.ticketNumber}</span>
          <span>{formatDateTime(job.receivedDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>Client: {job.customerName}</span>
          <span>{job.customerPhone}</span>
        </div>
        <div className="font-bold">
          <span>Device: {job.deviceOrItemName}</span>
        </div>
        {job.serialOrImei && (
          <div className="text-[9px]">
            <span>SN/IMEI: {job.serialOrImei}</span>
          </div>
        )}
        {job.accessoriesReceived && (
          <div className="text-[9px] italic">
            <span>Accessories: {job.accessoriesReceived}</span>
          </div>
        )}
        <div className="border-t border-black pt-1">
          <span className="font-bold">Fault Description:</span>
          <p className="text-[10px]">{job.problemDescription}</p>
        </div>
      </div>

      <div className="pt-2 text-center flex flex-col items-center">
        <svg ref={barcodeRef2} className="max-w-full h-7"></svg>
      </div>

      <div className="pt-2 flex justify-between text-[9px] text-gray-700">
        <span>Tech: _________________</span>
        <span>Sign: _________________</span>
      </div>
    </div>
  );
};
