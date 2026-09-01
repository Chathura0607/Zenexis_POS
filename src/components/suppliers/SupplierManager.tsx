import React, { useState } from 'react';
import { Supplier, PurchaseOrder, PurchaseItem, Product } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { processStockInward } from '../../services/inventoryService';
import { formatCurrency, formatDateTime } from '../../services/printService';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  DollarSign,
  PackagePlus,
  CheckCircle2,
  X,
  AlertCircle,
  History,
  Trash2
} from 'lucide-react';

import { saveSupplier } from '../../services/supplierService';
import { useAuth } from '../../context/AuthContext';

export const SupplierManager: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isNewSupplierOpen, setIsNewSupplierOpen] = useState<boolean>(false);
  const [isStockInwardOpen, setIsStockInwardOpen] = useState<boolean>(false);

  // Supplier Form State
  const [supName, setSupName] = useState<string>('');
  const [supCompany, setSupCompany] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supEmail, setSupEmail] = useState<string>('');
  const [supAddress, setSupAddress] = useState<string>('');
  const [supNotes, setSupNotes] = useState<string>('');

  // Stock Inward Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>(`PO-${Date.now().toString().slice(-6)}`);
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(10);
  const [itemBuyPrice, setItemBuyPrice] = useState<number>(0);
  const [itemSellPrice, setItemSellPrice] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [poNotes, setPoNotes] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const purchases = useLiveQuery(() => db.purchases.orderBy('timestamp').reverse().toArray());
  const products = useLiveQuery(() => db.products.toArray());

  const filteredSuppliers = suppliers?.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || s.company.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.phone.includes(q);
  });

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supCompany.trim() || !supPhone.trim()) {
      setErrorMsg('Company name and phone number are required');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await saveSupplier({
        name: supName.trim() || supCompany.trim(),
        company: supCompany.trim(),
        phone: supPhone.trim(),
        email: supEmail.trim() || undefined,
        address: supAddress.trim() || undefined,
        notes: supNotes.trim() || undefined,
      }, currentUser?.name || 'Admin');

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save supplier');
        return;
      }

      setIsNewSupplierOpen(false);
      setSupName('');
      setSupCompany('');
      setSupPhone('');
      setSupEmail('');
      setSupAddress('');
      setSupNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItemToPurchase = () => {
    if (!selectedProductId) return;
    const prod = products?.find(p => p.id === selectedProductId);
    if (!prod) return;

    const newItem: PurchaseItem = {
      productId: prod.id,
      productName: prod.name,
      qty: itemQty,
      unitBuyPrice: itemBuyPrice || prod.buyPrice,
      unitSellPrice: itemSellPrice || prod.sellPrice,
      subtotal: (itemBuyPrice || prod.buyPrice) * itemQty,
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedProductId('');
    setItemQty(10);
    setItemBuyPrice(0);
    setItemSellPrice(0);
  };

  const handleRemovePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const totalCost = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }
    if (purchaseItems.length === 0) {
      setErrorMsg('Please add at least one product to the purchase order');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const sup = suppliers?.find(s => s.id === selectedSupplierId);

    const res = await processStockInward({
      invoiceNo,
      supplierId: selectedSupplierId,
      supplierName: sup?.company || 'Supplier',
      items: purchaseItems,
      totalCost,
      paidAmount,
      paymentStatus: paidAmount >= totalCost ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending',
      notes: poNotes,
    }, currentUser?.name || 'Staff');

    setIsSubmitting(false);

    if (res.success) {
      setIsStockInwardOpen(false);
      setPurchaseItems([]);
      setPaidAmount(0);
      setInvoiceNo(`PO-${Date.now().toString().slice(-6)}`);
      setPoNotes('');
    } else {
      setErrorMsg(res.error || 'Failed to record stock inward');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Truck className="w-6 h-6 text-sky-400" />
            <span>Supplier & Stock Inwards (PO)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage distributor contacts, purchases, buying costs, and credit balances
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={() => setIsNewSupplierOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>New Supplier</span>
          </button>
          <button
            onClick={() => {
              setIsStockInwardOpen(true);
              setPurchaseItems([]);
              setPaidAmount(0);
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Stock Inward / Purchase (PO)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 shrink-0">
        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeSubTab === 'suppliers' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Suppliers Directory</span>
        </button>
        <button
          onClick={() => setActiveSubTab('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeSubTab === 'purchases' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Stock Inward History</span>
        </button>
      </div>

      {/* SUBTAB 1: Suppliers Directory */}
      {activeSubTab === 'suppliers' && (
        <div className="flex-1 overflow-y-auto">
          {filteredSuppliers && filteredSuppliers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((sup) => (
                <div key={sup.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white leading-tight">{sup.company}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Contact: {sup.name}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                      <Building className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300">
                    <p className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span className="font-mono">{sup.phone}</span>
                    </p>
                    {sup.address && <p className="text-slate-400">{sup.address}</p>}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase">Purchased</span>
                      <p className="font-mono font-bold text-slate-300">{formatCurrency(sup.totalPurchased)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 uppercase">Payable Balance</span>
                      <p className={`font-mono font-bold ${sup.balancePayable > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {formatCurrency(sup.balancePayable)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
              <Truck className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
              <p className="text-sm font-medium">No suppliers recorded</p>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Purchases History */}
      {activeSubTab === 'purchases' && (
        <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold sticky top-0">
              <tr>
                <th className="py-3 px-4">Invoice / PO #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Supplier</th>
                <th className="py-3 px-3 text-center">Items Stocked</th>
                <th className="py-3 px-3 text-right">Total Cost</th>
                <th className="py-3 px-3 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases && purchases.length > 0 ? (
                purchases.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4 font-mono font-bold text-sky-400">{po.invoiceNo}</td>
                    <td className="py-3 px-3 text-slate-400">{formatDateTime(po.timestamp)}</td>
                    <td className="py-3 px-3 font-bold text-white">{po.supplierName}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {po.items.length} Products
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(po.totalCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatCurrency(po.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        po.paymentStatus === 'Paid'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                          : po.paymentStatus === 'Partial'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                      }`}>
                        {po.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No purchase orders recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Supplier Modal */}
      {isNewSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building className="w-5 h-5 text-sky-400" />
                <span>Add New Supplier</span>
              </h3>
              <button onClick={() => setIsNewSupplierOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Company / Business Name *</label>
                <input
                  type="text"
                  value={supCompany}
                  onChange={(e) => setSupCompany(e.target.value)}
                  placeholder="e.g. Atlas Stationery Distributors"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Nimal Perera"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={supPhone}
                  onChange={(e) => setSupPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Address / Location</label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  placeholder="e.g. Galle Road, Colombo"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Inward / PO Modal */}
      {isStockInwardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-3xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <PackagePlus className="w-5 h-5 text-sky-400" />
                <span>Stock Inward & Purchase Order (PO)</span>
              </h3>
              <button onClick={() => setIsStockInwardOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSavePurchaseOrder} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Select Supplier *</label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers?.map((s) => (
                      <option key={s.id} value={s.id}>{s.company} ({s.name})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Invoice / PO Reference *</label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Add Item Line Section */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">Add Product to Restock:</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const prod = products?.find(p => p.id === e.target.value);
                        if (prod) {
                          setItemBuyPrice(prod.buyPrice);
                          setItemSellPrice(prod.sellPrice);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="">Select Item</option>
                      {products?.filter(p => !p.isService).map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Unit Buy Price (Rs)</label>
                    <input
                      type="number"
                      min="0"
                      value={itemBuyPrice}
                      onChange={(e) => setItemBuyPrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItemToPurchase}
                    disabled={!selectedProductId}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item To PO</span>
                  </button>
                </div>
              </div>

              {/* Items List in PO */}
              {purchaseItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase">Items In This Order:</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {purchaseItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                        <div>
                          <p className="font-bold text-white">{item.productName}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.qty} units × Rs. {item.unitBuyPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-emerald-400">Rs. {item.subtotal.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePurchaseItem(idx)}
                            className="text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800 font-bold text-sm">
                    <span className="text-slate-300">Total Purchase Cost:</span>
                    <span className="font-mono text-white text-base">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              )}

              {/* Paid Amount */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Paid Amount Now (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    max={totalCost}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono text-base font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Credit / Balance Payable</label>
                  <div className="px-3 py-2 bg-slate-900 rounded-xl text-base font-mono font-bold text-amber-400 border border-slate-800">
                    {formatCurrency(Math.max(0, totalCost - paidAmount))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStockInwardOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || purchaseItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Receive Stock & Update Inventory</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
