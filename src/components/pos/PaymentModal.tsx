import React, { useState, useEffect } from 'react';
import { CartItem, Customer, PaymentMethod, Sale, AppSettings } from '../../types';
import { processCheckout } from '../../services/posService';
import { formatCurrency, triggerThermalPrint } from '../../services/printService';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import {
  CreditCard,
  Banknote,
  Building,
  Layers,
  Printer,
  CheckCircle2,
  X,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { ThermalReceipt80mm } from '../print/ThermalReceipt80mm';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  netTotal: number;
  selectedCustomer: Customer | null;
  onPaymentSuccess: (sale: Sale) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  netTotal,
  selectedCustomer,
  onPaymentSuccess,
}) => {
  const { currentUser } = useAuth();
  const { activeShift } = useShift();
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [cashReceived, setCashReceived] = useState<number>(netTotal);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCashReceived(netTotal);
      setCardAmount(0);
      setTransferAmount(0);
      setErrorMsg('');
      setLastCompletedSale(null);
      if (settings?.autoPrintReceipt !== undefined) {
        setAutoPrint(settings.autoPrintReceipt);
      }
    }
  }, [isOpen, netTotal, settings]);

  if (!isOpen) return null;

  const changeReturn = Math.max(0, cashReceived - netTotal);

  const handleQuickCash = (amount: number) => {
    setCashReceived(amount);
  };

  const handleExactCash = () => {
    setCashReceived(netTotal);
  };

  const handleCompletePayment = async () => {
    if (paymentMethod === 'Cash' && cashReceived < netTotal) {
      setErrorMsg('Cash received cannot be less than Net Total');
      return;
    }

    if (paymentMethod === 'Split' && (cashReceived + cardAmount + transferAmount) < netTotal) {
      setErrorMsg('Total split payment amounts cannot be less than Net Total');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      const res = await processCheckout({
        items,
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        discountType,
        discountValue,
        paymentMethod,
        cashReceived: paymentMethod === 'Cash' || paymentMethod === 'Split' ? cashReceived : undefined,
        cardAmount: paymentMethod === 'Card' ? netTotal : cardAmount,
        transferAmount: paymentMethod === 'Bank_Transfer' ? netTotal : transferAmount,
        cashierId: currentUser?.id || 'emp_owner_1',
        cashierName: currentUser?.name || 'Staff',
        shiftId: activeShift?.id || '',
        notes,
      });

      if (res.success && res.sale) {
        setLastCompletedSale(res.sale);

        // Play subtle confetti effect for smooth UX
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.85 },
          colors: ['#0ea5e9', '#6366f1', '#10b981'],
        });

        // Trigger thermal print if autoPrint enabled
        if (autoPrint) {
          setTimeout(() => {
            triggerThermalPrint('thermal-receipt-area');
          }, 100);
        }

        setTimeout(() => {
          onPaymentSuccess(res.sale!);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Payment failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment processing error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Hidden Thermal Receipt Area for Xprinter XP-80T */}
      <div id="thermal-receipt-area" className="hidden">
        {lastCompletedSale && (
          <ThermalReceipt80mm sale={lastCompletedSale} settings={settings} />
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Complete Checkout & Bill</h3>
              <p className="text-xs text-slate-400">
                {selectedCustomer ? `Customer: ${selectedCustomer.name} (${selectedCustomer.phone})` : 'Walk-in Customer'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Big Net Payable Display */}
        <div className="mt-4 bg-gradient-to-br from-slate-950 to-slate-900 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payable Amount</span>
            {discountAmount > 0 && (
              <p className="text-[11px] text-emerald-400 font-medium">Includes Rs. {discountAmount.toFixed(2)} discount</p>
            )}
          </div>
          <p className="text-3xl font-extrabold text-white font-mono">{formatCurrency(netTotal)}</p>
        </div>

        {/* Payment Methods */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Payment Method
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'Cash' as PaymentMethod, label: 'Cash', icon: Banknote, color: 'text-emerald-400' },
              { id: 'Card' as PaymentMethod, label: 'Card (POS)', icon: CreditCard, color: 'text-sky-400' },
              { id: 'Bank_Transfer' as PaymentMethod, label: 'Bank Transfer', icon: Building, color: 'text-purple-400' },
              { id: 'Split' as PaymentMethod, label: 'Split Pay', icon: Layers, color: 'text-amber-400' },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-2xl border transition flex flex-col items-center justify-center space-y-1.5 ${
                    isSelected
                      ? 'bg-sky-600/20 border-sky-500 shadow-lg'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${m.color}`} />
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Tender & Change Return Section */}
        {paymentMethod === 'Cash' && (
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-300 uppercase">Cash Tendered by Customer</label>
                <button
                  onClick={handleExactCash}
                  className="text-xs text-sky-400 hover:text-sky-300 font-bold"
                >
                  Exact Amount (Rs. {netTotal.toFixed(0)})
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xl font-bold focus:border-sky-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Denomination Chips */}
            <div className="flex flex-wrap gap-1.5">
              {[500, 1000, 2000, 5000, 10000].map((denom) => (
                <button
                  key={denom}
                  onClick={() => handleQuickCash(denom)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-xs font-mono font-bold text-slate-200 rounded-lg border border-slate-700 transition"
                >
                  Rs. {denom.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Change to Return Display */}
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Balance Change to Return:</span>
              <span className={`text-xl font-mono font-black ${changeReturn > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {formatCurrency(changeReturn)}
              </span>
            </div>
          </div>
        )}

        {/* Split Payment Inputs */}
        {paymentMethod === 'Split' && (
          <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Cash Portion</label>
              <input
                type="number"
                value={cashReceived}
                onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Card Portion</label>
              <input
                type="number"
                value={cardAmount}
                onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Transfer Portion</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold"
              />
            </div>
          </div>
        )}

        {/* Optional Notes */}
        <div className="mt-3">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Invoice remarks / customer reference (optional)"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        {/* Bottom Actions */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPrint}
              onChange={(e) => setAutoPrint(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Auto Thermal Print (80mm Xprinter)</span>
          </label>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-sm transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleCompletePayment}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Complete & Print Bill (F10)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
