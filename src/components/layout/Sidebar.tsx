import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShoppingCart,
  History,
  Wrench,
  Zap,
  Package,
  Truck,
  TrendingUp,
  Receipt,
  Users,
  Settings,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export type NavTab = 
  | 'pos' 
  | 'orders'
  | 'repairs' 
  | 'reloads' 
  | 'inventory' 
  | 'suppliers' 
  | 'analytics' 
  | 'expenses' 
  | 'payroll' 
  | 'ai'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const { isOwner } = useAuth();

  const navItems = [
    { id: 'pos' as NavTab, label: 'POS Billing', icon: ShoppingCart, hotkey: 'F1', ownerOnly: false },
    { id: 'orders' as NavTab, label: 'Order History', icon: History, hotkey: 'F11', ownerOnly: false },
    { id: 'repairs' as NavTab, label: 'Repairs & Jobs', icon: Wrench, hotkey: 'F2', ownerOnly: false },
    { id: 'reloads' as NavTab, label: 'Reloads & Bills', icon: Zap, hotkey: 'F3', ownerOnly: false },
    { id: 'inventory' as NavTab, label: 'Stock & Items', icon: Package, hotkey: 'F4', ownerOnly: false },
    { id: 'suppliers' as NavTab, label: 'Suppliers', icon: Truck, hotkey: 'F5', ownerOnly: true },
    { id: 'analytics' as NavTab, label: 'Profit & Reports', icon: TrendingUp, hotkey: 'F6', ownerOnly: true },
    { id: 'expenses' as NavTab, label: 'Expenses', icon: Receipt, hotkey: 'F7', ownerOnly: false },
    { id: 'payroll' as NavTab, label: 'Staff & Payroll', icon: Users, hotkey: 'F8', ownerOnly: true },
    { id: 'ai' as NavTab, label: 'AI Assistant', icon: Sparkles, hotkey: 'F9', ownerOnly: false },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, hotkey: 'F10', ownerOnly: true },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 select-none shrink-0">
      <div className="space-y-1.5 px-3">
        <div className="px-3 pb-2 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Main Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isRestricted = item.ownerOnly && !isOwner;

          if (isRestricted) {
            return (
              <div
                key={item.id}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-600 cursor-not-allowed opacity-50 select-none"
                title="Owner permission required"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 text-slate-600" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-sky-400'}`} />
                <span>{item.label}</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
              }`}>
                {item.hotkey}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="px-4 pt-4 border-t border-slate-800">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">Offline Database</span>
            <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
              Dexie.js
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span>Printer Roll:</span>
            <span className="text-slate-200 font-mono">80mm Thermal</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
