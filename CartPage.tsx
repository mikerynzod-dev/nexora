import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ResilientImage } from '../components/ResilientImage';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/format';

export function CartPage() {
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#27272A] pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#FAFAFA]">
          Shopping Bag
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1 tabular-nums">
          {cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'} reserved in your session
        </p>
      </div>

      {cart.items.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-14 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-[#27272A] mx-auto" />
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Your bag is currently empty</h2>
          <p className="text-sm text-[#A1A1AA] max-w-md mx-auto">
            Browse our latest acoustic systems, wearables, and CNC-machined computing peripherals.
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 rounded-xl border border-[#27272A] bg-[#111114] divide-y divide-[#27272A]">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Link
                    to={`/products/${item.slug}`}
                    className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]"
                  >
                    <ResilientImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/products/${item.slug}`}
                      className="text-sm font-semibold text-[#FAFAFA] hover:text-[#8B5CF6] transition-colors line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[#A1A1AA] mt-0.5">
                      {item.variantName ? `${item.variantName} · ` : ''}
                      <span className="font-mono">{item.sku}</span>
                    </p>
                    <p className="text-xs font-mono text-[#FAFAFA] mt-1 tabular-nums">
                      {formatCurrency(item.unitPrice)} each
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="inline-flex items-center rounded-lg border border-[#27272A] bg-[#18181B]">
                    <button
                      type="button"
                      onClick={() =>
                        item.quantity > 1
                          ? updateQuantity(item.id, item.quantity - 1)
                          : removeItem(item.id)
                      }
                      className="px-3 py-2 text-[#A1A1AA] hover:text-[#FAFAFA]"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-mono tabular-nums">{item.quantity}</span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.availableStock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-2 text-[#A1A1AA] hover:text-[#FAFAFA] disabled:opacity-30"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-sm font-semibold font-mono tabular-nums w-24 text-right">
                    {formatCurrency(item.lineTotal)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-[#A1A1AA] hover:text-rose-400 transition-colors"
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-5">
            <h2 className="text-base font-semibold text-[#FAFAFA]">Order Summary</h2>

            <div className="space-y-3 text-sm border-b border-[#27272A] pb-4">
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
              <p className="text-xs text-[#A1A1AA]">
                Discount codes can be applied on the next step.
              </p>
            </div>

            <div className="flex justify-between text-base font-semibold">
              <span>Estimated Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(cart.total)}</span>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full rounded-lg bg-[#8B5CF6] py-3 text-sm font-medium text-white hover:bg-[#7C3AED] transition-colors"
              >
                Proceed to Checkout
              </button>
              <Link
                to="/catalog"
                className="block w-full rounded-lg border border-[#27272A] bg-[#18181B] py-2.5 text-center text-xs font-medium text-[#FAFAFA] hover:border-[#3F3F46] transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
