import React, { useState } from 'react';
import { CartItem, ProductCategory } from '../../types';
import { Printer, Camera, Coffee, Stamp, Plus, X, Calculator, Sparkles } from 'lucide-react';

interface CustomServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const CustomServiceModal: React.FC<CustomServiceModalProps> = ({ isOpen, onClose, onAddToCart }) => {
  const [activeServiceTab, setActiveServiceTab] = useState<'photocopy' | 'photo' | 'mug' | 'seal' | 'custom'>('photocopy');

  // Photocopy / Printout State
  const [pageCount, setPageCount] = useState<number>(10);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [sideMode, setSideMode] = useState<'single' | 'double'>('single');
  const [paperType, setPaperType] = useState<'a4' | 'a3' | 'legal'>('a4');
  const [unitCustomRate, setUnitCustomRate] = useState<number>(10);

  // Photo Lab State
  const [photoType, setPhotoType] = useState<'passport_set' | '4r' | '5r' | '6r' | '8r' | '12r'>('passport_set');
  const [photoQty, setPhotoQty] = useState<number>(1);

  // Mug Print State
  const [mugType, setMugType] = useState<'white_11oz' | 'magic_mug' | 'inner_color' | 'frosted_glass'>('white_11oz');
  const [mugQty, setMugQty] = useState<number>(1);

  // Rubber Seal State
  const [sealType, setSealType] = useState<'round_flash' | 'oval_flash' | 'rect_flash' | 'wooden_handle' | 'date_stamp'>('round_flash');
  const [sealName, setSealName] = useState<string>('');

  // Custom Item / Other Service State
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<number>(100);
  const [customCost, setCustomCost] = useState<number>(50);
  const [customQty, setCustomQty] = useState<number>(1);

  if (!isOpen) return null;

  // Auto-calculate Photocopy Rate
  const calculatePhotocopyUnitRate = () => {
    let rate = 10;
    if (colorMode === 'bw') {
      rate = sideMode === 'single' ? 10 : 15;
      if (paperType === 'a3') rate = rate * 2;
    } else {
      rate = sideMode === 'single' ? 50 : 90;
      if (paperType === 'a3') rate = rate * 2;
    }
    return rate;
  };

  const handleAddPhotocopy = () => {
    const rate = unitCustomRate || calculatePhotocopyUnitRate();
    const costPerSheet = colorMode === 'bw' ? (sideMode === 'single' ? 3 : 5) : 15;
    const title = `${paperType.toUpperCase()} ${colorMode === 'bw' ? 'B/W' : 'Color'} ${sideMode === 'single' ? 'Single-Side' : 'Double-Side'} (${pageCount} Sheets)`;

    const newItem: CartItem = {
      id: `srv_copy_${Date.now()}`,
      productId: 'prd_pc_a4_bw_s',
      name: title,
      category: 'color_print_photocopy',
      unitPrice: rate,
      costPrice: costPerSheet,
      qty: pageCount,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: rate * pageCount,
      isCustomPrice: true,
    };
    onAddToCart(newItem);
    onClose();
  };

  const handleAddPhotoPrint = () => {
    const photoPricing: Record<string, { name: string; sell: number; cost: number }> = {
      passport_set: { name: 'Passport Size Photo Set (4 Pcs)', sell: 350, cost: 50 },
      '4r': { name: '4R Glossy Photo Print (4x6)', sell: 120, cost: 35 },
      '5r': { name: '5R Glossy Photo Print (5x7)', sell: 220, cost: 60 },
      '6r': { name: '6R Glossy Photo Print (6x8)', sell: 350, cost: 90 },
      '8r': { name: '8R Glossy Photo Print (8x10)', sell: 650, cost: 160 },
      '12r': { name: '12R Studio Photo Print (10x12)', sell: 1250, cost: 320 },
    };

    const sel = photoPricing[photoType];
    const newItem: CartItem = {
      id: `srv_photo_${Date.now()}`,
      productId: 'prd_photo_pass',
      name: sel.name,
      category: 'photo_print',
      unitPrice: sel.sell,
      costPrice: sel.cost,
      qty: photoQty,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: sel.sell * photoQty,
      isCustomPrice: true,
    };
    onAddToCart(newItem);
    onClose();
  };

