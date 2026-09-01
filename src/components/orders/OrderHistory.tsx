import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sale } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { refundSale } from '../../services/posService';
import { formatCurrency, formatDateTime, triggerThermalPrint, exportSingleSaleToPDF } from '../../services/printService';
import { ThermalReceipt80mm } from '../print/ThermalReceipt80mm';
import {
  Receipt,
  Search,
  Calendar,
  CreditCard,
  Banknote,
  Building,
  Layers,
  ChevronLeft,
  ChevronRight,
  Printer,
  FileText,
  RotateCcw,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  ShoppingBag,
  TrendingUp,
  Tag,
  ArrowUpDown,
  Filter,
  DollarSign
} from 'lucide-react';

export const OrderHistory: React.FC = () => {
  const { currentUser, isOwner } = useAuth();
  const settings = useLiveQuery(() => db.settings.toCollection().first());
  const allSales = useLiveQuery(() => db.sales.orderBy('timestamp').reverse().toArray());
  const allEmployees = useLiveQuery(() => db.employees.toArray());

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');

  // Selected Order for One-by-One Inspection
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showThermalPreview, setShowThermalPreview] = useState<boolean>(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('Customer returned goods');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string>('');

  const listContainerRef = useRef<HTMLDivElement | null>(null);

  // Filter Sales Logic
  const filteredSales = useMemo(() => {
    if (!allSales) return [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allSales.filter((sale) => {
      // Date filter
      const saleDate = new Date(sale.timestamp);
      if (dateFilter === 'today' && saleDate < startOfToday) return false;
      if (dateFilter === 'yesterday' && (saleDate < startOfYesterday || saleDate >= startOfToday)) return false;
      if (dateFilter === 'week' && saleDate < startOfWeek) return false;
      if (dateFilter === 'month' && saleDate < startOfMonth) return false;

      // Payment filter
      if (paymentFilter !== 'all' && sale.paymentMethod !== paymentFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && sale.status !== statusFilter) return false;

      // Cashier filter
      if (cashierFilter !== 'all' && sale.cashierId !== cashierFilter) return false;

      // Search term filter (Invoice #, Customer Name, Phone, Item names, Cashier)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesInvoice = sale.invoiceNumber.toLowerCase().includes(query);
        const matchesCustomer = sale.customerName?.toLowerCase().includes(query) || false;
        const matchesPhone = sale.customerPhone?.toLowerCase().includes(query) || false;
        const matchesCashier = sale.cashierName.toLowerCase().includes(query);
        const matchesItems = sale.items.some((item) => item.name.toLowerCase().includes(query));
        if (!matchesInvoice && !matchesCustomer && !matchesPhone && !matchesCashier && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [allSales, dateFilter, paymentFilter, statusFilter, cashierFilter, searchTerm]);

  // Set default selected order
  useEffect(() => {
    if (filteredSales.length > 0) {
      if (!selectedSaleId || !filteredSales.some((s) => s.id === selectedSaleId)) {
        setSelectedSaleId(filteredSales[0].id);
      }
    } else {
      setSelectedSaleId(null);
    }
  }, [filteredSales, selectedSaleId]);

  // Find currently selected order and its index
  const selectedIndex = filteredSales.findIndex((s) => s.id === selectedSaleId);
  const selectedSale = selectedIndex >= 0 ? filteredSales[selectedIndex] : null;

  // Stepper functions for One-by-One viewing
  const handlePreviousOrder = () => {
    if (selectedIndex > 0) {
      setSelectedSaleId(filteredSales[selectedIndex - 1].id);
    }
  };

  const handleNextOrder = () => {
    if (selectedIndex < filteredSales.length - 1) {
      setSelectedSaleId(filteredSales[selectedIndex + 1].id);
    }
  };

  // Keyboard navigation for One-by-One browsing (Up / Down / Left / Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePreviousOrder();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextOrder();
      } else if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePrintThermal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredSales]);

  // Print Thermal Bill
  const handlePrintThermal = () => {
    if (!selectedSale) return;
    triggerThermalPrint('order-history-thermal-print');
  };

  // Download PDF Invoice
  const handleDownloadPDF = () => {
    if (!selectedSale) return;
    exportSingleSaleToPDF(selectedSale, settings);
  };

  // Process Refund
  const handleConfirmRefund = async () => {
    if (!selectedSale) return;

    if (!isOwner && currentUser?.role !== 'owner') {
      setRefundError('Permission Denied: Only Shop Owner / Manager can process sales refunds.');
      return;
    }

    setIsRefunding(true);
    setRefundError('');

    try {
      const res = await refundSale(
        selectedSale.id,
        `${refundReason}${refundNotes ? `: ${refundNotes}` : ''}`,
        currentUser?.id || 'emp_owner_1',
        currentUser?.name || 'Staff'
      );

      if (res.success) {
        setIsRefundModalOpen(false);
        setRefundNotes('');
      } else {
        setRefundError(res.error || 'Failed to refund order');
      }
    } catch (err: any) {
      setRefundError(err.message || 'Refund error occurred');
    } finally {
      setIsRefunding(false);
    }
  };

  // Overall Statistics from filtered sales
  const stats = useMemo(() => {
    const totalCount = filteredSales.length;
    const completedSales = filteredSales.filter((s) => s.status === 'Completed');
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.netTotal, 0);
    const totalProfit = completedSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const avgTicket = completedSales.length > 0 ? totalRevenue / completedSales.length : 0;
    const cashTotal = completedSales.filter((s) => s.paymentMethod === 'Cash').reduce((sum, s) => sum + s.netTotal, 0);
    const cardTotal = completedSales.filter((s) => s.paymentMethod === 'Card').reduce((sum, s) => sum + s.netTotal, 0);
    const transferTotal = completedSales.filter((s) => s.paymentMethod === 'Bank_Transfer').reduce((sum, s) => sum + s.netTotal, 0);
    const refundedCount = filteredSales.filter((s) => s.status === 'Refunded').length;

    return {
      totalCount,
      totalRevenue,
      totalProfit,
      avgTicket,
      cashTotal,
      cardTotal,
      transferTotal,
      refundedCount,
    };
  }, [filteredSales]);

  const getPaymentIcon = (method: Sale['paymentMethod']) => {
    switch (method) {
      case 'Cash': return <Banknote className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Card': return <CreditCard className="w-3.5 h-3.5 text-sky-400" />;
      case 'Bank_Transfer': return <Building className="w-3.5 h-3.5 text-purple-400" />;
      case 'Split': return <Layers className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Hidden print element for direct thermal printing */}
      <div id="order-history-thermal-print" className="hidden">
        {selectedSale && <ThermalReceipt80mm sale={selectedSale} settings={settings} />}
      </div>

      {/* Top Banner with Stats */}
      <div className="bg-slate-900/80 border-b border-slate-800 p-4 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <span>Order History & Invoices</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                    {stats.totalCount} {stats.totalCount === 1 ? 'Order' : 'Orders'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Inspect sales invoices one-by-one, reprint receipts, issue refunds & track cashier turnover
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
            {/* Total Revenue */}
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Revenue</p>
                <p className="text-sm font-mono font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center space-x-2.5 shrink-0">
              <div className="w-2 h-2 rounded-full bg-sky-400"></div>
              <div>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Avg Order</p>
                <p className="text-sm font-mono font-bold text-slate-200">{formatCurrency(stats.avgTicket)}</p>
              </div>
            </div>

            {/* Owner Only: Profit */}
            {isOwner && (
              <div className="bg-gradient-to-r from-slate-950/80 to-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center space-x-2.5 shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Gross Profit</p>
                  <p className="text-sm font-mono font-bold text-emerald-300">{formatCurrency(stats.totalProfit)}</p>
                </div>
              </div>
            )}

            {/* Payment method breakdown pill */}
            <div className="bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center space-x-3 shrink-0 text-slate-300">
              <span className="flex items-center space-x-1" title="Cash Total">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono text-xs">{formatCurrency(stats.cashTotal)}</span>
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center space-x-1" title="Card Total">
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono text-xs">{formatCurrency(stats.cardTotal)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Invoice #, customer phone, name, item or cashier..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Date Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 space-x-1">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  dateFilter === f.id
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Payment Method Selector */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="all">All Payments</option>
            <option value="Cash">Cash Only</option>
            <option value="Card">Card Only</option>
            <option value="Bank_Transfer">Bank Transfer</option>
            <option value="Split">Split Pay</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Completed">Completed</option>
            <option value="Refunded">Refunded</option>
          </select>

          {/* Cashier Filter */}
          {allEmployees && allEmployees.length > 0 && (
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-sky-500 focus:outline-none"
            >
              <option value="all">All Cashiers</option>
              {allEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Split Master-Detail Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Master Order List (Queue) */}
        <div
          ref={listContainerRef}
          className="w-80 md:w-96 bg-slate-900/40 border-r border-slate-800 flex flex-col h-full overflow-y-auto shrink-0 divide-y divide-slate-800/60"
        >
          {filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-full">
              <Receipt className="w-10 h-10 mb-2 text-slate-600 opacity-50" />
              <p className="text-xs font-semibold text-slate-400">No orders found</p>
              <p className="text-[11px] text-slate-500 mt-1">Try clearing your search or date filter</p>
            </div>
          ) : (
            filteredSales.map((sale) => {
              const isSelected = sale.id === selectedSaleId;
              const isRefunded = sale.status === 'Refunded';

              return (
                <div
                  key={sale.id}
                  onClick={() => setSelectedSaleId(sale.id)}
                  className={`p-3.5 cursor-pointer transition-all border-l-4 group relative ${
                    isSelected
                      ? 'bg-slate-800/90 border-l-sky-500 shadow-md shadow-sky-500/5'
                      : 'border-l-transparent hover:bg-slate-850 hover:border-l-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                          {sale.invoiceNumber}
                        </span>
                        {isRefunded ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                            REFUNDED
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 flex items-center space-x-1.5">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[170px] font-medium text-slate-300">
                          {sale.customerName || 'Walk-in Customer'}
                        </span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`text-sm font-mono font-black ${
                          isRefunded ? 'text-rose-400 line-through' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(sale.netTotal)}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {sale.itemCount} {sale.itemCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-slate-600">•</span>
                      <span>{new Date(sale.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                    </span>

                    <span className="flex items-center space-x-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800 font-medium">
                      {getPaymentIcon(sale.paymentMethod)}
                      <span>{sale.paymentMethod.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT COLUMN: Detailed One-by-One Order Inspector */}
        <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 md:p-6 space-y-4">
          {selectedSale ? (
            <>
              {/* Stepper & Action Controls Bar */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                {/* One-by-One Stepper Navigation */}
                <div className="flex items-center space-x-2">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 space-x-1">
                    <button
                      onClick={handlePreviousOrder}
                      disabled={selectedIndex <= 0}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center space-x-1"
                      title="Previous Order (Left Arrow / Up Arrow)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-xs font-bold hidden md:inline">Prev</span>
                    </button>
                    <div className="px-2.5 py-1 text-xs font-mono text-slate-400">
                      <span className="text-white font-bold">{selectedIndex + 1}</span> of{' '}
                      <span className="text-slate-400">{filteredSales.length}</span>
                    </div>
                    <button
                      onClick={handleNextOrder}
                      disabled={selectedIndex >= filteredSales.length - 1}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition flex items-center space-x-1"
                      title="Next Order (Right Arrow / Down Arrow)"
                    >
                      <span className="text-xs font-bold hidden md:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 hidden lg:inline font-mono">
                    Use [← / →] arrows to browse one-by-one
                  </span>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center space-x-2">
                  {/* Thermal Receipt Preview Toggle */}
                  <button
                    onClick={() => setShowThermalPreview(!showThermalPreview)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                      showThermalPreview
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-750'
                    }`}
                    title="Toggle Thermal Receipt Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showThermalPreview ? 'Hide Receipt' : 'Receipt View'}</span>
                  </button>

                  {/* PDF Download */}
                  <button
                    onClick={handleDownloadPDF}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                    title="Download A4 PDF Invoice"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span>PDF</span>
                  </button>

                  {/* Thermal Reprint */}
                  <button
                    onClick={handlePrintThermal}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/30 transition flex items-center space-x-1.5"
                    title="Reprint on 80mm Thermal Printer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Reprint Bill</span>
                  </button>

                  {/* Refund Button */}
                  {selectedSale.status !== 'Refunded' && (
                    <button
                      onClick={() => setIsRefundModalOpen(true)}
                      className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                      title="Issue Refund and Restock items"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Refund</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Top Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1: Invoice Header */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Invoice Ref</span>
                    {selectedSale.status === 'Refunded' ? (
                      <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>REFUNDED</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>COMPLETED</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-mono font-black text-white">{selectedSale.invoiceNumber}</p>
                  <p className="text-xs text-slate-400 flex items-center space-x-1.5 pt-1">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>{formatDateTime(selectedSale.timestamp)}</span>
                  </p>
                </div>

                {/* Card 2: Cashier & Shift */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Issued By</span>
                  <div className="flex items-center space-x-2.5 pt-0.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                      {selectedSale.cashierName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{selectedSale.cashierName}</p>
                      <p className="text-[10px] text-slate-400">
                        {selectedSale.shiftId ? `Shift Register Active` : 'General Terminal'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center space-x-1 text-xs text-slate-300">
                    <span className="text-slate-400">Payment:</span>
                    <span className="font-bold text-sky-400 flex items-center space-x-1">
                      {getPaymentIcon(selectedSale.paymentMethod)}
                      <span>{selectedSale.paymentMethod.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>

                {/* Card 3: Customer Details */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer Info</span>
                  <p className="text-xs font-bold text-white flex items-center space-x-1.5 pt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{selectedSale.customerName || 'Walk-in Customer'}</span>
                  </p>
                  {selectedSale.customerPhone ? (
                    <p className="text-xs text-slate-300 font-mono flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedSale.customerPhone}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">No phone attached</p>
                  )}
                  {selectedSale.notes && (
                    <p className="text-[11px] text-slate-400 bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 truncate">
                      Notes: {selectedSale.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Thermal Receipt Visual Preview (Collapsible) */}
              {showThermalPreview && (
                <div className="bg-slate-900 border border-purple-500/30 p-5 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-2xl">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-2">
                      <Printer className="w-4 h-4 text-purple-400" />
                      <span>Exact 80mm Thermal Receipt Layout Preview</span>
                    </h4>
                    <button
                      onClick={() => setShowThermalPreview(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl flex justify-center overflow-x-auto">
                    <div className="shadow-2xl rounded-sm overflow-hidden bg-white">
                      <ThermalReceipt80mm sale={selectedSale} settings={settings} />
                    </div>
                  </div>
                </div>
              )}

              {/* Itemized Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 bg-slate-850/60 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-sky-400" />
                    <span>Order Items & Services ({selectedSale.items.length})</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-mono font-semibold">
                    Total Units: {selectedSale.itemCount}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase bg-slate-950/40">
                      <tr>
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Item / Service</th>
                        <th className="py-2.5 px-4">Category</th>
                        <th className="py-2.5 px-4 text-right">Unit Price</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Line Total</th>
                        {isOwner && <th className="py-2.5 px-4 text-right">Margin / Profit</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {selectedSale.items.map((item, i) => {
                        const lineProfit = item.total - (item.costPrice * item.qty);
                        const profitMargin = item.total > 0 ? (lineProfit / item.total) * 100 : 0;

                        return (
                          <tr key={i} className="hover:bg-slate-850/70 transition">
                            <td className="py-3 px-4 text-center font-mono text-slate-500">{i + 1}</td>
                            <td className="py-3 px-4">
                              <p className="font-bold text-white text-sm">{item.name}</p>
                              {item.discountAmount > 0 && (
                                <p className="text-[10px] text-emerald-400 font-medium">
                                  Discount: -Rs. {item.discountAmount.toFixed(2)}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase tracking-wider">
                                {(item.category || '').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-medium text-slate-300">
                              Rs. {item.unitPrice.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-center font-mono font-bold text-white">
                              <span className="px-2 py-0.5 bg-slate-800 rounded-md">{item.qty}</span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                              Rs. {item.total.toFixed(2)}
                            </td>
                            {isOwner && (
                              <td className="py-3 px-4 text-right font-mono">
                                <span className="text-slate-300 font-bold">Rs. {lineProfit.toFixed(2)}</span>
                                <span className="text-[10px] text-emerald-400 block font-medium">
                                  ({profitMargin.toFixed(0)}%)
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Financial & Payment Breakdown Card */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Payment Method Details */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment Method & Tender
                  </h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-slate-400">Payment Type:</span>
                      <span className="font-bold text-white flex items-center space-x-1.5">
                        {getPaymentIcon(selectedSale.paymentMethod)}
                        <span>{selectedSale.paymentMethod.replace('_', ' ')}</span>
                      </span>
                    </div>

                    {selectedSale.paymentMethod === 'Cash' && selectedSale.cashReceived !== undefined && (
                      <>
                        <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                          <span className="text-slate-400">Cash Tendered:</span>
                          <span className="font-bold text-slate-200">Rs. {selectedSale.cashReceived.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 font-mono">
                          <span className="text-slate-400">Change Returned:</span>
                          <span className="font-bold text-emerald-400">
                            Rs. {(selectedSale.balanceChange || 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}

                    {selectedSale.paymentMethod === 'Split' && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono">
                        <div className="flex justify-between text-slate-300">
                          <span>Cash Portion:</span>
                          <span>Rs. {(selectedSale.cashReceived || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Card Portion:</span>
                          <span>Rs. {(selectedSale.cardAmount || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Bank Transfer Portion:</span>
                          <span>Rs. {(selectedSale.transferAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Totals Calculation Summary */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Financial Summary
                  </h4>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Subtotal ({selectedSale.itemCount} items):</span>
                      <span className="font-mono text-slate-200">Rs. {selectedSale.subtotal.toFixed(2)}</span>
                    </div>

                    {selectedSale.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-medium">
                        <span>
                          Invoice Discount (
                          {selectedSale.discountType === 'percentage'
                            ? `${selectedSale.discountValue}%`
                            : 'Fixed Amount'}
                          ):
                        </span>
                        <span className="font-mono">-Rs. {selectedSale.discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                      <span className="text-sm font-bold text-white">Net Total:</span>
                      <span
                        className={`text-2xl font-mono font-black ${
                          selectedSale.status === 'Refunded' ? 'text-rose-400 line-through' : 'text-emerald-400'
                        }`}
                      >
                        {formatCurrency(selectedSale.netTotal)}
                      </span>
                    </div>

                    {isOwner && (
                      <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                        <span className="text-slate-400">Cost: Rs. {(selectedSale.costTotal || 0).toFixed(2)}</span>
                        <span className="font-mono font-bold text-indigo-300">
                          Gross Margin: Rs. {(selectedSale.grossProfit || 0).toFixed(2)} (
                          {selectedSale.netTotal > 0
                            ? ((selectedSale.grossProfit / selectedSale.netTotal) * 100).toFixed(1)
                            : 0}
                          %)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-20">
              <Receipt className="w-12 h-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-slate-300">No Order Selected</h3>
              <p className="text-xs text-slate-400 mt-1">Select an order from the list on the left to view full details</p>
            </div>
          )}
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {isRefundModalOpen && selectedSale && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Refund / Void Order</h3>
                  <p className="text-xs text-slate-400 font-mono">Invoice: {selectedSale.invoiceNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {refundError && (
              <div className="mt-3 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl text-xs text-rose-300">
                {refundError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">Refund Amount:</span>
                <span className="text-xl font-mono font-black text-rose-400">
                  {formatCurrency(selectedSale.netTotal)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Select Refund Reason
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="Customer returned goods">Customer returned goods / exchange</option>
                  <option value="Defective / Damaged item">Defective / Damaged print or item</option>
                  <option value="Wrong billing / Cashier error">Wrong billing / Cashier mistake</option>
                  <option value="Order cancelled by customer">Order cancelled by customer</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Remarks / Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={refundNotes}
                  onChange={(e) => setRefundNotes(e.target.value)}
                  placeholder="e.g. Broken screen guard replaced or cash returned to customer"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 space-y-1">
                <p className="font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Automatic Actions on Refund:</span>
                </p>
                <ul className="list-disc pl-5 text-[10px] text-amber-200/80 space-y-0.5">
                  <li>Physical product stock quantities will be restored back to inventory.</li>
                  <li>Shift register sales balance will be adjusted accordingly.</li>
                  <li>Customer total spent & loyalty points will be updated.</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30 transition disabled:opacity-50 flex items-center space-x-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRefunding ? 'Refunding...' : 'Confirm Refund & Restock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
