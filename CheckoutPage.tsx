import { Banknote, CheckCircle2, CreditCard, Lock, Tag } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Address, Order, StoreSettings } from '../types';
import { formatCurrency } from '../utils/format';

export function CheckoutPage() {
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  const [shippingRecipient, setShippingRecipient] = useState(user?.name || '');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingPostalCode, setShippingPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
  } | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Online'>('COD');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: StoreSettings }>('/settings')
      .then((res) => {
        setSettings(res.data.settings);
        if (res.data.settings && !res.data.settings.codEnabled && res.data.settings.onlinePaymentEnabled) {
          setPaymentMethod('Online');
        }
      })
      .catch(() => {});

    api
      .get<{ addresses: Address[] }>('/addresses')
      .then((res) => {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find((a) => a.isDefault) || res.data.addresses[0];
        if (def) {
          setShippingRecipient(def.recipientName);
          setShippingPhone(def.phone);
          setShippingAddress(def.street);
          setShippingCity(def.city);
          setShippingPostalCode(def.postalCode);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectAddress = (addr: Address) => {
    setShippingRecipient(addr.recipientName);
    setShippingPhone(addr.phone);
    setShippingAddress(addr.street);
    setShippingCity(addr.city);
    setShippingPostalCode(addr.postalCode);
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    try {
      setValidatingCoupon(true);
      const res = await api.post<{ coupon: { code: string; discountAmount: number } }>(
        '/cart/validate-coupon',
        { code: couponInput.trim(), subtotal: cart.subtotal }
      );
      setAppliedCoupon({
        code: res.data.coupon.code,
        discountAmount: res.data.coupon.discountAmount,
      });
      showToast(`Coupon ${res.data.coupon.code} applied`, 'success');
    } catch (err) {
      setAppliedCoupon(null);
      showToast(extractApiError(err, 'Invalid coupon code'), 'error');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const discount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const discountedSubtotal = Math.max(0, cart.subtotal - discount);
  const flatFee = settings ? Number(settings.shippingFlatFee) : 15;
  const freeThreshold = settings ? Number(settings.freeShippingThreshold) : 250;
  const shippingFee = discountedSubtotal >= freeThreshold ? 0 : flatFee;
  const finalTotal = Number((discountedSubtotal + shippingFee).toFixed(2));

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) {
      showToast('Your shopping bag is empty', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const orderRes = await api.post<{ order: Order }>('/orders', {
        paymentMethod,
        shippingRecipient,
        shippingPhone,
        shippingAddress,
        shippingCity,
        shippingPostalCode,
        couponCode: appliedCoupon?.code || null,
        notes: notes.trim() || null,
      });

      const createdOrder = orderRes.data.order;
      await refreshCart();

      if (paymentMethod === 'Online') {
        try {
          const payRes = await api.post<{ checkoutUrl: string }>('/payments/checkout', {
            orderId: createdOrder.id,
          });
          if (payRes.data.checkoutUrl) {
            window.location.assign(payRes.data.checkoutUrl);
            return;
          }
        } catch (payErr) {
          showToast(
            extractApiError(
              payErr,
              'Order created, but online payment gateway requires configuration. View order details to retry.'
            ),
            'info'
          );
          navigate(`/account/orders/${createdOrder.orderNumber}`);
          return;
        }
      }

      showToast(`Order ${createdOrder.orderNumber} confirmed`, 'success');
      navigate(`/account/orders/${createdOrder.orderNumber}`);
    } catch (err) {
      showToast(extractApiError(err, 'Unable to place order'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-semibold">No items to check out</h1>
        <p className="text-sm text-[#A1A1AA]">Add hardware to your bag before proceeding to checkout.</p>
        <Link
          to="/catalog"
          className="inline-block rounded-lg bg-[#8B5CF6] px-6 py-3 text-sm font-medium text-white"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#27272A] pb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-[#FAFAFA]">
          Checkout
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Verify shipping destination, promo codes, and payment method.
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          {/* Saved Addresses */}
          {addresses.length > 0 && (
            <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-3">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">Saved Shipping Addresses</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectAddress(addr)}
                    className="text-left rounded-lg border border-[#27272A] bg-[#18181B] p-3.5 hover:border-[#8B5CF6] transition-colors space-y-1"
                  >
                    <div className="text-xs font-semibold text-[#FAFAFA]">{addr.label}</div>
                    <div className="text-xs text-[#A1A1AA]">{addr.recipientName}</div>
                    <div className="text-xs text-[#A1A1AA] line-clamp-1">
                      {addr.street}, {addr.city} {addr.postalCode}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recipient & Address Form */}
          <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#FAFAFA]">Shipping Destination</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1.5">Recipient Full Name</label>
                <input
                  type="text"
                  required
                  value={shippingRecipient}
                  onChange={(e) => setShippingRecipient(e.target.value)}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1.5">Contact Number</label>
                <input
                  type="tel"
                  required
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  placeholder="+1 555 0194"
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Street Address & Unit</label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Street, building, floor or suite"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1.5">City</label>
                <input
                  type="text"
                  required
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1.5">Postal Code</label>
                <input
                  type="text"
                  required
                  value={shippingPostalCode}
                  onChange={(e) => setShippingPostalCode(e.target.value)}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm font-mono text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code or courier instructions"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#FAFAFA]">Payment Method</h2>
            <p className="text-xs text-[#A1A1AA]">
              NEXORA never collects or stores raw card numbers. Online payments use verified hosted checkout sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!settings || settings.codEnabled) && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('COD')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                      : 'border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]'
                  }`}
                >
                  <Banknote className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-[#FAFAFA]">Cash on Delivery</div>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Pay courier upon physical inspection and delivery.
                    </p>
                  </div>
                </button>
              )}

              {(!settings || settings.onlinePaymentEnabled) && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Online')}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    paymentMethod === 'Online'
                      ? 'border-[#8B5CF6] bg-[#8B5CF6]/10'
                      : 'border-[#27272A] bg-[#18181B] hover:border-[#3F3F46]'
                  }`}
                >
                  <CreditCard className="w-5 h-5 text-[#8B5CF6] shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-[#FAFAFA]">Online Payment</div>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Hosted PayMongo Sandbox (Card / GCash / Maya).
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Summary Column */}
        <div className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="text-base font-semibold text-[#FAFAFA]">Order Summary</h2>

          <ul className="divide-y divide-[#27272A] max-h-72 overflow-y-auto">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-[#FAFAFA] line-clamp-1">{item.name}</p>
                  <p className="text-xs text-[#A1A1AA] tabular-nums">
                    Qty {item.quantity} {item.variantName ? `· ${item.variantName}` : ''}
                  </p>
                </div>
                <span className="font-mono tabular-nums text-[#FAFAFA] shrink-0">
                  {formatCurrency(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          {/* Coupon Input */}
          <div className="border-t border-[#27272A] pt-4 space-y-2">
            <label className="text-xs text-[#A1A1AA] block">Promo / Discount Code</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="NEXORA10"
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] pl-9 pr-3 py-2 text-xs font-mono text-[#FAFAFA] focus:border-[#8B5CF6] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={validatingCoupon}
                className="rounded-lg border border-[#27272A] bg-[#18181B] px-4 py-2 text-xs font-medium text-[#FAFAFA] hover:border-[#8B5CF6] transition-colors whitespace-nowrap"
              >
                {validatingCoupon ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {appliedCoupon && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {appliedCoupon.code} applied (-{formatCurrency(appliedCoupon.discountAmount)})
                </span>
              </p>
            )}
          </div>

          <div className="space-y-2.5 border-t border-[#27272A] pt-4 text-sm">
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums text-[#FAFAFA]">
                {formatCurrency(cart.subtotal)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span className="font-mono tabular-nums">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Shipping</span>
              <span className="font-mono tabular-nums text-[#FAFAFA]">
                {shippingFee === 0 ? 'Free' : formatCurrency(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#27272A] pt-3 text-base font-semibold text-[#FAFAFA]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#8B5CF6] py-3.5 text-sm font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span>
              {submitting
                ? 'Confirming Order...'
                : paymentMethod === 'Online'
                ? 'Confirm & Continue to Payment'
                : 'Confirm Order (Cash on Delivery)'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
}
