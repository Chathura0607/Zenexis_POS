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
  Maximize2,
  Cloud,
  CloudOff,
  RefreshCw,
  Menu,
} from 'lucide-react';
import { subscribeToSyncStatus, getCurrentSyncStatus, processSyncQueue } from '../../services/cloudSyncService';
import { CloudSyncStatus } from '../../types';

interface TopBarProps {
  onOpenAIInsights: () => void;
  onOpenLowStock: () => void;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenAIInsights, onOpenLowStock, onToggleMobileMenu }) => {
  const { currentUser, isOwner, lockScreen, logout } = useAuth();
  const { activeShift, openDrawerModal } = useShift();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(getCurrentSyncStatus());

  useEffect(() => {
    const unsub = subscribeToSyncStatus(setSyncStatus);
    return unsub;
  }, []);

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
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Location */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-2 md:hidden text-slate-300 hover:text-white rounded-xl bg-slate-800 border border-slate-700 active:scale-95 transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 text-sky-400" />
          </button>
        )}

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
          <span className="font-extrabold text-white text-lg sm:text-xl tracking-tight">Z</span>
        </div>
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-bold text-sm sm:text-lg text-white tracking-wide truncate max-w-[120px] sm:max-w-none">
              {settings?.shopName || 'ZENEXIS'}
            </h1>
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 sm:px-2 py-0.5 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-full">
              POS
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-400 flex items-center space-x-1 truncate max-w-[150px] sm:max-w-none">
            <span className="truncate">{settings?.shopLocation || 'Polhena, Ambalangoda'}</span>
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

        {/* Cloud Sync Status Indicator */}
        {settings?.firebaseConfig?.enabled && (
          <div
            onClick={() => {
              if (syncStatus.isOnline) processSyncQueue();
            }}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition select-none ${
              !syncStatus.isOnline || syncStatus.state === 'offline'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
                : syncStatus.state === 'syncing'
                ? 'bg-sky-950/50 border-sky-500/40 text-sky-300'
                : syncStatus.state === 'error'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/30'
            }`}
            title={
              !syncStatus.isOnline
                ? 'Offline (Local changes will auto-sync when internet reconnects)'
                : syncStatus.state === 'syncing'
                ? `Syncing changes (${syncStatus.pendingCount} pending)...`
                : syncStatus.state === 'error'
                ? `Sync issue: ${syncStatus.errorMessage || 'Click to retry'}`
                : `Cloud Synced (${syncStatus.pendingCount} pending). Click to trigger sync.`
            }
          >
            {!syncStatus.isOnline || syncStatus.state === 'offline' ? (
              <>
                <CloudOff className="w-4 h-4 text-amber-400" />
                <span>Offline ({syncStatus.pendingCount})</span>
              </>
            ) : syncStatus.state === 'syncing' ? (
              <>
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
                <span>Syncing ({syncStatus.pendingCount})</span>
              </>
            ) : syncStatus.state === 'error' ? (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Sync Error</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span>Cloud Synced</span>
                {syncStatus.pendingCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-emerald-500/20 rounded-full font-mono">
                    {syncStatus.pendingCount}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* User Info & Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Cashier Badge */}
        <div className="flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-700">
          <div className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${isOwner ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-emerald-400'}`} />
          <div className="text-left">
            <div className="flex items-center space-x-1">
              <span className="text-[11px] sm:text-xs font-bold text-slate-100 max-w-[80px] sm:max-w-none truncate">{currentUser?.name || 'Cashier'}</span>
              {isOwner && (
                <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                  OWNER
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullScreen}
          className="hidden md:block p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Lock Screen Button */}
        <button
          onClick={lockScreen}
          className="flex items-center space-x-1 p-2 sm:px-3 sm:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition"
          title="Quick Lock (PIN Protected)"
        >
          <Lock className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-medium hidden sm:inline">Lock</span>
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
