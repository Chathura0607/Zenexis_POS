import React, { useState } from 'react';
import { Employee, Shift, SalaryPayment, UserRole, AppSettings } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { calculateMonthlyEmployeeSalary } from '../../services/payrollService';
import { formatCurrency, formatDateTime, triggerThermalPrint } from '../../services/printService';
import {
  Users,
  Plus,
  Wallet,
  Clock,
  CheckCircle2,
  Printer,
  ShieldCheck,
  X,
  AlertCircle,
  FileSpreadsheet,
  DollarSign
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { createEmployee } from '../../services/authService';

export const PayrollManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'employees' | 'payroll' | 'shifts'>('employees');

  // New Employee Modal State
  const [isNewEmpOpen, setIsNewEmpOpen] = useState<boolean>(false);
  const [empName, setEmpName] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empRole, setEmpRole] = useState<UserRole>('cashier');
  const [empPin, setEmpPin] = useState<string>('1234');
  const [empBasic, setEmpBasic] = useState<number>(35000);
  const [empComm, setEmpComm] = useState<number>(5);

  // Payroll Calculation State
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [computedPayroll, setComputedPayroll] = useState<{
    basicSalary: number;
    commissions: number;
    advances: number;
    netPayable: number;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const employees = useLiveQuery(() => db.employees.toArray());
  const shifts = useLiveQuery(() => db.shifts.orderBy('startTime').reverse().toArray());
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empPhone.trim() || empPin.length < 4) {
      setErrorMsg('Please enter employee name, phone and 4-digit PIN');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await createEmployee({
        name: empName,
        phone: empPhone,
        role: empRole,
        pin: empPin,
        basicSalary: Number(empBasic),
        commissionRate: Number(empComm),
        active: true,
      }, currentUser?.name || 'Admin');

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create employee');
        return;
      }

      setIsNewEmpOpen(false);
      setEmpName('');
      setEmpPhone('');
      setEmpPin('1234');
      setEmpBasic(35000);
      setEmpComm(5);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculatePayroll = async () => {
    if (!selectedEmpId) return;
    const res = await calculateMonthlyEmployeeSalary(selectedEmpId, selectedMonth);
    setComputedPayroll(res);
  };

  const handlePrintPayslip = () => {
    triggerThermalPrint('payslip-thermal-area');
  };

  const selectedEmployeeObj = employees?.find(e => e.id === selectedEmpId);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Hidden Payslip Thermal Print Area */}
      <div id="payslip-thermal-area" className="hidden">
        {selectedEmployeeObj && computedPayroll && (
          <div className="bg-white text-black p-2 font-mono text-[11px] leading-tight w-[76mm] mx-auto select-none border-b border-black border-dashed">
            <div className="text-center pb-2 border-b border-black border-dashed">
              <h1 className="text-base font-bold">{settings?.shopName || 'ZENEXIS'}</h1>
              <p className="text-[10px] uppercase font-bold">MONTHLY SALARY PAYSLIP</p>
              <p className="text-[9px]">{settings?.shopLocation || 'Polhena, Ambalangoda'}</p>
            </div>

            <div className="py-2 border-b border-black border-dashed space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Employee:</span>
                <span className="font-bold">{selectedEmployeeObj.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Role / Designation:</span>
                <span>{selectedEmployeeObj.role.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Salary Period:</span>
                <span className="font-bold">{selectedMonth}</span>
              </div>
            </div>

            <div className="py-2 border-b border-black border-dashed space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Basic Salary:</span>
                <span>Rs. {computedPayroll.basicSalary.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Commissions:</span>
                <span>+Rs. {computedPayroll.commissions.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Salary Advances Taken:</span>
                <span>-Rs. {computedPayroll.advances.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t border-black pt-1">
                <span>NET PAYABLE:</span>
                <span>Rs. {computedPayroll.netPayable.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 text-[9px] flex justify-between">
              <span>Employee Sign: _________</span>
              <span>Manager Sign: _________</span>
            </div>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>Staff & Payroll Management</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Staff directory, PIN codes, shift register audits, and monthly salary calculation
          </p>
        </div>

        <button
          onClick={() => setIsNewEmpOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 shrink-0">
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'employees' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employees ({employees?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'payroll' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Salary Calculator & Payslips</span>
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'shifts' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Shift History & Drawer Audits</span>
        </button>
      </div>

      {/* TAB 1: Employees Directory */}
      {activeTab === 'employees' && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees?.map((emp) => (
              <div key={emp.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                      emp.role === 'owner' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-sky-500/20 text-sky-400'
                    }`}>
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{emp.name}</h4>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        emp.role === 'owner' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-sky-950 text-sky-300'
                      }`}>
                        {emp.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span className="font-mono text-slate-200">{emp.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Login PIN:</span>
                    <span className="font-mono font-bold text-sky-400">•••• ({emp.pin})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Basic Monthly:</span>
                    <span className="font-mono font-bold text-emerald-400">{formatCurrency(emp.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Service Commission:</span>
                    <span className="font-mono font-bold text-purple-400">{emp.commissionRate}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Monthly Salary Calculator */}
      {activeTab === 'payroll' && (
        <div className="flex-1 flex gap-6 overflow-hidden">
          {/* Controls */}
          <div className="w-1/2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-sky-400" />
              <span>Calculate Monthly Salary</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Select Staff Member</label>
              <select
                value={selectedEmpId}
                onChange={(e) => { setSelectedEmpId(e.target.value); setComputedPayroll(null); }}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
              >
                <option value="">-- Choose Employee --</option>
                {employees?.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role.toUpperCase()})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Payroll Month (YYYY-MM)</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setComputedPayroll(null); }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono"
              />
            </div>

            <button
              onClick={handleCalculatePayroll}
              disabled={!selectedEmpId}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Calculate Net Salary Breakdown
            </button>
          </div>

          {/* Breakdown Preview */}
          <div className="w-1/2 bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
            {computedPayroll && selectedEmployeeObj ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedEmployeeObj.name}</h4>
                    <span className="text-xs text-slate-400">Month: {selectedMonth}</span>
                  </div>
                  <button
                    onClick={handlePrintPayslip}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Printer className="w-4 h-4 text-sky-400" />
                    <span>Print 80mm Payslip</span>
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300 bg-slate-950/60 p-2.5 rounded-xl">
                    <span>Basic Base Salary:</span>
                    <span className="font-mono font-bold text-white">{formatCurrency(computedPayroll.basicSalary)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 bg-slate-950/60 p-2.5 rounded-xl">
                    <span>Service Commissions ({selectedEmployeeObj.commissionRate}%):</span>
                    <span className="font-mono font-bold text-emerald-400">+{formatCurrency(computedPayroll.commissions)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 bg-slate-950/60 p-2.5 rounded-xl">
                    <span>Salary Advances Deducted:</span>
                    <span className="font-mono font-bold text-rose-400">-{formatCurrency(computedPayroll.advances)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-sky-950/40 border border-sky-500/40 p-3.5 rounded-xl">
                    <span className="text-xs font-bold uppercase text-sky-300">Net Payable Amount:</span>
                    <span className="text-xl font-mono font-black text-white">{formatCurrency(computedPayroll.netPayable)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                Select an employee and click "Calculate Net Salary Breakdown"
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Shift History */}
      {activeTab === 'shifts' && (
        <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold sticky top-0">
              <tr>
                <th className="py-3 px-4">Shift #</th>
                <th className="py-3 px-3">Cashier</th>
                <th className="py-3 px-3">Start Time</th>
                <th className="py-3 px-3 text-right">Opening Float</th>
                <th className="py-3 px-3 text-right">Cash Sales</th>
                <th className="py-3 px-3 text-right">Expected Drawer</th>
                <th className="py-3 px-3 text-right">Actual Counted</th>
                <th className="py-3 px-3 text-right">Variance</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {shifts && shifts.length > 0 ? (
                shifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{s.shiftNumber}</td>
                    <td className="py-3 px-3 font-bold text-white">{s.cashierName}</td>
                    <td className="py-3 px-3 text-slate-400">{formatDateTime(s.startTime)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-300">{formatCurrency(s.openingCash)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-400">{formatCurrency(s.cashSales)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">{formatCurrency(s.expectedCash)}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-200">
                      {s.actualCash !== undefined ? formatCurrency(s.actualCash) : '-'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      s.difference === undefined ? 'text-slate-500' : s.difference === 0 ? 'text-emerald-400' : s.difference > 0 ? 'text-sky-400' : 'text-rose-400'
                    }`}>
                      {s.difference !== undefined ? `${s.difference >= 0 ? '+' : ''}${formatCurrency(s.difference)}` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        s.status === 'Open'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 animate-pulse'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No shift register logs yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {isNewEmpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-sky-400" />
                <span>Add New Staff Member</span>
              </h3>
              <button onClick={() => setIsNewEmpOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Full Name *</label>
                <input
                  type="text"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Kasun Silva"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">User Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  >
                    <option value="cashier">Cashier (Staff)</option>
                    <option value="owner">Owner (Full Admin)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">4-Digit PIN Code *</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={empPin}
                    onChange={(e) => setEmpPin(e.target.value)}
                    placeholder="1234"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sky-400 font-mono text-xs font-bold text-center"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Basic Monthly (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    value={empBasic}
                    onChange={(e) => setEmpBasic(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Service Comm (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={empComm}
                    onChange={(e) => setEmpComm(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-purple-400 font-mono text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewEmpOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
