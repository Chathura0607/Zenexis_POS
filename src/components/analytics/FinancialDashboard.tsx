import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { computeFinancials, exportSalesReportToExcel, exportSalesReportToPDF } from '../../services/analyticsService';
import { formatCurrency } from '../../services/printService';
import {
  TrendingUp,
  DollarSign,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingBag
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const FinancialDashboard: React.FC = () => {
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('month');

  const allSales = useLiveQuery(() => db.sales.toArray());
  const allExpenses = useLiveQuery(() => db.expenses.toArray());
  const allProducts = useLiveQuery(() => db.products.toArray());

  // Filter by Date
  const filterDataByDate = () => {
    if (!allSales) return { sales: [], expenses: [] };

    const now = new Date();
    let startDate = new Date(0); // Epoch for 'all'

    if (dateFilter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (dateFilter === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const filteredSales = allSales.filter(s => new Date(s.timestamp) >= startDate);
    const filteredExpenses = (allExpenses || []).filter(e => new Date(e.timestamp) >= startDate);

    return { sales: filteredSales, expenses: filteredExpenses };
  };

  const { sales, expenses } = filterDataByDate();
  const summary = computeFinancials(sales, expenses);

  // Prepare Chart Data: Daily Sales vs Profit
  const dailyMap: Record<string, { date: string; revenue: number; profit: number }> = {};
  sales.forEach(sale => {
    const day = new Date(sale.timestamp).toLocaleDateString('en-LK', { month: 'short', day: 'numeric' });
    if (!dailyMap[day]) {
      dailyMap[day] = { date: day, revenue: 0, profit: 0 };
    }
    dailyMap[day].revenue += sale.netTotal;
    dailyMap[day].profit += sale.grossProfit;
  });
  const chartData = Object.values(dailyMap);

  // Category breakdown
  const categoryMap: Record<string, number> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      const cat = item.category || 'other';
      categoryMap[cat] = (categoryMap[cat] || 0) + item.total;
    });
  });
  const categoryChartData = Object.entries(categoryMap).map(([name, value]) => ({
    name: name.replace('_', ' ').toUpperCase(),
    value,
  }));

  // Top 5 selling items
  const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  sales.forEach(sale => {
    sale.items.forEach(item => {
      if (!productSalesMap[item.name]) {
        productSalesMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
      }
      productSalesMap[item.name].qty += item.qty;
      productSalesMap[item.name].revenue += item.total;
    });
  });
  const topSellingItems = Object.values(productSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 6);

  const COLORS = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-y-auto select-none">
      {/* Top Header & Export Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <span>Financial Analytics & Live Profit/Loss</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time calculations of buying vs selling margins, expenses, net profit & sales volume
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Date Filter Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl space-x-1">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setDateFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  dateFilter === f.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Export Excel */}
          <button
            onClick={() => exportSalesReportToExcel(sales, expenses)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            title="Download Excel Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel Export</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={() => exportSalesReportToPDF(sales, expenses)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
            title="Download PDF Financial Report"
          >
            <FileText className="w-4 h-4 text-rose-400" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Gross Revenue (Sales)</span>
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-black text-white mt-3">{formatCurrency(summary.totalRevenue)}</p>
          <span className="text-[11px] text-slate-500 mt-1">Across {summary.totalInvoices} customer invoices</span>
        </div>

        {/* Cost of Goods Sold */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Cost of Goods (COGS)</span>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-black text-slate-300 mt-3">{formatCurrency(summary.totalCostOfGoods)}</p>
          <span className="text-[11px] text-slate-500 mt-1">Direct product & material costs</span>
        </div>

        {/* Gross Profit */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Gross Profit</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-mono font-black text-emerald-400 mt-3">{formatCurrency(summary.grossProfit)}</p>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-400 mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Margin: {summary.grossMarginPct.toFixed(1)}%</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 p-4 rounded-2xl flex flex-col justify-between shadow-lg shadow-indigo-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 uppercase">Net Profit (After Expenses)</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-mono font-black mt-3 ${summary.netProfit >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
            {formatCurrency(summary.netProfit)}
          </p>
          <span className="text-[11px] text-slate-400 mt-1">
            Expenses deducted: {formatCurrency(summary.totalExpenses)}
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sales & Profit Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>Sales Revenue vs Gross Profit Over Time</span>
          </h3>

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                  />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" name="Gross Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No transaction data for chart visualization
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Category Sales Share */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Category Revenue Breakdown</span>
          </h3>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                    formatter={(value: any) => [`Rs. ${Number(value).toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No category sales recorded yet</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800 text-[10px]">
            {categoryChartData.slice(0, 4).map((c, i) => (
              <span key={i} className="flex items-center space-x-1 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                <span>{c.name}: Rs.{c.value.toLocaleString()}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Top 6 Best Selling Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Top High-Velocity Selling Items</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase">
              <tr>
                <th className="py-2 px-3">Item / Service Name</th>
                <th className="py-2 px-3 text-center">Units Sold</th>
                <th className="py-2 px-3 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {topSellingItems && topSellingItems.length > 0 ? (
                topSellingItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-850">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-sky-400 flex items-center justify-center text-[10px] font-mono">
                        {idx + 1}
                      </span>
                      <span>{item.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">
                      {item.qty}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(item.revenue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-slate-500">
                    No sales recorded for the selected period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
