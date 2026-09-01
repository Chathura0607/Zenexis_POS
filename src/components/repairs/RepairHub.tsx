import React, { useState } from 'react';
import { RepairJob, RepairJobType, RepairStatus, AppSettings } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { createRepairJob, updateRepairStatus, generateCustomerWhatsAppMessage } from '../../services/repairService';
import { formatCurrency, formatDateTime, triggerThermalPrint } from '../../services/printService';
import { RepairToken80mm } from '../print/RepairToken80mm';
import {
  Wrench,
  Smartphone,
  Laptop,
  Camera,
  Coffee,
  Stamp,
  Gift,
  Plus,
  Search,
  MessageCircle,
  Printer,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  AlertCircle
} from 'lucide-react';

export const RepairHub: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState<boolean>(false);
  const [selectedJobForPrint, setSelectedJobForPrint] = useState<RepairJob | null>(null);

  const jobs = useLiveQuery(() => db.repairJobs.orderBy('receivedDate').reverse().toArray());
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  // Form State for New Ticket
  const [jobType, setJobType] = useState<RepairJobType>('mobile_repair');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deviceOrItemName, setDeviceOrItemName] = useState<string>('');
  const [brandModel, setBrandModel] = useState<string>('');
  const [serialOrImei, setSerialOrImei] = useState<string>('');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [accessoriesReceived, setAccessoriesReceived] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<number>(1500);
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [technicianName, setTechnicianName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const filteredJobs = jobs?.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      job.ticketNumber.toLowerCase().includes(q) ||
      job.customerName.toLowerCase().includes(q) ||
      job.customerPhone.includes(q) ||
      job.deviceOrItemName.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !deviceOrItemName.trim()) {
      setErrorMsg('Please fill in customer name, phone and item name');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const res = await createRepairJob({
      jobType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      deviceOrItemName: deviceOrItemName.trim(),
      brandModel: brandModel.trim() || undefined,
      serialOrImei: serialOrImei.trim() || undefined,
      problemDescription: problemDescription.trim() || 'General service / print request',
      accessoriesReceived: accessoriesReceived.trim() || undefined,
      estimatedCost,
      advancePaid,
      technicianName: technicianName.trim() || undefined,
      status: 'Received',
    });

    setIsSubmitting(false);

    if (res.success && res.job) {
      setSelectedJobForPrint(res.job);
      setIsNewTicketOpen(false);
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setDeviceOrItemName('');
      setBrandModel('');
      setSerialOrImei('');
      setProblemDescription('');
      setAccessoriesReceived('');
      setEstimatedCost(1500);
      setAdvancePaid(0);

      // Auto-trigger print
      setTimeout(() => {
        triggerThermalPrint('repair-token-area');
      }, 200);
    } else {
      setErrorMsg(res.error || 'Failed to create job ticket');
    }
  };

  const handleStatusChange = async (jobId: string, newStatus: RepairStatus) => {
    await updateRepairStatus(jobId, newStatus);
  };

  const handlePrintToken = (job: RepairJob) => {
    setSelectedJobForPrint(job);
    setTimeout(() => {
      triggerThermalPrint('repair-token-area');
    }, 200);
  };

  const handleSendWhatsApp = (job: RepairJob) => {
    const rawPhone = job.customerPhone.replace(/[^0-9]/g, '');
    const internationalPhone = rawPhone.startsWith('0') ? `94${rawPhone.slice(1)}` : rawPhone.startsWith('94') ? rawPhone : `94${rawPhone}`;
    const message = generateCustomerWhatsAppMessage(job, settings);
    window.open(`https://wa.me/${internationalPhone}?text=${message}`, '_blank');
  };

  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'Received':
        return <span className="px-2.5 py-1 bg-sky-950/60 text-sky-400 border border-sky-800/50 rounded-lg text-xs font-bold">Received</span>;
      case 'Diagnosing':
      case 'In_Progress':
        return <span className="px-2.5 py-1 bg-amber-950/60 text-amber-400 border border-amber-800/50 rounded-lg text-xs font-bold">In Progress</span>;
      case 'Ready':
        return <span className="px-2.5 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-500/50 rounded-lg text-xs font-bold animate-pulse">Ready for Pickup</span>;
      case 'Delivered':
        return <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs font-medium">Delivered / Done</span>;
      case 'Cancelled':
        return <span className="px-2.5 py-1 bg-rose-950/60 text-rose-400 border border-rose-800/50 rounded-lg text-xs font-bold">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden">
      {/* Hidden Print Container */}
      <div id="repair-token-print-area" className="hidden">
        {selectedJobForPrint && (
          <RepairToken80mm job={selectedJobForPrint} settings={settings} />
        )}
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-sky-400" />
            <span>Repairs & Custom Service Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage Mobile/PC repairs, custom Mug printing, Rubber seals & Photo lab orders
          </p>
        </div>

        <button
          onClick={() => setIsNewTicketOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Service / Repair Ticket</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Ticket # (e.g. ZX-MOB-1001), Customer Name, Phone, or Device..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl space-x-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'Received', label: 'Received' },
            { id: 'In_Progress', label: 'In Progress' },
            { id: 'Ready', label: 'Ready' },
            { id: 'Delivered', label: 'Delivered' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                statusFilter === st.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Table / Cards */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredJobs && filteredJobs.length > 0 ? (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Ticket Info */}
                <div className="flex items-start space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                    {job.jobType === 'mobile_repair' && <Smartphone className="w-5 h-5" />}
                    {job.jobType === 'pc_repair' && <Laptop className="w-5 h-5" />}
                    {job.jobType === 'mug_print' && <Coffee className="w-5 h-5" />}
                    {job.jobType === 'rubber_seal' && <Stamp className="w-5 h-5" />}
                    {job.jobType === 'photo_print' && <Camera className="w-5 h-5" />}
                    {job.jobType === 'custom_gift' && <Gift className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-extrabold text-sm text-sky-400">{job.ticketNumber}</span>
                      {getStatusBadge(job.status)}
                    </div>

                    <h4 className="text-sm font-bold text-white mt-1">
                      {job.deviceOrItemName} {job.brandModel ? `(${job.brandModel})` : ''}
                    </h4>

                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      <span className="text-slate-500">Problem:</span> {job.problemDescription}
                    </p>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-2">
                      <span>Customer: <strong className="text-slate-300">{job.customerName}</strong> ({job.customerPhone})</span>
                      <span>•</span>
                      <span>Received: {formatDateTime(job.receivedDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Financial & Action Controls */}
                <div className="flex items-center space-x-4 self-end md:self-center shrink-0">
                  {/* Financials */}
                  <div className="text-right bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase">Est. Total / Balance</span>
                    <p className="text-xs font-mono font-medium text-slate-300">
                      Rs. {job.estimatedCost.toLocaleString()} (Adv: Rs. {job.advancePaid.toLocaleString()})
                    </p>
                    <p className="text-sm font-mono font-extrabold text-emerald-400">
                      Due: Rs. {job.balanceDue.toLocaleString()}
                    </p>
                  </div>

                  {/* Status Dropdown */}
                  <select
                    value={job.status}
                    onChange={(e) => handleStatusChange(job.id, e.target.value as RepairStatus)}
                    className="bg-slate-950 border border-slate-700 text-xs text-slate-200 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
                  >
                    <option value="Received">Received</option>
                    <option value="In_Progress">In Progress</option>
                    <option value="Ready">Ready for Pickup</option>
                    <option value="Delivered">Delivered & Closed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {/* WhatsApp Notify */}
                  <button
                    onClick={() => handleSendWhatsApp(job)}
                    className="p-2.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 transition"
                    title="Send WhatsApp Update to Customer"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  {/* Print 80mm Token */}
                  <button
                    onClick={() => handlePrintToken(job)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                    title="Print 80mm Thermal Job Token"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
            <Wrench className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
            <p className="text-sm font-medium">No service or repair tickets found</p>
            <p className="text-xs text-slate-600 mt-1">Click "New Service / Repair Ticket" to intake a job</p>
          </div>
        )}
      </div>

      {/* New Job Modal */}
      {isNewTicketOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Service Ticket</h3>
                  <p className="text-xs text-slate-400">Mobile, PC, Mug print, Rubber seal, or Photo lab job</p>
                </div>
              </div>
              <button onClick={() => setIsNewTicketOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-4">
              {/* Job Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Service Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mobile_repair', label: 'Mobile Phone Repair', icon: Smartphone },
                    { id: 'pc_repair', label: 'Computer / Laptop Repair', icon: Laptop },
                    { id: 'mug_print', label: 'Mug & Sublimation', icon: Coffee },
                    { id: 'rubber_seal', label: 'Rubber Seal Making', icon: Stamp },
                    { id: 'photo_print', label: 'Photo Studio Print', icon: Camera },
                    { id: 'custom_gift', label: 'Custom Gift Engraving', icon: Gift },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setJobType(t.id as any)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center space-x-2 ${
                          jobType === t.id
                            ? 'bg-sky-600/20 border-sky-500 text-white shadow'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kasun Fernando"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0771234567"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Item Details */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Item / Device Description *</label>
                  <input
                    type="text"
                    value={deviceOrItemName}
                    onChange={(e) => setDeviceOrItemName(e.target.value)}
                    placeholder="e.g. Samsung A14 5G or Round Flash Stamp"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Brand / Model / Stamp Title</label>
                  <input
                    type="text"
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    placeholder="e.g. SM-A146P or Director Stamp"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Serial / IMEI (If Applicable)</label>
                  <input
                    type="text"
                    value={serialOrImei}
                    onChange={(e) => setSerialOrImei(e.target.value)}
                    placeholder="e.g. 358912345678901"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Accessories Received</label>
                  <input
                    type="text"
                    value={accessoriesReceived}
                    onChange={(e) => setAccessoriesReceived(e.target.value)}
                    placeholder="e.g. Phone with back cover, no SIM"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Problem / Work Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Work / Problem Description *</label>
                <textarea
                  rows={2}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="e.g. Display blank, touch not responding. Need original display."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Estimated Cost & Advance */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Estimated Total Cost (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono text-base font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Advance Paid (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={advancePaid}
                    onChange={(e) => setAdvancePaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sky-400 font-mono text-base font-bold"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewTicketOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save Ticket & Print 80mm Token</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Thermal Printer Area for 80mm Repair Tokens */}
      <div className="hidden">
        <div id="repair-token-area">
          {selectedJobForPrint && (
            <RepairToken80mm job={selectedJobForPrint} settings={settings} />
          )}
        </div>
      </div>
    </div>
  );
};
