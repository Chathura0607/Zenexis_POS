import React, { useState } from 'react';
import { Sale } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDateTime, triggerThermalPrint, exportSingleSaleToPDF } from '../../services/printService';
import { ThermalReceipt80mm } from '../print/ThermalReceipt80mm';
import {
  Receipt,
  Printer,
  FileText,
  X,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  Banknote,
  Building,
  Layers,
  ShoppingBag,
  Eye
} from 'lucide-react';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, sale }) => {
  const { isOwner } = useAuth();
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const [showThermalPreview, setShowThermalPreview] = useState<boolean>(false);

  if (!isOpen || !sale) return null;

  const isRefunded = sale.status === 'Refunded';

  const handlePrint = () => {
    triggerThermalPrint('modal-thermal-receipt-print');
  };

  const handleDownloadPDF = () => {
    exportSingleSaleToPDF(sale, settings);
  };

  const getPaymentIcon = (method: Sale['paymentMethod']) => {
    switch (method) {
      case 'Cash': return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Card': return <CreditCard className="w-3.5 h-3.5 text-sky-400" />;
      case 'Bank_Transfer': return <Building className="w-3.5 h-3.5 text-purple-400" />;
      case 'Split': return <Layers className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Hidden Thermal area */}
      <div id="modal-thermal-receipt-print" className="hidden">
        <ThermalReceipt80mm sale={sale} settings={settings} />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white font-mono">{sale.invoiceNumber}</h3>
                {isRefunded ? (
                  <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>REFUNDED</span>
                  </span>
                ) : (
                  <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>PAID / COMPLETED</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center space-x-2 pt-0.5">
                <span>{formatDateTime(sale.timestamp)}</span>
                <span>•</span>
                <span>Cashier: {sale.cashierName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowThermalPreview(!showThermalPreview)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-1"
              title="Toggle thermal receipt layout"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-bold transition flex items-center space-x-1"
              title="Download PDF"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/30 transition flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Customer & Info Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Customer</span>
              <p className="font-bold text-white flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>{sale.customerName || 'Walk-in Customer'}</span>
              </p>
              {sale.customerPhone && (
                <p className="text-slate-300 font-mono flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{sale.customerPhone}</span>
                </p>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Payment Information</span>
              <p className="font-bold text-sky-400 flex items-center space-x-1.5">
                {getPaymentIcon(sale.paymentMethod)}
                <span>{sale.paymentMethod.replace('_', ' ')}</span>
              </p>
              {sale.paymentMethod === 'Cash' && sale.cashReceived !== undefined && (
                <p className="text-slate-400 font-mono">
                  Tender: Rs. {sale.cashReceived.toFixed(2)} | Change: Rs. {(sale.balanceChange || 0).toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Thermal Preview if open */}
          {showThermalPreview && (
            <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/30 flex justify-center">
              <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
                <ThermalReceipt80mm sale={sale} settings={settings} />
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                <span>Line Items ({sale.items.length})</span>
              </span>
              <span className="font-mono text-slate-400">{sale.itemCount} units</span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase bg-slate-900/40">
                <tr>
                  <th className="py-2 px-3">Item</th>
                  <th className="py-2 px-3 text-right">Price</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sale.items.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-white">{item.name}</p>
                      {item.discountAmount > 0 && (
                        <p className="text-[10px] text-emerald-400">Disc: -Rs. {item.discountAmount.toFixed(2)}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-300">Rs. {item.unitPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-white">{item.qty}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">Rs. {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal:</span>
              <span className="font-mono text-slate-200">Rs. {sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount:</span>
                <span className="font-mono">-Rs. {sale.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
              <span className="text-sm font-bold text-white">Net Total:</span>
              <span className="text-xl font-mono font-black text-emerald-400">{formatCurrency(sale.netTotal)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
