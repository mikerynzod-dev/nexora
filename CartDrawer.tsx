import { AnimatePresence, motion } from 'motion/react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';
import { ResilientImage } from './ResilientImage';

export function CartDrawer() {
  const { cart, drawerOpen, setDrawerOpen, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setDrawerOpen(false);
    navigate('/checkout');
  };

  const remainingForFreeShipping = Math.max(0, cart.freeShippingThreshold - cart.subtotal);
  const progressPct = Math.min(100, (cart.subtotal / Math.max(1, cart.freeShippingThreshold)) * 100);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-[#27272A] bg-[#111114] text-[#FAFAFA]"
            aria-label="Shopping Bag"
          >
            <div className="flex items-center justify-between border-b border-[#27272A] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-[#8B5CF6]" />
                <h2 className="text-base font-semibold tracking-tight">
                  Shopping Bag ({cart.itemCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
                aria-label="Close bag"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {cart.items.length > 0 && (
              <div className="border-b border-[#27272A] bg-[#09090B]/60 px-6 py-3">
                <p className="text-xs text-[#A1A1AA] mb-2">
                  {remainingForFreeShipping === 0
                    ? 'Complimentary express shipping unlocked'
                    : `Add ${formatCurrency(remainingForFreeShipping)} more for free shipping`}
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#27272A]">
                  <div
                    className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center py-12">
                  <ShoppingBag className="w-10 h-10 text-[#27272A] mb-3" />
                  <p className="text-sm font-medium text-[#FAFAFA]">Your bag is empty</p>
                  <p className="text-xs text-[#A1A1AA] mt-1 max-w-xs">
                    Explore precision audio systems, titanium wearables, and computing hardware.
                  </p>
                  <Link
                    to="/catalog"
                    onClick={() => setDrawerOpen(false)}
                    className="mt-5 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition-colors"
                  >
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#27272A]">
                  {cart.items.map((item) => (
                    <li key={item.id} className="flex gap-4 py-4">
                      <Link
                        to={`/products/${item.slug}`}
                        onClick={() => setDrawerOpen(false)}
                        className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]"
                      >
                        <ResilientImage
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              to={`/products/${item.slug}`}
                              onClick={() => setDrawerOpen(false)}
                              className="text-sm font-medium text-[#FAFAFA] hover:text-[#8B5CF6] transition-colors line-clamp-1"
                            >
                              {item.name}
                            </Link>
                            {item.variantName && (
                              <p className="text-xs text-[#A1A1AA] mt-0.5">{item.variantName}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-1 text-[#A1A1AA] hover:text-rose-400 transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3 mt-2">
                          <div className="inline-flex items-center rounded-lg border border-[#27272A] bg-[#18181B]">
                            <button
                              type="button"
                              onClick={() =>
                                item.quantity > 1
                                  ? updateQuantity(item.id, item.quantity - 1)
                                  : removeItem(item.id)
                              }
                              className="px-2.5 py-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 text-xs font-mono tabular-nums text-[#FAFAFA]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={item.quantity >= item.availableStock}
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="px-2.5 py-1.5 text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-30 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="text-sm font-semibold font-mono tabular-nums text-[#FAFAFA]">
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="border-t border-[#27272A] bg-[#09090B] p-6 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Subtotal</span>
                    <span className="font-mono tabular-nums text-[#FAFAFA]">
                      {formatCurrency(cart.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Estimated Shipping</span>
                    <span className="font-mono tabular-nums text-[#FAFAFA]">
                      {cart.shippingFee === 0 ? 'Free' : formatCurrency(cart.shippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[#27272A] pt-2 text-base font-semibold text-[#FAFAFA]">
                    <span>Total</span>
                    <span className="font-mono tabular-nums">{formatCurrency(cart.total)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCheckout}
                    className="w-full rounded-lg bg-[#8B5CF6] py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors"
                  >
                    Proceed to Checkout
                  </button>
                  <Link
                    to="/cart"
                    onClick={() => setDrawerOpen(false)}
                    className="w-full rounded-lg border border-[#27272A] bg-[#18181B] py-2.5 text-center text-xs font-medium text-[#FAFAFA] hover:border-[#3F3F46] transition-colors"
                  >
                    View Full Bag
                  </Link>
                </div>
              </div>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
