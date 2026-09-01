import React, { useState, useEffect, useRef } from 'react';
import { Product, ProductCategory, CartItem } from '../../types';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Search,
  Barcode,
  Layers,
  Sparkles,
  Package,
  Plus,
  Printer,
  Camera,
  Coffee,
  Stamp,
  Smartphone,
  Laptop,
  Zap,
  Gift,
  Wrench,
  BookOpen,
  History
} from 'lucide-react';

interface ProductGridProps {
  onAddToCart: (item: CartItem) => void;
  onOpenCustomService: () => void;
  onOpenOrderHistory?: () => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ onAddToCart, onOpenCustomService, onOpenOrderHistory }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const categories = useLiveQuery(() => db.categories.toArray());
  const products = useLiveQuery(() => db.products.toArray());
  const settings = useLiveQuery(() => db.settings.toCollection().first());

  // Auto-focus search input on mount and on 'Escape'
  useEffect(() => {
    searchInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Barcode Instant Add on Enter
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const match = products?.find(
        (p) =>
          p.barcode.toLowerCase() === searchQuery.trim().toLowerCase() ||
          p.sku.toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (match) {
        handleAddProduct(match);
        setSearchQuery('');
      }
    }
  };

  const handleAddProduct = (product: Product) => {
    const cartItem: CartItem = {
      id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      productId: product.id,
      name: product.name,
      category: product.category,
      unitPrice: product.sellPrice,
      costPrice: product.buyPrice,
      qty: 1,
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      total: product.sellPrice,
    };
    onAddToCart(cartItem);
  };

  const filteredProducts = products?.filter((product) => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.barcode.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'stationery': return BookOpen;
      case 'color_print_photocopy': return Printer;
      case 'photo_print': return Camera;
      case 'mug_print': return Coffee;
      case 'rubber_seal': return Stamp;
      case 'mobile_accessories': return Smartphone;
      case 'pc_accessories': return Laptop;
      case 'reloads': return Zap;
      case 'gifts': return Gift;
      case 'services': return Wrench;
      default: return Package;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 p-4 space-y-4">
      {/* Top Search Bar & Action Triggers */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Scan Barcode or Search Item Name / SKU (Press '/' to focus)..."
            className="w-full pl-11 pr-10 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500 transition shadow-inner font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Order History Quick Trigger */}
        {onOpenOrderHistory && (
          <button
            onClick={onOpenOrderHistory}
            className="px-3.5 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 shrink-0 shadow-md"
            title="View Past Orders and Reprint Bills (F11)"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span className="hidden sm:inline">Order History</span>
            <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-800 rounded text-slate-400">F11</span>
          </button>
        )}

        {/* Custom Price / Service Button */}
        <button
          onClick={onOpenCustomService}
          className="px-4 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-sky-500/25 flex items-center space-x-2 transition shrink-0"
          title="Open Photocopy, Mug, Stamp or Custom Job Calculator"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>+ Custom Service / Prints</span>
        </button>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
            selectedCategory === 'all'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Items</span>
        </button>

        {categories?.map((cat) => {
          const Icon = getCategoryIcon(cat.slug);
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredProducts && filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const defaultMin = settings?.lowStockThresholdDefault || 5;
              const isLowStock = !product.isService && product.stockQty <= (product.minStockLevel || defaultMin);
              const isOutOfStock = !product.isService && product.stockQty <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  disabled={isOutOfStock}
                  className={`group p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-850 hover:shadow-xl hover:shadow-sky-500/5 transition-all text-left flex flex-col justify-between relative overflow-hidden ${
                    isOutOfStock ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                  }`}
                >
                  <div>
                    {/* Category / Stock Badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-md">
                        {product.category.replace('_', ' ')}
                      </span>

                      {product.isService ? (
                        <span className="text-[10px] font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                          SERVICE
                        </span>
                      ) : isOutOfStock ? (
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40">
                          OUT OF STOCK
                        </span>
                      ) : isLowStock ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          LOW ({product.stockQty})
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded">
                          Stock: {product.stockQty}
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-snug group-hover:text-sky-400 transition-colors">
                      {product.name}
                    </h4>
                  </div>

                  {/* Price & Add Icon */}
                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono">Barcode: {product.barcode}</span>
                      <p className="text-sm font-mono font-extrabold text-white">
                        Rs. {product.sellPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-slate-800 group-hover:bg-sky-500 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
            <Package className="w-12 h-12 stroke-1 text-slate-600 mb-2" />
            <p className="text-sm font-medium">No products found matching your search</p>
            <p className="text-xs text-slate-600 mt-1">Try another keyword or category filter</p>
          </div>
        )}
      </div>
    </div>
  );
};
