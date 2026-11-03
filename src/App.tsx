import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ShiftProvider } from './context/ShiftContext';
import { TopBar } from './components/layout/TopBar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { PINLockModal } from './components/layout/PINLockModal';
import { ShiftDrawerModal } from './components/layout/ShiftDrawerModal';

import { POSTerminal } from './components/pos/POSTerminal';
import { OrderHistory } from './components/orders/OrderHistory';
import { RepairHub } from './components/repairs/RepairHub';
import { ReloadTerminal } from './components/reloads/ReloadTerminal';
import { InventoryManager } from './components/inventory/InventoryManager';
import { SupplierManager } from './components/suppliers/SupplierManager';
import { FinancialDashboard } from './components/analytics/FinancialDashboard';
import { ExpenseTracker } from './components/expenses/ExpenseTracker';
import { PayrollManager } from './components/payroll/PayrollManager';
import { AIInsightsCenter } from './components/ai/AIInsightsCenter';
import { SettingsManager } from './components/settings/SettingsManager';
import { startCloudSyncWorker } from './services/cloudSyncService';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('pos');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const { isOwner, lockScreen } = useAuth();

  // Initialize background cloud sync worker
  useEffect(() => {
    const cleanup = startCloudSyncWorker();
    return cleanup;
  }, []);

  // Global Keyboard Shortcuts (F1 - F12)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); setActiveTab('pos'); }
      else if (e.key === 'F2') { e.preventDefault(); setActiveTab('repairs'); }
      else if (e.key === 'F3') { e.preventDefault(); setActiveTab('reloads'); }
      else if (e.key === 'F4') { e.preventDefault(); setActiveTab('inventory'); }
      else if (e.key === 'F5' && isOwner) { e.preventDefault(); setActiveTab('suppliers'); }
      else if (e.key === 'F6' && isOwner) { e.preventDefault(); setActiveTab('analytics'); }
      else if (e.key === 'F7') { e.preventDefault(); setActiveTab('expenses'); }
      else if (e.key === 'F8' && isOwner) { e.preventDefault(); setActiveTab('payroll'); }
      else if (e.key === 'F9') { e.preventDefault(); setActiveTab('ai'); }
      else if (e.key === 'F10' && isOwner) { e.preventDefault(); setActiveTab('settings'); }
      else if (e.key === 'F11') { e.preventDefault(); setActiveTab('orders'); }
      else if (e.key === 'F12') { e.preventDefault(); lockScreen(); }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOwner, lockScreen]);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* Top Header Bar */}
      <TopBar
        onOpenAIInsights={() => setActiveTab('ai')}
        onOpenLowStock={() => setActiveTab('inventory')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
      />

      {/* Main Workspace: Sidebar + Dynamic Module Area */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        />

        <main className="flex-1 flex overflow-hidden pb-16 md:pb-0">
          {activeTab === 'pos' && <POSTerminal onOpenOrderHistory={() => setActiveTab('orders')} />}
          {activeTab === 'orders' && <OrderHistory />}
          {activeTab === 'repairs' && <RepairHub />}
          {activeTab === 'reloads' && <ReloadTerminal />}
          {activeTab === 'inventory' && <InventoryManager />}
          {activeTab === 'suppliers' && (isOwner ? <SupplierManager /> : <POSTerminal onOpenOrderHistory={() => setActiveTab('orders')} />)}
          {activeTab === 'analytics' && (isOwner ? <FinancialDashboard /> : <POSTerminal onOpenOrderHistory={() => setActiveTab('orders')} />)}
          {activeTab === 'expenses' && <ExpenseTracker />}
          {activeTab === 'payroll' && (isOwner ? <PayrollManager /> : <POSTerminal onOpenOrderHistory={() => setActiveTab('orders')} />)}
          {activeTab === 'ai' && <AIInsightsCenter />}
          {activeTab === 'settings' && (isOwner ? <SettingsManager /> : <POSTerminal onOpenOrderHistory={() => setActiveTab('orders')} />)}
        </main>
      </div>

      {/* Modals */}
      <PINLockModal />
      <ShiftDrawerModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ShiftProvider>
        <AppContent />
      </ShiftProvider>
    </AuthProvider>
  );
};

export default App;