  const handleAddMug = () => {
    const mugPricing: Record<string, { name: string; sell: number; cost: number }> = {
      white_11oz: { name: 'Custom Sublimation Photo Mug (White 11oz)', sell: 950, cost: 380 },
      magic_mug: { name: 'Color Changing Magic Photo Mug (Black 11oz)', sell: 1450, cost: 650 },
      inner_color: { name: 'Inner Color Sublimation Mug (11oz)', sell: 1100, cost: 450 },
      frosted_glass: { name: 'Frosted Beer/Coffee Glass Sublimation', sell: 1650, cost: 720 },
    };

    const sel = mugPricing[mugType];
    const newItem: CartItem = {
      id: `srv_mug_${Date.now()}`,
      productId: 'prd_mug_sub',
      name: sel.name,
      category: 'mug_print',
      unitPrice: sel.sell,
      costPrice: sel.cost,
      qty: mugQty,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: sel.sell * mugQty,
      isCustomPrice: true,
    };
    onAddToCart(newItem);
    onClose();
  };

  const handleAddSeal = () => {
    const sealPricing: Record<string, { name: string; sell: number; cost: number }> = {
      round_flash: { name: `Round Flash Rubber Seal (${sealName || '38mm Pre-Inked'})`, sell: 1850, cost: 650 },
      oval_flash: { name: `Oval Flash Rubber Seal (${sealName || '45x30mm'})`, sell: 1950, cost: 700 },
      rect_flash: { name: `Rectangle Flash Address Seal (${sealName || 'Standard'})`, sell: 1750, cost: 600 },
      wooden_handle: { name: `Traditional Wooden Handle Polymer Stamp (${sealName || 'Custom'})`, sell: 850, cost: 250 },
      date_stamp: { name: `Self-Inking Date + Text Stamp (${sealName || 'Heavy Duty'})`, sell: 2850, cost: 1200 },
    };

    const sel = sealPricing[sealType];
    const newItem: CartItem = {
      id: `srv_seal_${Date.now()}`,
      productId: 'prd_seal_flash_round',
      name: sel.name,
      category: 'rubber_seal',
      unitPrice: sel.sell,
      costPrice: sel.cost,
      qty: 1,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: sel.sell,
      isCustomPrice: true,
    };
    onAddToCart(newItem);
    onClose();
  };

