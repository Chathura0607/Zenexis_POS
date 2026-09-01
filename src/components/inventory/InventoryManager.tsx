import React, { useState, useRef, useEffect } from 'react';
import { Product, ProductCategory, Supplier } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { saveProduct } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, triggerThermalPrint } from '../../services/printService';
import JsBarcode from 'jsbarcode';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Edit2,
  Barcode,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Tag
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const { isOwner } = useAuth();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');

  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState<boolean>(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);
  const [barcodePrintQty, setBarcodePrintQty] = useState<number>(1);

  // Form State
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [barcode, setBarcode] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<ProductCategory>('stationery');
  const [buyPrice, setBuyPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [stockQty, setStockQty] = useState<number>(10);
  const [minStockLevel, setMinStockLevel] = useState<number>(5);
  const [unit, setUnit] = useState<string>('pcs');
  const [supplierId, setSupplierId] = useState<string>('');
  const [isService, setIsService] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const products = useLiveQuery(() => db.products.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const suppliers = useLiveQuery(() => db.suppliers.toArray());
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  const barcodeSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (isBarcodeModalOpen && selectedProductForBarcode && barcodeSvgRef.current) {
      try {
        JsBarcode(barcodeSvgRef.current, selectedProductForBarcode.barcode, {
          format: 'CODE128',
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 11,
          margin: 0,
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [isBarcodeModalOpen, selectedProductForBarcode]);

  const defaultMin = settings?.lowStockThresholdDefault || 5;

  const filteredProducts = products?.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const isLow = !p.isService && p.stockQty <= (p.minStockLevel || defaultMin) && p.stockQty > 0;
    const isOut = !p.isService && p.stockQty <= 0;

    const matchesStockStatus =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'low' && isLow) ||
      (stockStatusFilter === 'out' && isOut);

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);

    return matchesCategory && matchesStockStatus && matchesSearch;
  });

  const handleOpenNewModal = () => {
    setEditingProductId(null);
    setBarcode(`ZX-${Date.now().toString().slice(-6)}`);
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setName('');
    setCategory('stationery');
    setBuyPrice(0);
    setSellPrice(0);
    setStockQty(10);
    setMinStockLevel(5);
    setUnit('pcs');
    setSupplierId('');
    setIsService(false);
    setErrorMsg('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProductId(p.id);
    setBarcode(p.barcode);
    setSku(p.sku);
    setName(p.name);
    setCategory(p.category);
    setBuyPrice(p.buyPrice);
    setSellPrice(p.sellPrice);
    setStockQty(p.stockQty);
    setMinStockLevel(p.minStockLevel);
    setUnit(p.unit);
    setSupplierId(p.supplierId || '');
    setIsService(p.isService || false);
    setErrorMsg('');
    setIsProductModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const sup = suppliers?.find(s => s.id === supplierId);

    const res = await saveProduct(
      {
        barcode: barcode.trim(),
        sku: sku.trim(),
        name: name.trim(),
        category,
        buyPrice,
        sellPrice,
        stockQty: isService ? 9999 : stockQty,
        minStockLevel,
        unit,
        supplierId: supplierId || undefined,
        supplierName: sup?.name,
        isService,
      },
      editingProductId || undefined
    );

    setIsSubmitting(false);

    if (res.success) {
      setIsProductModalOpen(false);
    } else {
      setErrorMsg(res.error || 'Failed to save product');
    }
  };

  const handleOpenBarcodePrint = (p: Product) => {
    setSelectedProductForBarcode(p);
    setBarcodePrintQty(1);
    setIsBarcodeModalOpen(true);
  };

  const handlePrintBarcodeStickers = () => {
    triggerThermalPrint('barcode-label-print-area');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 space-y-6 overflow-hidden select-none">
      {/* Hidden Barcode Printable Area */}
      <div id="barcode-label-print-area" className="hidden">
        {selectedProductForBarcode && (
          <div className="bg-white text-black p-2 font-mono text-center w-[76mm] mx-auto select-none border-b border-black border-dashed">
            <h4 className="text-[10px] font-bold uppercase">{settings?.shopName || 'ZENEXIS'}</h4>
            <p className="text-xs font-bold my-1">{selectedProductForBarcode.name}</p>
            <div className="flex justify-center my-1">
              <svg ref={barcodeSvgRef} className="max-w-full h-9"></svg>
            </div>
            <p className="text-sm font-extrabold mt-1">Rs. {selectedProductForBarcode.sellPrice.toLocaleString()}</p>
          </div>
        )}
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Package className="w-6 h-6 text-sky-400" />
            <span>Inventory & Stock Center</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage stationery, mobile & PC parts, consumables, barcodes, buying & selling prices
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product / Service</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Barcode, Item Name, or SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-sky-500"
        >
          <option value="all">All Categories</option>
          {categories?.map((cat) => (
            <option key={cat.id} value={cat.slug}>{cat.name}</option>
          ))}
        </select>

        {/* Stock Level Filter Buttons */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl space-x-1">
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stockStatusFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Stock
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
              stockStatusFilter === 'low' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock</span>
          </button>
          <button
            onClick={() => setStockStatusFilter('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              stockStatusFilter === 'out' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4">Product / Item</th>
              <th className="py-3 px-3">Barcode / SKU</th>
              <th className="py-3 px-3">Category</th>
              {isOwner && <th className="py-3 px-3 text-right">Cost Price</th>}
              <th className="py-3 px-3 text-right">Sell Price</th>
              {isOwner && <th className="py-3 px-3 text-right">Margin %</th>}
              <th className="py-3 px-3 text-center">Stock Level</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredProducts && filteredProducts.length > 0 ? (
              filteredProducts.map((p) => {
                const isLow = !p.isService && p.stockQty <= (p.minStockLevel || defaultMin) && p.stockQty > 0;
                const isOut = !p.isService && p.stockQty <= 0;
                const margin = p.sellPrice > 0 ? ((p.sellPrice - p.buyPrice) / p.sellPrice) * 100 : 0;

                return (
                  <tr key={p.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4">
                      <p className="font-bold text-white leading-tight">{p.name}</p>
                      {p.supplierName && <span className="text-[10px] text-slate-500">Sup: {p.supplierName}</span>}
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-400">
                      <p className="text-slate-200">{p.barcode}</p>
                      <span className="text-[10px] text-slate-500">{p.sku}</span>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                        {p.category.replace('_', ' ')}
                      </span>
                    </td>

                    {isOwner && (
                      <td className="py-3 px-3 text-right font-mono font-medium text-slate-400">
                        {formatCurrency(p.buyPrice)}
                      </td>
                    )}

                    <td className="py-3 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(p.sellPrice)}
                    </td>

                    {isOwner && (
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {margin.toFixed(1)}%
                      </td>
                    )}

                    <td className="py-3 px-3 text-center">
                      {p.isService ? (
                        <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 font-bold text-[10px] border border-sky-800/40">
                          SERVICE
                        </span>
                      ) : isOut ? (
                        <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold text-[10px] border border-rose-800/50">
                          OUT ({p.stockQty})
                        </span>
                      ) : isLow ? (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold text-[10px] border border-amber-800/50 animate-pulse">
                          LOW ({p.stockQty} {p.unit})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold text-[10px]">
                          {p.stockQty} {p.unit}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenBarcodePrint(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
                          title="Print Barcode Label"
                        >
                          <Barcode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-500">
                  No inventory products found matching your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingProductId ? 'Edit Product / Service' : 'Add New Product to Inventory'}
                  </h3>
                  <p className="text-xs text-slate-400">Validated against database schema with pricing</p>
                </div>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Barcode *</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Barcode string"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="e.g. ATLAS-CR-120"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Product / Item Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Atlas CR Book 120 Pages"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  >
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pcs, pack, sheet, set, box"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Price Calculations */}
              <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Buy / Cost Price (Rs) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={buyPrice}
                    onChange={(e) => setBuyPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 font-mono text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Sell Price (Rs) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-emerald-400 font-mono text-sm font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Calculated Margin</label>
                  <div className="px-3 py-2 bg-slate-900 rounded-xl text-sm font-mono font-extrabold text-sky-400 border border-slate-800">
                    {sellPrice > 0 ? `${(((sellPrice - buyPrice) / sellPrice) * 100).toFixed(1)}%` : '0%'}
                  </div>
                </div>
              </div>

              {/* Stock Management */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isService}
                    value={isService ? 9999 : stockQty}
                    onChange={(e) => setStockQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Min Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    disabled={isService}
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-amber-400 font-mono text-xs font-bold disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Supplier</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs"
                  >
                    <option value="">No specific supplier</option>
                    {suppliers?.map((sup) => (
                      <option key={sup.id} value={sup.id}>{sup.company} ({sup.name})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isService}
                  onChange={(e) => setIsService(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 bg-slate-900 border-slate-700"
                />
                <span>Is On-Demand Service (e.g. Photocopy, Design, Repair labor - stock quantity not tracked)</span>
              </label>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 font-medium text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingProductId ? 'Update Product' : 'Save To Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Print Modal */}
      {isBarcodeModalOpen && selectedProductForBarcode && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-sky-400" />
                <span>Print Barcode Label</span>
              </h3>
              <button onClick={() => setIsBarcodeModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Preview Box */}
            <div className="mt-4 p-4 bg-white text-black rounded-2xl text-center shadow">
              <span className="text-[10px] font-bold uppercase">{settings?.shopName || 'ZENEXIS'}</span>
              <p className="text-xs font-bold text-black my-1">{selectedProductForBarcode.name}</p>
              <div className="flex justify-center my-2">
                <svg ref={barcodeSvgRef} className="max-w-full h-10"></svg>
              </div>
              <p className="text-sm font-extrabold text-black">Rs. {selectedProductForBarcode.sellPrice.toLocaleString()}</p>
            </div>

            <div className="mt-5 flex justify-end space-x-2">
              <button
                onClick={() => setIsBarcodeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={handlePrintBarcodeStickers}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 flex items-center space-x-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
