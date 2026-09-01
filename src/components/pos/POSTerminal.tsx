import React, { useState, useEffect } from 'react';
import { CartItem, Customer, Sale } from '../../types';
import { ProductGrid } from './ProductGrid';
import { CartPanel } from './CartPanel';
import { CustomServiceModal } from './CustomServiceModal';
import { QuickCustomerModal } from './QuickCustomerModal';
import { PaymentModal } from './PaymentModal';
import { calculateCartTotals } from '../../services/posService';

interface POSTerminalProps {
  onOpenOrderHistory?: () => void;
}

export const POSTerminal: React.FC<POSTerminalProps> = ({ onOpenOrderHistory }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Modals
  const [isCustomServiceOpen, setIsCustomServiceOpen] = useState<boolean>(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState<boolean>(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState<boolean>(false);

  const totals = calculateCartTotals(cartItems, discountType, discountValue);

  // Keyboard Shortcuts (F10 for checkout, Esc to clear / close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        if (cartItems.length > 0) {
          setIsPaymentOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems]);

  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => {
      // If it's a standard product and already in cart, increment quantity
      const existingIdx = prev.findIndex(
        (i) => i.productId === newItem.productId && !i.isCustomPrice && i.unitPrice === newItem.unitPrice
      );
      if (existingIdx > -1) {
        const updated = [...prev];
        const current = updated[existingIdx];
        const newQty = current.qty + newItem.qty;
        updated[existingIdx] = {
          ...current,
          qty: newQty,
          total: (current.unitPrice * newQty) - current.discountAmount,
        };
        return updated;
      }
      return [newItem, ...prev];
    });
  };

  const handleUpdateQty = (itemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            qty: newQty,
            total: (item.unitPrice * newQty) - (item.discountAmount || 0),
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setDiscountValue(0);
    setSelectedCustomer(null);
  };

  const handlePaymentSuccess = (_sale: Sale) => {
    handleClearCart();
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Left: Product Search, Category Tiles, Fast Service Buttons */}
      <ProductGrid
        onAddToCart={handleAddToCart}
        onOpenCustomService={() => setIsCustomServiceOpen(true)}
        onOpenOrderHistory={onOpenOrderHistory}
      />

      {/* Right: Cart Panel with Qty Controls, Discounts, Customer Tag, Checkout */}
      <CartPanel
        items={cartItems}
        subtotal={totals.subtotal}
        costTotal={totals.costTotal}
        discountType={discountType}
        discountValue={discountValue}
        discountAmount={totals.discountAmount}
        netTotal={totals.netTotal}
        grossProfit={totals.grossProfit}
        selectedCustomer={selectedCustomer}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onSetDiscountType={setDiscountType}
        onSetDiscountValue={setDiscountValue}
        onOpenQuickCustomer={() => setIsQuickCustomerOpen(true)}
        onRemoveCustomer={() => setSelectedCustomer(null)}
        onOpenPayment={() => setIsPaymentOpen(true)}
      />

      {/* Modals */}
      <CustomServiceModal
        isOpen={isCustomServiceOpen}
        onClose={() => setIsCustomServiceOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        onCustomerSelected={(cust) => setSelectedCustomer(cust)}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        items={cartItems}
        subtotal={totals.subtotal}
        discountType={discountType}
        discountValue={discountValue}
        discountAmount={totals.discountAmount}
        netTotal={totals.netTotal}
        selectedCustomer={selectedCustomer}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};
