import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, extractApiError } from '../services/api';
import type { CartState } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const emptyCart: CartState = {
  cartId: null,
  items: [],
  subtotal: 0,
  shippingFee: 0,
  freeShippingThreshold: 250,
  total: 0,
  itemCount: 0,
};

interface CartContextValue {
  cart: CartState;
  loading: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  refreshCart: () => Promise<void>;
  addToCart: (productId: number, variantId?: number | null, quantity?: number, openDrawer?: boolean) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(emptyCart);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const refreshCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<CartState>('/cart');
      setCart(res.data);
    } catch {
      // keep previous state silently on passive refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [user?.id, refreshCart]);

  const addToCart = useCallback(
    async (productId: number, variantId?: number | null, quantity = 1, openDrawer = true) => {
      try {
        const res = await api.post<CartState>('/cart/items', {
          productId,
          variantId: variantId ?? null,
          quantity,
        });
        setCart(res.data);
        if (openDrawer) setDrawerOpen(true);
        showToast('Added to bag', 'success');
      } catch (err) {
        showToast(extractApiError(err, 'Could not add item to bag'), 'error');
      }
    },
    [showToast]
  );

  const updateQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (quantity < 1) return;
      try {
        const res = await api.patch<CartState>(`/cart/items/${itemId}`, { quantity });
        setCart(res.data);
      } catch (err) {
        showToast(extractApiError(err, 'Could not update quantity'), 'error');
      }
    },
    [showToast]
  );

  const removeItem = useCallback(
    async (itemId: number) => {
      try {
        const res = await api.delete<CartState>(`/cart/items/${itemId}`);
        setCart(res.data);
        showToast('Item removed from bag', 'info');
      } catch (err) {
        showToast(extractApiError(err, 'Could not remove item'), 'error');
      }
    },
    [showToast]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        drawerOpen,
        setDrawerOpen,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
