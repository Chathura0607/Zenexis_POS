import React, { useState } from 'react';
import { Expense } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { formatCurrency, formatDateTime } from '../../services/printService';
import {
  Receipt,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  X,
  AlertCircle,
  Coffee,
  Zap,
  Home,
  Wrench,
  Truck,
  Trash2
} from 'lucide-react';

import { createExpense } from '../../services/expenseService';

export const ExpenseTracker: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeShift } = useShift();

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<Expense['category']>('Tea_Snacks');
  const [amount, setAmount] = useState<number>(150);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank_Transfer' | 'Card'>('Cash');
  const [paidTo, setPaidTo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const expenses = useLiveQuery(() => db.expenses.orderBy('timestamp').reverse().toArray());

  const totalExpenses = (expenses || []).reduce((sum, e) => sum + e.amount, 0);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || amount <= 0) {
      setErrorMsg('Please enter expense title and valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createExpense({
        title,
        category,
        amount: Number(amount),
        paymentMethod,
        paidTo,
        shiftId: activeShift?.id,
        recordedBy: currentUser?.name || 'Staff',
        notes,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save expense');
        return;
      }

      setIsAddExpenseOpen(false);
      setTitle('');
      setAmount(150);
      setPaidTo('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: Expense['category']) => {
    switch (cat) {
      case 'Tea_Snacks': return Coffee;
      case 'Electricity': return Zap;
      case 'Rent': return Home;
      case 'Repair_Parts': return Wrench;
      case 'Transport': return Truck;
      default: return Receipt;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-rose-400" />
            <span>Shop Expense Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Log operational costs, tea/snacks, electricity, rent, supplier parts & cash drops
          </p>
        </div>

        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Metric summary */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shrink-0">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Total Shop Expenses Logged</span>
          <p className="text-2xl font-mono font-black text-rose-400 mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>{expenses?.length || 0} entries recorded</p>
          <span className="text-[10px] text-slate-500">Deducted automatically in net profit calculations</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold sticky top-0">
            <tr>
              <th className="py-3 px-4">Title / Purpose</th>
              <th className="py-3 px-3">Category</th>
              <th className="py-3 px-3">Payment Method</th>
              <th className="py-3 px-3">Paid To</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3 text-right">Amount (LKR)</th>
              <th className="py-3 px-4 text-right">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {expenses && expenses.length > 0 ? (
              expenses.map((e) => {
                const Icon = getCategoryIcon(e.category);
                return (
                  <tr key={e.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white leading-tight">{e.title}</p>
                      {e.notes && <span className="text-[10px] text-slate-500">{e.notes}</span>}
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        <Icon className="w-3 h-3 text-rose-400" />
                        <span>{e.category.replace('_', ' ')}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300 font-mono">{e.paymentMethod}</td>
                    <td className="py-3 px-3 text-slate-400">{e.paidTo || '-'}</td>
                    <td className="py-3 px-3 text-slate-400">{formatDateTime(e.timestamp)}</td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400 text-sm">
                      {formatCurrency(e.amount)}
                    </td>

                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                      {e.recordedBy}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-500">
                  No shop expenses recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Record Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-rose-400" />
                <span>Log Shop Expense</span>
              </h3>
              <button onClick={() => setIsAddExpenseOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Expense Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Afternoon Tea & Shorties / Shop Cleaning / Bulb Replacement"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Tea_Snacks">Tea & Snacks</option>
                    <option value="Electricity">Electricity Bill</option>
                    <option value="Rent">Shop Rent</option>
                    <option value="Repair_Parts">Repair Spare Parts</option>
                    <option value="Supplies">Stationery Supplies</option>
                    <option value="Salary_Advance">Staff Salary Advance</option>
                    <option value="Transport">Transport / Delivery</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-rose-500 focus:outline-none"
                  >
                    <option value="Cash">Cash (From Drawer)</option>
                    <option value="Bank_Transfer">Bank Transfer</option>
                    <option value="Card">Credit/Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Amount (LKR) *</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-rose-400 font-mono text-base font-bold focus:border-rose-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Paid To / Recipient</label>
                  <input
                    type="text"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    placeholder="e.g. Kasun / CEB / Shop Owner"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional remarks"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