  const handleAddCustom = () => {
    if (!customTitle.trim()) return;
    const newItem: CartItem = {
      id: `srv_custom_${Date.now()}`,
      productId: 'prd_custom_misc',
      name: customTitle.trim(),
      category: 'services',
      unitPrice: customPrice,
      costPrice: customCost,
      qty: customQty,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: customPrice * customQty,
      isCustomPrice: true,
    };
    onAddToCart(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Custom Service Price Matrix</h3>
              <p className="text-xs text-slate-400">Quick on-the-fly pricing for prints, seals, mugs & repairs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-5 gap-2 mt-4 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveServiceTab('photocopy')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-1 ${
              activeServiceTab === 'photocopy' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Copy / Print</span>
          </button>
          <button
            onClick={() => setActiveServiceTab('photo')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-1 ${
              activeServiceTab === 'photo' ? 'bg-pink-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photo Lab</span>
          </button>
          <button
            onClick={() => setActiveServiceTab('mug')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-1 ${
              activeServiceTab === 'mug' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Coffee className="w-4 h-4" />
            <span>Mug Sublimation</span>
          </button>
          <button
            onClick={() => setActiveServiceTab('seal')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-1 ${
              activeServiceTab === 'seal' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>Rubber Seal</span>
          </button>
          <button
            onClick={() => setActiveServiceTab('custom')}
            className={`py-2 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center space-y-1 ${
              activeServiceTab === 'custom' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Custom</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* TAB 1: Photocopy & Printout Matrix */}
          {activeServiceTab === 'photocopy' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {/* Paper Size */}
                <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Paper Size</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['a4', 'a3', 'legal'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPaperType(p)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                          paperType === p ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Mode */}
                <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Color Mode</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => { setColorMode('bw'); setUnitCustomRate(sideMode === 'single' ? 10 : 15); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        colorMode === 'bw' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      B / W
                    </button>
                    <button
                      onClick={() => { setColorMode('color'); setUnitCustomRate(sideMode === 'single' ? 50 : 90); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        colorMode === 'color' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      Color
                    </button>
                  </div>
                </div>

                {/* Sides */}
                <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/60">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Printing Sides</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => { setSideMode('single'); setUnitCustomRate(colorMode === 'bw' ? 10 : 50); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        sideMode === 'single' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      1 Side
                    </button>
                    <button
                      onClick={() => { setSideMode('double'); setUnitCustomRate(colorMode === 'bw' ? 15 : 90); }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        sideMode === 'double' ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      2 Sided
                    </button>
                  </div>
                </div>
              </div>

              {/* Number of Pages & Rate Override */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Number of Sheets / Pages</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      value={pageCount}
                      onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:border-sky-500 focus:outline-none"
                    />
                    <div className="flex space-x-1">
                      {[5, 10, 20, 50].map((quick) => (
                        <button
                          key={quick}
                          onClick={() => setPageCount(quick)}
                          className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono"
                        >
                          +{quick}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Rate Per Page (LKR)</label>
                  <input
                    type="number"
                    min="1"
                    value={unitCustomRate}
                    onChange={(e) => setUnitCustomRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sky-400 font-mono text-lg font-bold focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Calculation & Add */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-slate-400">Total Calculated Charge:</span>
                  <p className="text-2xl font-extrabold text-white font-mono">
                    Rs. {(pageCount * unitCustomRate).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={handleAddPhotocopy}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-bold text-sm shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add To Bill</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Photo Lab */}
          {activeServiceTab === 'photo' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'passport_set', label: 'Passport (4 Pcs)', price: 350 },
                  { id: '4r', label: '4R (4x6 Inches)', price: 120 },
                  { id: '5r', label: '5R (5x7 Inches)', price: 220 },
                  { id: '6r', label: '6R (6x8 Inches)', price: 350 },
                  { id: '8r', label: '8R (8x10 Inches)', price: 650 },
                  { id: '12r', label: '12R Studio Print', price: 1250 },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPhotoType(item.id as any)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      photoType === item.id
                        ? 'bg-pink-600/20 border-pink-500 text-white shadow-lg'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-sm font-mono font-extrabold text-pink-400 mt-1">Rs. {item.price}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300 uppercase">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPhotoQty(Math.max(1, photoQty - 1))}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-lg text-white w-8 text-center">{photoQty}</span>
                    <button
                      onClick={() => setPhotoQty(photoQty + 1)}
                      className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddPhotoPrint}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-pink-500/25 flex items-center space-x-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Photo Print</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Mug Printing */}
          {activeServiceTab === 'mug' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'white_11oz', label: 'Standard White 11oz Ceramic Mug', price: 950 },
                  { id: 'magic_mug', label: 'Color Changing Magic Mug (Black)', price: 1450 },
                  { id: 'inner_color', label: 'Inner Color / Rim Handle Mug', price: 1100 },
                  { id: 'frosted_glass', label: 'Frosted Beer / Custom Glass Mug', price: 1650 },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMugType(item.id as any)}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      mugType === item.id
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-sm font-mono font-extrabold text-purple-400 mt-1">Rs. {item.price}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-bold text-slate-300 uppercase">Quantity:</span>
                  <input
                    type="number"
                    min="1"
                    value={mugQty}
                    onChange={(e) => setMugQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-center font-bold"
                  />
                </div>
                <button
                  onClick={handleAddMug}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold text-sm shadow-lg shadow-purple-500/25 flex items-center space-x-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Mug To Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Rubber Seals */}
          {activeServiceTab === 'seal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'round_flash', label: 'Round Flash Pre-Inked (38mm)', price: 1850 },
                  { id: 'oval_flash', label: 'Oval Flash Pre-Inked', price: 1950 },
                  { id: 'rect_flash', label: 'Rectangular Flash Seal', price: 1750 },
                  { id: 'wooden_handle', label: 'Wooden Handle Stamp', price: 850 },
                  { id: 'date_stamp', label: 'Self-Inking Date Stamp', price: 2850 },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSealType(item.id as any)}
                    className={`p-3 rounded-2xl border text-left transition ${
                      sealType === item.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-lg'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <p className="text-xs font-bold">{item.label}</p>
                    <p className="text-sm font-mono font-extrabold text-emerald-400 mt-1">Rs. {item.price}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Seal Text / Title / Company Name (Optional)
                </label>
                <input
                  type="text"
                  value={sealName}
                  onChange={(e) => setSealName(e.target.value)}
                  placeholder="e.g., Director - ABC PVT LTD or JP Round Seal"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAddSeal}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center space-x-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Rubber Seal</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: Open Custom Service / Fee */}
          {activeServiceTab === 'custom' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Custom Service / Item Name
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Phone Tempered Fitting / Computer Cleaning Fee / Graphic Design"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Selling Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 font-mono text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Cost Price (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={customCost}
                    onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-400 font-mono text-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={customQty}
                    onChange={(e) => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleAddCustom}
                  disabled={!customTitle.trim() || customPrice <= 0}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-400 hover:to-sky-400 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Custom Item</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
