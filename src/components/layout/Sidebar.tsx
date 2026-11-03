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
  ShieldAlert,
  X,
  Menu,
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isMobileOpen = false,
  onCloseMobile = () => {},
  onToggleMobileMenu = () => {},
}) => {
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

  const handleSelectTab = (tab: NavTab) => {
    onTabChange(tab);
    onCloseMobile();
  };

  const renderNavList = () => (
    <div className="space-y-1 px-2">
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
            onClick={() => handleSelectTab(item.id)}
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
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded hidden sm:inline-block ${
              isActive ? 'bg-sky-700 text-sky-100' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
            }`}>
              {item.hotkey}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between py-4 select-none shrink-0 overflow-y-auto">
        {renderNavList()}

        {/* Footer System Status */}
        <div className="px-4 pt-4 border-t border-slate-800 mt-auto">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Database Engine</span>
              <span className="inline-flex items-center text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1"></span>
                Dexie + Cloud
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>Printer Roll:</span>
              <span className="text-slate-200 font-mono">80mm Thermal</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Slide-Over Drawer with Backdrop */}
      {isMobileOpen && (
        <>
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 md:hidden animate-in fade-in"
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-50 p-4 flex flex-col justify-between shadow-2xl md:hidden overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-600 to-cyan-400 flex items-center justify-center text-white font-black text-sm">
                    Z
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">Zenexis POS</h3>
                    <p className="text-[10px] text-slate-400">Mobile Management</p>
                  </div>
                </div>
                <button
                  onClick={onCloseMobile}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {renderNavList()}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 text-center">
              Zenexis Cloud POS v1.0
            </div>
          </div>
        </>
      )}

      {/* 3. Mobile Bottom Navigation Bar (Thumb Friendly for iPhone 16 Pro Max & Pixel 6a) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex items-center justify-around z-40 px-2 pb-[env(safe-area-inset-bottom)]">
        {/* Reports / Analytics */}
        <button
          onClick={() => handleSelectTab('analytics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
            activeTab === 'analytics' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className={`w-5 h-5 ${activeTab === 'analytics' ? 'text-sky-400 scale-110' : ''}`} />
          <span className="mt-0.5">Reports</span>
        </button>

        {/* Orders / Invoices */}
        <button
          onClick={() => handleSelectTab('orders')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
            activeTab === 'orders' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className={`w-5 h-5 ${activeTab === 'orders' ? 'text-sky-400 scale-110' : ''}`} />
          <span className="mt-0.5">Orders</span>
        </button>

        {/* POS / Billing */}
        <button
          onClick={() => handleSelectTab('pos')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
            activeTab === 'pos' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShoppingCart className={`w-5 h-5 ${activeTab === 'pos' ? 'text-sky-400 scale-110' : ''}`} />
          <span className="mt-0.5">Billing</span>
        </button>

        {/* Inventory / Stock */}
        <button
          onClick={() => handleSelectTab('inventory')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
            activeTab === 'inventory' ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'text-sky-400 scale-110' : ''}`} />
          <span className="mt-0.5">Stock</span>
        </button>

        {/* More / Menu Drawer Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition ${
            isMobileOpen ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Menu className={`w-5 h-5 ${isMobileOpen ? 'text-sky-400 scale-110' : ''}`} />
          <span className="mt-0.5">More</span>
        </button>
      </nav>
    </>
  );
};

