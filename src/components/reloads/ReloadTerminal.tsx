import React, { useState } from 'react';
import { TelcoProvider, ReloadTransaction } from '../../types';
import { processReloadTransaction, TELCO_COMMISSIONS } from '../../services/reloadService';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { formatCurrency, formatDateTime } from '../../services/printService';
import { Zap, CheckCircle2, AlertCircle, Phone, DollarSign, TrendingUp, History } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ReloadTerminal: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeShift } = useShift();

  const [provider, setProvider] = useState<TelcoProvider>('Dialog');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [amount, setAmount] = useState<number>(100);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const reloadHistory = useLiveQuery(() =>
    db.reloadTransactions.orderBy('timestamp').reverse().limit(30).toArray()
  );

  // Compute today's reload totals and commission
  const today = new Date().toISOString().slice(0, 10);
  const todayReloads = reloadHistory?.filter((r) => r.timestamp.startsWith(today)) || [];
  const todayReloadTotal = todayReloads.reduce((sum, r) => sum + r.amount, 0);
  const todayCommissionTotal = todayReloads.reduce((sum, r) => sum + r.commissionAmount, 0);

  const providersList: { id: TelcoProvider; name: string; color: string; commission: string }[] = [
    { id: 'Dialog', name: 'Dialog Axiata', color: 'bg-red-600 border-red-500', commission: '3.5%' },
    { id: 'Mobitel', name: 'SLT-Mobitel', color: 'bg-emerald-600 border-emerald-500', commission: '3.5%' },
    { id: 'Hutch', name: 'Hutch 078 / 072', color: 'bg-amber-600 border-amber-500', commission: '4.0%' },
    { id: 'Airtel', name: 'Airtel Lanka', color: 'bg-rose-600 border-rose-500', commission: '4.0%' },
    { id: 'SLT', name: 'SLT Broadband / Megaline', color: 'bg-blue-600 border-blue-500', commission: '2.0%' },
    { id: 'CEB_Electricity', name: 'CEB Electricity Bill', color: 'bg-yellow-600 border-yellow-500', commission: '1.5%' },
    { id: 'Water_Board', name: 'Water Board Bill', color: 'bg-cyan-600 border-cyan-500', commission: '1.5%' },
  ];

  const handleQuickAmount = (val: number) => {
    setAmount(val);
  };

  const handleProcessReload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerPhone.trim() || customerPhone.length < 9) {
      setErrorMsg('Please enter a valid mobile / account number');
      return;
    }
    if (amount <= 0) {
      setErrorMsg('Amount must be greater than 0');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');

    const res = await processReloadTransaction({
      provider,
      customerPhone: customerPhone.trim(),
      amount,
      cashierId: currentUser?.id || 'emp_1',
      cashierName: currentUser?.name || 'Staff',
      shiftId: activeShift?.id || '',
    });

    setIsProcessing(false);

    if (res.success && res.transaction) {
      setSuccessMsg(`Reload of Rs. ${amount.toLocaleString()} for ${customerPhone} recorded successfully!`);
      setCustomerPhone('');
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Failed to process reload');
    }
  };

  return (
    <div className="flex-1 flex h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Left: Reload Processing Console */}
      <div className="w-1/2 flex flex-col space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Zap className="w-6 h-6 text-amber-400" />
            <span>Reloads & Bill Payment Terminal</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Process mobile reloads and utility bill collections with auto commission calculation
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Telco / Service Providers Grid */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Telco / Service</label>
          <div className="grid grid-cols-2 gap-2">
            {providersList.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                  provider === p.id
                    ? `${p.color} text-white shadow-lg`
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <div>
                  <p className="text-xs font-bold">{p.name}</p>
                  <span className="text-[10px] opacity-80">Comm: {p.commission}</span>
                </div>
                <Zap className={`w-4 h-4 ${provider === p.id ? 'text-white' : 'text-slate-500'}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleProcessReload} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
              Customer Mobile / Account Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="077XXXXXXX / 071XXXXXXX"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase">Reload Amount (LKR) *</label>
              <span className="text-xs text-amber-400 font-mono">
                Est. Commission: Rs. {((amount * (TELCO_COMMISSIONS[provider] || 2)) / 100).toFixed(2)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Rs.</span>
              <input
                type="number"
                min="20"
                step="10"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-1.5">
            {[50, 100, 150, 200, 350, 500, 1000, 2000].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleQuickAmount(val)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 active:bg-amber-600 text-xs font-mono font-bold text-slate-200 rounded-lg border border-slate-800 transition"
              >
                Rs. {val}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/25 flex items-center justify-center space-x-2 transition"
          >
            <Zap className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Confirm Reload & Collect Cash'}</span>
          </button>
        </form>
      </div>

      {/* Right: Daily Stats & Recent Transactions Log */}
      <div className="w-1/2 flex flex-col space-y-4 pl-4 border-l border-slate-800">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Today's Reload Volume</span>
            <p className="text-xl font-mono font-extrabold text-white mt-1">{formatCurrency(todayReloadTotal)}</p>
            <span className="text-[10px] text-slate-500">{todayReloads.length} transactions processed</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Earned Commission</span>
            <p className="text-xl font-mono font-extrabold text-amber-400 mt-1">{formatCurrency(todayCommissionTotal)}</p>
            <span className="text-[10px] text-emerald-400 font-medium">Dealer net earnings</span>
          </div>
        </div>

        {/* Transaction History Log */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <History className="w-4 h-4 text-slate-400" />
              <span>Recent Reload History</span>
            </h3>
            <span className="text-[10px] text-slate-500">Live Synchronized</span>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1">
            {reloadHistory && reloadHistory.length > 0 ? (
              reloadHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                      {tx.provider.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{tx.provider}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{tx.customerPhone}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs font-mono font-bold text-white">Rs. {tx.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-amber-400 font-mono">+{formatCurrency(tx.commissionAmount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6">
                <Zap className="w-8 h-8 text-slate-600 stroke-1 mb-2" />
                <p className="text-xs">No reload transactions yet today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
