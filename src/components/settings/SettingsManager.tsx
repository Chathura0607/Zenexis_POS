import React, { useState, useEffect } from 'react';
import { AppSettings, AuditLog } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { exportDatabaseBackup, restoreDatabaseBackup } from '../../services/backupService';
import { updateEmployeePin } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../services/printService';
import { PrintBridgeClient, DetectedPrinter, BridgeHealthStatus } from '../../services/printBridgeClient';
import {
  Settings,
  Store,
  Printer,
  Shield,
  Database,
  History,
  Save,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Key,
  RefreshCw,
  Zap,
  Check,
  Terminal,
  Layers,
  Coins,
} from 'lucide-react';

import { sanitizeString, settingsSchema } from '../../services/security';
import { logAuditEvent } from '../../services/authService';

export const SettingsManager: React.FC = () => {
  const { currentUser, isOwner } = useAuth();
  const [activeTab, setActiveTab] = useState<'shop' | 'printer' | 'security' | 'backup' | 'audit'>('shop');

  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const auditLogs = useLiveQuery(() => db.auditLogs.orderBy('timestamp').reverse().limit(50).toArray());
  const employees = useLiveQuery(() => db.employees.toArray());

  // Shop Form
  const [shopName, setShopName] = useState<string>('Zenexis');
  const [shopLocation, setShopLocation] = useState<string>('Polhena, Ambalangoda');
  const [shopPhone, setShopPhone] = useState<string>('0707120945');
  const [shopEmail, setShopEmail] = useState<string>('zenexis@gmail.com');
  const [receiptHeader, setReceiptHeader] = useState<string>('COMMUNICATION, PRINTING & REPAIRS');
  const [receiptFooter, setReceiptFooter] = useState<string>('Thank you for choosing Zenexis! Please visit again.');
  const [autoPrint, setAutoPrint] = useState<boolean>(true);
  const [lowStockDefault, setLowStockDefault] = useState<number>(5);

  // Thermal Printer Form
  const [printerType, setPrinterType] = useState<'80mm' | '58mm'>('80mm');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [autoCutPaper, setAutoCutPaper] = useState<boolean>(true);
  const [openCashDrawerOnSale, setOpenCashDrawerOnSale] = useState<boolean>(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeHealthStatus | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<DetectedPrinter[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
  const [isTestingPrint, setIsTestingPrint] = useState<boolean>(false);
  const [isTestingDrawer, setIsTestingDrawer] = useState<boolean>(false);

  // Security Form
  const [ownerPin, setOwnerPin] = useState<string>('');
  const [cashierPin, setCashierPin] = useState<string>('');

  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (settings) {
      setShopName(settings.shopName || 'Zenexis');
      setShopLocation(settings.shopLocation || 'Polhena, Ambalangoda');
      setShopPhone(settings.shopPhone || '0707120945');
      setShopEmail(settings.shopEmail || 'zenexis@gmail.com');
      setReceiptHeader(settings.receiptHeaderNotice || 'COMMUNICATION, PRINTING & REPAIRS');
      setReceiptFooter(settings.receiptFooterMessage || 'Thank you for choosing Zenexis! Please visit again.');
      setAutoPrint(settings.autoPrintReceipt ?? true);
      setLowStockDefault(settings.lowStockThresholdDefault || 5);
      setPrinterType((settings.printerType as '80mm' | '58mm') || '80mm');
      setSelectedPrinter(settings.selectedPrinter || '');
      setAutoCutPaper(settings.autoCutPaper ?? true);
      setOpenCashDrawerOnSale(settings.openCashDrawerOnSale ?? false);
    }
  }, [settings]);

  // Scan for printers and bridge health
  const refreshBridgeAndPrinters = async () => {
    setIsScanningPrinters(true);
    try {
      const status = await PrintBridgeClient.checkStatus();
      setBridgeStatus(status);

      const printers = await PrintBridgeClient.getPrinters();
      setAvailablePrinters(printers);

      // If no printer is selected yet and printers exist, select default
      if (!selectedPrinter && printers.length > 0) {
        const def = printers.find(p => p.isDefault) || printers[0];
        setSelectedPrinter(def.name);
      }
    } catch (e) {
      console.warn('Printer scan error:', e);
    } finally {
      setIsScanningPrinters(false);
    }
  };

  useEffect(() => {
    refreshBridgeAndPrinters();
  }, [activeTab]);

  const handleSaveShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const current = (await db.settings.toCollection().first()) || {};
      const validated = settingsSchema.parse({
        ...current,
        shopName: sanitizeString(shopName),
        shopLocation: sanitizeString(shopLocation),
        shopPhone: sanitizeString(shopPhone),
        shopEmail: shopEmail.trim(),
        currency: 'Rs.',
        receiptHeaderNotice: sanitizeString(receiptHeader),
        receiptFooterMessage: sanitizeString(receiptFooter),
        printerType: printerType,
        autoPrintReceipt: autoPrint,
        lowStockThresholdDefault: Number(lowStockDefault),
        enableSoundEffects: true,
        enableAIInsights: true,
      });

      await db.settings.put({
        id: 'default_settings',
        ...validated,
        updatedAt: new Date().toISOString(),
      });

      await logAuditEvent({
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        action: 'SETTINGS_UPDATE',
        details: `Shop settings updated by ${currentUser?.name || 'Admin'}`,
      });

      setStatusMessage('Shop & Receipt settings updated successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    }
  };

  const handleSavePrinterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const current = ((await db.settings.toCollection().first()) || {}) as Partial<AppSettings>;
      const validated = settingsSchema.parse({
        ...current,
        shopName: current.shopName || 'Zenexis',
        shopLocation: current.shopLocation || 'Polhena, Ambalangoda',
        shopPhone: current.shopPhone || '0707120945',
        shopEmail: current.shopEmail || 'zenexis@gmail.com',
        printerType: printerType,
        selectedPrinter: selectedPrinter,
        autoPrintReceipt: autoPrint,
        autoCutPaper: autoCutPaper,
        openCashDrawerOnSale: openCashDrawerOnSale,
        printMethod: bridgeStatus?.online ? 'bridge' : ((window as any).electronAPI ? 'electron' : 'browser'),
      });

      await db.settings.put({
        id: 'default_settings',
        ...validated,
        updatedAt: new Date().toISOString(),
      });

      await logAuditEvent({
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || 'Admin',
        action: 'SETTINGS_UPDATE',
        details: `Thermal Printer configuration updated (Printer: ${selectedPrinter || 'Default'}, Width: ${printerType})`,
      });

      setStatusMessage('Thermal Printer settings saved successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save printer settings');
    }
  };

  const handleTestPrint = async () => {
    setIsTestingPrint(true);
    setErrorMessage('');
    try {
      const res = await PrintBridgeClient.printTestReceipt(selectedPrinter, printerType, shopName);
      if (res.success) {
        setStatusMessage('Test receipt sent directly to thermal printer!');
      } else {
        setErrorMessage(res.error || 'Test print failed. Make sure Print Bridge is running.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute test print');
    } finally {
      setIsTestingPrint(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleTestDrawer = async () => {
    setIsTestingDrawer(true);
    setErrorMessage('');
    try {
      const res = await PrintBridgeClient.openCashDrawer(selectedPrinter);
      if (res.success) {
        setStatusMessage('Cash drawer kick pulse sent!');
      } else {
        setErrorMessage(res.error || 'Failed to trigger cash drawer.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Drawer test error');
    } finally {
      setIsTestingDrawer(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleUpdatePins = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const owner = employees?.find(e => e.role === 'owner');
      const cashier = employees?.find(e => e.role === 'cashier');

      if (owner && ownerPin.trim()) {
        const res = await updateEmployeePin(owner.id, ownerPin.trim(), currentUser?.name || 'Owner');
        if (!res.success) throw new Error(res.error);
      }
      if (cashier && cashierPin.trim()) {
        const res = await updateEmployeePin(cashier.id, cashierPin.trim(), currentUser?.name || 'Owner');
        if (!res.success) throw new Error(res.error);
      }

      setStatusMessage('Staff PIN credentials updated securely!');
      setOwnerPin('');
      setCashierPin('');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update PINs');
    }
  };

  const handleExportBackup = async () => {
    const res = await exportDatabaseBackup();
    if (res.success && res.dataString) {
      // Check if Electron native dialog available
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.saveDatabaseBackup) {
        const fileRes = await electronAPI.saveDatabaseBackup(res.dataString);
        if (fileRes.success) {
          setStatusMessage(`Backup saved to ${fileRes.filePath}`);
          return;
        }
      }

      // Browser fallback download
      const blob = new Blob([res.dataString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `zenexis-pos-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Backup JSON file downloaded successfully!');
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await restoreDatabaseBackup(content);
        if (res.success) {
          setStatusMessage('Database restored successfully! Refreshing...');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setErrorMessage(res.error || 'Restore failed');
        }
      } catch (err: any) {
        setErrorMessage('Failed to read backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const isElectron = Boolean((window as any).electronAPI);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Settings className="w-6 h-6 text-sky-400" />
            <span>Settings & Hardware Configuration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure shop profile, silent thermal direct printing, staff PIN security, and offline backup
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 shrink-0 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2 shrink-0 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 shrink-0">
        <button
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'shop' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop & Receipts</span>
        </button>

        <button
          onClick={() => setActiveTab('printer')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'printer' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Thermal Printer & Silent Print</span>
          {bridgeStatus?.online && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'security' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>PIN Security</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'backup' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Offline Backup & Restore</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'audit' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Security Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: Shop & Receipts */}
      {activeTab === 'shop' && (
        <form onSubmit={handleSaveShopSettings} className="flex-1 overflow-y-auto space-y-4 max-w-2xl pr-2">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Store className="w-4 h-4 text-sky-400" />
              <span>Business Profile & Information</span>
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Business Name</label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Location / Address</label>
                <input
                  type="text"
                  value={shopLocation}
                  onChange={(e) => setShopLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  value={shopEmail}
                  onChange={(e) => setShopEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Receipt Header Tagline</label>
              <input
                type="text"
                value={receiptHeader}
                onChange={(e) => setReceiptHeader(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Receipt Footer Notice</label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Default Low Stock Alert Threshold</label>
              <input
                type="number"
                min="1"
                value={lowStockDefault}
                onChange={(e) => setLowStockDefault(parseInt(e.target.value) || 5)}
                className="w-32 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Settings</span>
          </button>
        </form>
      )}

      {/* TAB 2: Thermal Printer & Silent Print Setup */}
      {activeTab === 'printer' && (
        <form onSubmit={handleSavePrinterSettings} className="flex-1 overflow-y-auto space-y-4 max-w-3xl pr-2">
          {/* Bridge & Driver Status Card */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Printer className="w-4 h-4 text-sky-400" />
                <span>Direct Thermal Printing Engine</span>
              </h3>

              <button
                type="button"
                onClick={refreshBridgeAndPrinters}
                disabled={isScanningPrinters}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg flex items-center space-x-1.5 transition font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                <span>Scan Hardware</span>
              </button>
            </div>

            {/* Status Indicators */}
            {bridgeStatus?.online ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl flex items-start space-x-3 text-emerald-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5 flex-1">
                  <div className="flex items-center space-x-2 font-bold text-white">
                    <span>Zenexis Local Print Bridge: ONLINE (Port {bridgeStatus.port})</span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full border border-emerald-500/30">
                      100% Free • Zero Cloud Delay
                    </span>
                  </div>
                  <p className="text-slate-300">
                    Direct silent printing is fully active. Receipts print instantly without any browser print popup or monthly subscription fees!
                  </p>
                </div>
              </div>
            ) : isElectron ? (
              <div className="p-4 bg-sky-950/40 border border-sky-500/40 rounded-xl flex items-start space-x-3 text-sky-300">
                <Zap className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5 flex-1">
                  <div className="font-bold text-white">Electron Desktop Silent Printing: ACTIVE</div>
                  <p className="text-slate-300">
                    Running inside Zenexis Desktop App. Receipts print directly to your thermal printer silently.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-start space-x-3 text-amber-300">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1 flex-1">
                  <div className="font-bold text-white">Print Bridge Service Not Detected (Browser Dialog Mode Active)</div>
                  <p className="text-slate-300">
                    For 100% silent direct printing without browser print dialogs, run <span className="text-sky-400 font-mono font-bold">start-bridge.bat</span> in the <span className="text-sky-400 font-mono">print-bridge/</span> folder on this PC.
                  </p>
                </div>
              </div>
            )}

            {/* Target Printer Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Target Thermal Printer Device
              </label>
              <div className="flex space-x-2">
                <select
                  value={selectedPrinter}
                  onChange={(e) => setSelectedPrinter(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono font-semibold"
                >
                  <option value="">-- Windows Default Printer --</option>
                  {availablePrinters.map((p, idx) => (
                    <option key={idx} value={p.name}>
                      {p.name} {p.isDefault ? '(Default)' : ''} {p.port ? `[${p.port}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Select your thermal printer (e.g. Xprinter XP-80, POS-58, EPSON TM-T88, etc.).
              </p>
            </div>

            {/* Paper Width Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Thermal Roll Paper Width
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPrinterType('80mm')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    printerType === '80mm'
                      ? 'bg-sky-950/60 border-sky-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">80mm Roll (Standard POS)</div>
                    <div className="text-[10px] text-slate-400">76mm printable width • Best for detailed receipts</div>
                  </div>
                  {printerType === '80mm' && <Check className="w-4 h-4 text-sky-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setPrinterType('58mm')}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                    printerType === '58mm'
                      ? 'bg-sky-950/60 border-sky-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">58mm Roll (Compact / Mobile)</div>
                    <div className="text-[10px] text-slate-400">54mm printable width • Portable POS size</div>
                  </div>
                  {printerType === '58mm' && <Check className="w-4 h-4 text-sky-400" />}
                </button>
              </div>
            </div>

            {/* Automation Options */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700"
                />
                <span>Automatically trigger silent thermal print upon checkout payment</span>
              </label>

              <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCutPaper}
                  onChange={(e) => setAutoCutPaper(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700"
                />
                <span>Send ESC/POS Auto-Cut Paper signal after each receipt</span>
              </label>

              <label className="flex items-center space-x-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={openCashDrawerOnSale}
                  onChange={(e) => setOpenCashDrawerOnSale(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-950 border-slate-700"
                />
                <span>Kick RJ11 Cash Drawer open automatically on cash payments</span>
              </label>
            </div>
          </div>

          {/* Hardware Testing Section */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Instant Hardware Diagnostics & Test</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestingPrint}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow"
              >
                <Printer className="w-4 h-4 text-sky-400" />
                <span>{isTestingPrint ? 'Sending Test...' : 'Print Test Receipt Ticket'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestDrawer}
                disabled={isTestingDrawer}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition shadow"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{isTestingDrawer ? 'Kicking Drawer...' : 'Test Cash Drawer Kick'}</span>
              </button>
            </div>
          </div>

          {/* Free Setup Instructions Box */}
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>How to Use Zenexis Free Print Bridge (Zero Cost Forever)</span>
            </h4>
            <div className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                <strong className="text-white">1. Start Local Bridge:</strong> Open the <span className="font-mono text-sky-300">print-bridge</span> folder and double click <span className="font-mono text-emerald-400">start-bridge.bat</span>.
              </p>
              <p>
                <strong className="text-white">2. Automatic Windows Boot:</strong> Run <span className="font-mono text-sky-300">install-autostart.bat</span> once so it starts silently every time your PC turns on.
              </p>
              <p>
                <strong className="text-white">3. 100% Free Forever:</strong> No PrintBridge license keys, no monthly fees, and no third-party cloud dependence.
              </p>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
            >
              <Save className="w-4 h-4" />
              <span>Save Thermal Printer Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PIN Security */}
      {activeTab === 'security' && (
        <form onSubmit={handleUpdatePins} className="flex-1 overflow-y-auto space-y-4 max-w-xl">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Change Staff 4-Digit PIN Codes</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">New Owner Admin PIN</label>
              <input
                type="password"
                maxLength={4}
                value={ownerPin}
                onChange={(e) => setOwnerPin(e.target.value)}
                placeholder="Enter 4 digits (Leave blank to keep unchanged)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">New Cashier Staff PIN</label>
              <input
                type="password"
                maxLength={4}
                value={cashierPin}
                onChange={(e) => setCashierPin(e.target.value)}
                placeholder="Enter 4 digits (Leave blank to keep unchanged)"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow"
            >
              Update Security PINs
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="flex-1 overflow-y-auto space-y-4 max-w-2xl">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Offline Database Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-400">
              Export your full database (sales, stock, repairs, employees, suppliers) to a JSON file for USB drive backup or restore.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {/* Export */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Create Full JSON Backup</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Saves all tables to an offline JSON backup file</p>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Backup File</span>
                </button>
              </div>

              {/* Import */}
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white">Restore from JSON File</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Load and overwrite current database with a backup file</p>
                </div>
                <label className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Select Backup File to Restore</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Security Audit Logs */}
      {activeTab === 'audit' && (
        <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold sticky top-0">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">User / Cashier</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {auditLogs && auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850">
                    <td className="py-2.5 px-4 text-slate-400">{formatDateTime(log.timestamp)}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{log.userName}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{log.details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-slate-500">
                    No security audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
