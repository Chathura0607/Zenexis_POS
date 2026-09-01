import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShift } from '../../context/ShiftContext';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Lock,
  LogOut,
  User,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Wallet,
  Sparkles,
  Printer,
  Maximize2
} from 'lucide-react';

interface TopBarProps {
  onOpenAIInsights: () => void;
  onOpenLowStock: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenAIInsights, onOpenLowStock }) => {
  const { currentUser, isOwner, lockScreen, logout } = useAuth();
  const { activeShift, openDrawerModal } = useShift();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  
  // Count low stock items in real-time
  const lowStockCount = useLiveQuery(async () => {
    const defaultMin = settings?.lowStockThresholdDefault || 5;
    const items = await db.products.filter(p => !p.isService && p.stockQty <= (p.minStockLevel || defaultMin)).toArray();
    return items.length;
  }, [settings]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString('en-LK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  };

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 flex items-center justify-between select-none z-30">
      {/* Brand & Location */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <span className="font-extrabold text-white text-xl tracking-tight">Z</span>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg text-white tracking-wide">{settings?.shopName || 'ZENEXIS'}</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full">
              POS v1.0
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center space-x-1">
            <span>{settings?.shopLocation || 'Polhena, Ambalangoda'}</span>
            <span>•</span>
            <span className="text-slate-300 font-mono">{settings?.shopPhone || '0707120945'}</span>
          </p>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="hidden lg:flex items-center space-x-6">
        {/* Clock & Date */}
        <div className="flex items-center space-x-2 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-mono font-semibold text-slate-200">{currentTime}</span>
          <span className="text-xs text-slate-400">({currentDate})</span>
        </div>

        {/* Active Cash Register Shift */}
        <button
          onClick={openDrawerModal}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition ${
            activeShift
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
              : 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40 animate-pulse'
          }`}
          title="Click to manage cash register drawer"
        >
          <Wallet className="w-4 h-4" />
          <span className="text-xs font-semibold">
            {activeShift ? `Shift ${activeShift.shiftNumber} (Open)` : 'Shift Closed - Open Drawer'}
          </span>
        </button>

        {/* Low Stock Alert Badge */}
        {(lowStockCount || 0) > 0 && (
          <button
            onClick={onOpenLowStock}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 transition animate-bounce"
            title={`${lowStockCount} items low on stock`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold">{lowStockCount} Low Stock</span>
          </button>
        )}

        {/* AI Insights Button */}
        <button
          onClick={onOpenAIInsights}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span className="text-xs font-semibold">AI Insights</span>
        </button>
      </div>

      {/* User Info & Controls */}
      <div className="flex items-center space-x-3">
        {/* Cashier Badge */}
        <div className="flex items-center space-x-2.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
          <div className={`w-2.5 h-2.5 rounded-full ${isOwner ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-emerald-400'}`} />
          <div className="text-left">
            <div className="flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-100">{currentUser?.name || 'Cashier'}</span>
              {isOwner && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  OWNER
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">{currentUser?.role || 'Staff'}</span>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullScreen}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Lock Screen Button */}
        <button
          onClick={lockScreen}
          className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
          title="Quick Lock (PIN Protected)"
        >
          <Lock className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium">Lock (F12)</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
          title="Switch User / Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
