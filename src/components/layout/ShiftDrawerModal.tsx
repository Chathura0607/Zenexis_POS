import React, { useState } from 'react';
import { useShift } from '../../context/ShiftContext';
import { useAuth } from '../../context/AuthContext';
import { Wallet, CheckCircle2, AlertCircle, X, ArrowRight, DollarSign } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../services/printService';

export const ShiftDrawerModal: React.FC = () => {
  const { activeShift, isOpenDrawerModal, closeDrawerModal, startShift, endShift } = useShift();
  const { currentUser } = useAuth();

  const [openingFloat, setOpeningFloat] = useState<number>(5000);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closingNotes, setClosingNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpenDrawerModal) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (openingFloat < 0) {
      setErrorMsg('Opening float cannot be negative');
      return;
    }
    setIsSubmitting(true);
    const res = await startShift(openingFloat);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to start shift');
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const res = await endShift(countedCash, closingNotes);
    setIsSubmitting(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to close shift');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cash Register & Shift Drawer</h3>
              <p className="text-xs text-slate-400">Cashier: {currentUser?.name}</p>
            </div>
          </div>
          <button
            onClick={closeDrawerModal}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* If No Active Shift -> Form to Open Shift */}
        {!activeShift ? (
          <form onSubmit={handleOpenShift} className="mt-6 space-y-4">
            <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Opening Cash Float (Petty Cash in Drawer)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:border-sky-500 focus:outline-none"
                  placeholder="5000"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Standard starting float for change calculation during morning/evening shift.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeDrawerModal}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Open Shift Drawer</span>
              </button>
            </div>
          </form>
        ) : (
          /* Active Shift Details & Close Shift Form */
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[11px] text-slate-400 uppercase">Shift Number</span>
                <p className="text-base font-mono font-bold text-sky-400 mt-0.5">{activeShift.shiftNumber}</p>
                <span className="text-[10px] text-slate-500">Started: {formatDateTime(activeShift.startTime)}</span>
              </div>
              <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                <span className="text-[11px] text-slate-400 uppercase">Opening Float</span>
                <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">{formatCurrency(activeShift.openingCash)}</p>
                <span className="text-[10px] text-slate-500">Base Drawer Float</span>
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Total Cash Sales:</span>
                <span className="font-mono font-bold text-slate-100">{formatCurrency(activeShift.cashSales)}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-300">
                <span>Card & Online Sales:</span>
                <span className="font-mono font-bold text-slate-100">{formatCurrency((activeShift.cardSales || 0) + (activeShift.transferSales || 0))}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-sky-400">
                <span>Expected Physical Cash in Drawer:</span>
                <span className="font-mono">{formatCurrency(activeShift.expectedCash)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Actual Physical Cash Counted (At Shift Handover)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={countedCash}
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-rose-500 focus:outline-none"
                    placeholder="Enter total cash counted"
                    required
                  />
                </div>
              </div>

              {/* Real-time Drawer Variance */}
              <div className="flex items-center justify-between text-xs px-2">
                <span className="text-slate-400">Difference (Variance):</span>
                <span className={`font-mono font-bold ${
                  countedCash - activeShift.expectedCash === 0
                    ? 'text-emerald-400'
                    : countedCash - activeShift.expectedCash > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}>
                  {countedCash - activeShift.expectedCash >= 0 ? '+' : ''}
                  {formatCurrency(countedCash - activeShift.expectedCash)}
                </span>
              </div>

              <div>
                <input
                  type="text"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Closing notes / handover comment (optional)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeDrawerModal}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-sm transition"
                >
                  Keep Shift Active
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center space-x-2 transition"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Reconcile & Close Shift</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
