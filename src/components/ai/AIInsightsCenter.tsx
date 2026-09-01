import React, { useState } from 'react';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  generateSmartRestockPredictions,
  generateRepairEstimate,
  generateDailyExecutiveSummary
} from '../../services/aiService';
import { formatCurrency } from '../../services/printService';
import {
  Sparkles,
  AlertTriangle,
  Wrench,
  TrendingUp,
  Brain,
  Package,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const AIInsightsCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'restock' | 'diagnostics' | 'summary'>('restock');

  // Diagnostic state
  const [deviceType, setDeviceType] = useState<string>('mobile');
  const [faultText, setFaultText] = useState<string>('Display touch not working after water drop');
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const products = useLiveQuery(() => db.products.toArray());
  const sales = useLiveQuery(() => db.sales.toArray());
  const repairs = useLiveQuery(() => db.repairJobs.toArray());
  const expenses = useLiveQuery(() => db.expenses.toArray());

  const restockPredictions = (products && sales) ? generateSmartRestockPredictions(products, sales) : [];
  const totalExpenseToday = (expenses || []).reduce((sum, e) => sum + e.amount, 0);
  const dailySummary = (sales && repairs) ? generateDailyExecutiveSummary(sales, repairs, totalExpenseToday) : null;

  const handleRunDiagnostic = () => {
    if (!faultText.trim()) return;
    const res = generateRepairEstimate(deviceType, faultText);
    setDiagnosticResult(res);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            <span>AI Smart Intelligence Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Predictive stock demand velocity, technical repair diagnostics, and executive business summaries
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 shrink-0">
        <button
          onClick={() => setActiveTab('restock')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'restock' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>AI Restock Forecast ({restockPredictions.filter(p => p.urgency !== 'HEALTHY').length} Alerts)</span>
        </button>

        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'diagnostics' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>AI Repair & Quotation Helper</span>
        </button>

        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'summary' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Daily Executive Brief</span>
        </button>
      </div>

      {/* TAB 1: Smart Restock Predictions */}
      {activeTab === 'restock' && (
        <div className="flex-1 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restockPredictions.map((pred) => (
              <div
                key={pred.productId}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 ${
                  pred.urgency === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-500/5'
                    : pred.urgency === 'WARNING'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${
                      pred.urgency === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : pred.urgency === 'WARNING'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-emerald-950 text-emerald-300'
                    }`}>
                      {pred.urgency}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-300">
                      Stock: {pred.currentStock}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white mt-2 leading-snug">{pred.productName}</h4>
                  <p className="text-xs text-slate-400 mt-1">{pred.reason}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500">Runout ETA</span>
                    <p className="font-mono font-bold text-slate-200">
                      {pred.estimatedDaysLeft < 99 ? `~${pred.estimatedDaysLeft} Days` : 'Ample Stock'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500">AI Order Suggestion</span>
                    <p className="font-mono font-bold text-indigo-400">+{pred.recommendedOrderQty} Units</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: AI Repair Diagnostic Helper */}
      {activeTab === 'diagnostics' && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          <div className="w-1/2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>Smart Repair Diagnostic Assistant</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Device / Item Type</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="mobile">Mobile Phone / Tablet</option>
                <option value="pc">Laptop / Desktop Computer</option>
                <option value="mug">Mug Sublimation Customization</option>
                <option value="seal">Rubber Flash Seal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Describe Fault / Work Required</label>
              <textarea
                rows={3}
                value={faultText}
                onChange={(e) => setFaultText(e.target.value)}
                placeholder="e.g. Broken display, water damage, battery draining fast, Windows slow..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
              />
            </div>

            <button
              onClick={handleRunDiagnostic}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Diagnostic & Price Estimate</span>
            </button>
          </div>

          <div className="w-1/2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            {diagnosticResult ? (
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">AI Recommendation</span>
                  <h4 className="text-base font-bold text-white mt-0.5">Estimated Cost & Turnaround</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Suggested Quotation</span>
                    <p className="text-lg font-mono font-extrabold text-emerald-400 mt-0.5">
                      Rs. {diagnosticResult.suggestedMinCost.toLocaleString()} - {diagnosticResult.suggestedMaxCost.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Estimated Turnaround</span>
                    <p className="text-lg font-mono font-extrabold text-sky-400 mt-0.5">
                      ~{diagnosticResult.estimatedHours} Hours
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 uppercase">Technical Diagnostics:</span>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    {diagnosticResult.insights.map((ins: string, idx: number) => (
                      <li key={idx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                Enter fault description and click "Generate AI Diagnostic"
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Executive Summary */}
      {activeTab === 'summary' && dailySummary && (
        <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Daily Operational Brief for Zenexis</h3>
                <p className="text-xs text-slate-400">Polhena, Ambalangoda • Automated Intelligence</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase">Store Health Score</span>
              <p className="text-2xl font-mono font-black text-emerald-400">{dailySummary.healthScore} / 100</p>
            </div>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-2xl text-sm font-semibold text-indigo-200">
            {dailySummary.headline}
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key Highlights:</h4>
            <div className="space-y-2">
              {dailySummary.bulletPoints.map((pt, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
