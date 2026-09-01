import React, { useState } from 'react';
import { CartItem, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../services/printService';
import {
  Trash2,
  Plus,
  Minus,
  User,
  UserPlus,
  Percent,
  Tag,
  ArrowRight,
  ShoppingBag,
  TrendingUp,
  X
} from 'lucide-react';

interface CartPanelProps {
  items: CartItem[];
  subtotal: number;
  costTotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  netTotal: number;
  grossProfit: number;
  selectedCustomer: Customer | null;
  onUpdateQty: (itemId: string, newQty: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onSetDiscountType: (type: 'percentage' | 'fixed') => void;
  onSetDiscountValue: (value: number) => void;
  onOpenQuickCustomer: () => void;
  onRemoveCustomer: () => void;
  onOpenPayment: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  items,
  subtotal,
  costTotal,
  discountType,
  discountValue,
  discountAmount,
  netTotal,
  grossProfit,
  selectedCustomer,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onSetDiscountType,
  onSetDiscountValue,
  onOpenQuickCustomer,
  onRemoveCustomer,
  onOpenPayment,
}) => {
  const { isOwner } = useAuth();
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);

  return (
    <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full select-none shrink-0">
      {/* Top Customer Tag / Select */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/40">
        {selectedCustomer ? (
          <div className="flex items-center justify-between bg-sky-950/40 border border-sky-500/30 p-2.5 rounded-xl">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                {selectedCustomer.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-tight">{selectedCustomer.name}</p>
                <p className="text-[10px] text-sky-400 font-mono">{selectedCustomer.phone}</p>
              </div>
            </div>
            <button
              onClick={onRemoveCustomer}
              className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
              title="Remove customer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenQuickCustomer}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-900 text-slate-400 hover:text-white transition group"
          >
            <div className="flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Select / Add Customer (Loyalty)</span>
            </div>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">Optional</span>
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-2xl flex flex-col space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-2">
                  <h5 className="text-xs font-bold text-slate-200 leading-snug">{item.name}</h5>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Rs. {item.unitPrice.toFixed(2)} / unit
                  </p>
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition"
                  title="Remove from cart"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quantity Stepper & Line Total */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-800/50">
                <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-xl p-0.5">
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono font-bold text-xs text-white w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right">
                  <span className="font-mono font-extrabold text-sm text-white">
                    Rs. {item.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
            <ShoppingBag className="w-12 h-12 stroke-1 text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-400">Cart is Empty</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Scan an item or select from product list to start</p>
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout Footer */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3 shrink-0">
        {/* Subtotal */}
        <div className="flex justify-between text-xs text-slate-400">
          <span>Subtotal ({items.reduce((s, i) => s + i.qty, 0)} items):</span>
          <span className="font-mono font-bold text-slate-200">Rs. {subtotal.toFixed(2)}</span>
        </div>

        {/* Discount Trigger / Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <button
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-sky-400 hover:text-sky-300 flex items-center space-x-1 font-medium"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{discountValue > 0 ? `Discount (${discountType === 'percentage' ? `${discountValue}%` : 'Rs.'})` : '+ Add Discount'}</span>
            </button>
            {discountAmount > 0 && (
              <span className="font-mono font-bold text-emerald-400">-Rs. {discountAmount.toFixed(2)}</span>
            )}
          </div>

          {showDiscountInput && (
            <div className="flex items-center space-x-2 bg-slate-900 p-2 rounded-xl border border-slate-800 animate-in fade-in duration-150">
              <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                <button
                  onClick={() => onSetDiscountType('percentage')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    discountType === 'percentage' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => onSetDiscountType('fixed')}
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    discountType === 'fixed' ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  Rs.
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={discountType === 'percentage' ? 100 : subtotal}
                value={discountValue}
                onChange={(e) => onSetDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold"
                placeholder={discountType === 'percentage' ? 'Discount %' : 'Discount Rs.'}
              />
              {discountValue > 0 && (
                <button
                  onClick={() => { onSetDiscountValue(0); setShowDiscountInput(false); }}
                  className="text-slate-500 hover:text-rose-400 text-xs px-1"
                >
                  Reset
                </button>
              )}
            </div>
          )}
        </div>

        {/* Owner Only Live Gross Profit Indicator */}
        {isOwner && items.length > 0 && (
          <div className="flex justify-between items-center text-[11px] bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-500 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Est. Gross Profit:</span>
            </span>
            <span className="font-mono font-bold text-emerald-400">
              Rs. {grossProfit.toFixed(2)} ({subtotal > 0 ? ((grossProfit / netTotal) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        )}

        {/* Big Net Payable Total */}
        <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
          <span className="text-xs font-extrabold uppercase text-slate-300">Net Total</span>
          <span className="text-2xl font-black font-mono text-white tracking-tight">
            {formatCurrency(netTotal)}
          </span>
        </div>

        {/* Actions: Clear & Checkout */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={onClearCart}
            disabled={items.length === 0}
            className="col-span-1 py-3 rounded-2xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
            title="Clear Cart (Esc)"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenPayment}
            disabled={items.length === 0}
            className="col-span-3 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center space-x-2 transition active:scale-98"
          >
            <span>Checkout</span>
            <span className="text-xs font-mono opacity-80">(F10)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
