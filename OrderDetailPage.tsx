import { ArrowLeft, CheckCircle2, CreditCard, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResilientImage } from '../components/ResilientImage';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Order } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

const TRACKING_STEPS = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'] as const;

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  const loadOrder = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.get<{ order: Order }>(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (err) {
      showToast(extractApiError(err, 'Order not found'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setProcessingAction(true);
      await api.post(`/orders/${order.id}/cancel`);
      showToast('Order cancelled and inventory restored', 'info');
      await loadOrder();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to cancel order'), 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCompleteOnlinePayment = async () => {
    if (!order) return;
    try {
      setProcessingAction(true);
      const res = await api.post<{ checkoutUrl: string }>('/payments/checkout', {
        orderId: order.id,
      });
      if (res.data.checkoutUrl) {
        window.location.assign(res.data.checkoutUrl);
      }
    } catch (err) {
      showToast(extractApiError(err, 'Payment checkout unavailable'), 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="h-64 rounded-xl bg-[#18181B] animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <Link to="/account" className="text-sm text-[#8B5CF6]">
          Return to Account
        </Link>
      </div>
    );
  }

  const currentStepIdx = TRACKING_STEPS.indexOf(
    order.status as (typeof TRACKING_STEPS)[number]
  );
  const canCancel = ['Pending', 'Confirmed'].includes(order.status);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        to="/account"
        className="inline-flex items-center gap-2 text-xs text-[#A1A1AA] hover:text-[#FAFAFA]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Order History</span>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold font-mono text-[#FAFAFA]">
            {order.orderNumber}
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Placed on {formatDate(order.createdAt)} · {order.paymentMethod} · Payment:{' '}
            <span className="text-[#FAFAFA] font-medium">{order.paymentStatus}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {order.paymentMethod === 'Online' &&
            order.paymentStatus === 'Pending' &&
            order.status !== 'Cancelled' && (
              <button
                type="button"
                disabled={processingAction}
                onClick={handleCompleteOnlinePayment}
                className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED]"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Complete Online Payment</span>
              </button>
            )}

          {canCancel && (
            <button
              type="button"
              disabled={processingAction}
              onClick={handleCancelOrder}
              className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Order Tracking Timeline */}
      <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Order Tracking</h2>
          {order.trackingNumber && (
            <span className="text-xs font-mono text-[#06B6D4]">
              Tracking: {order.trackingNumber}
            </span>
          )}
        </div>

        {order.status === 'Cancelled' ? (
          <div className="flex items-center gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <XCircle className="w-5 h-5 shrink-0" />
            <span>This order has been cancelled. Stock reservations were released.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
            {TRACKING_STEPS.map((step, idx) => {
              const reached = idx <= currentStepIdx;
              return (
                <div
                  key={step}
                  className={`rounded-lg border p-3 text-xs ${
                    reached
                      ? 'border-[#8B5CF6]/60 bg-[#8B5CF6]/10 text-[#FAFAFA]'
                      : 'border-[#27272A] bg-[#18181B] text-[#A1A1AA]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${
                        reached ? 'text-[#06B6D4]' : 'text-[#27272A]'
                      }`}
                    />
                    <span>{step}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 rounded-xl border border-[#27272A] bg-[#111114] divide-y divide-[#27272A]">
          <div className="px-6 py-4 text-sm font-semibold text-[#FAFAFA]">Itemized Receipt</div>
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-[#27272A] bg-[#18181B]">
                  <ResilientImage
                    src={item.imageUrlSnapshot}
                    alt={item.productNameSnapshot}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#FAFAFA] line-clamp-1">
                    {item.productNameSnapshot}
                  </p>
                  <p className="text-xs text-[#A1A1AA]">
                    {item.variantNameSnapshot ? `${item.variantNameSnapshot} · ` : ''}
                    Qty {item.quantity} × {formatCurrency(item.unitPriceSnapshot)}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold tabular-nums text-[#FAFAFA]">
                {formatCurrency(item.lineTotal)}
              </span>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-2 text-sm">
            <h2 className="font-semibold text-[#FAFAFA] mb-2">Shipping Details</h2>
            <p className="text-[#FAFAFA]">{order.shippingRecipient}</p>
            <p className="text-xs font-mono text-[#A1A1AA]">{order.shippingPhone}</p>
            <p className="text-xs text-[#A1A1AA]">
              {order.shippingAddress}, {order.shippingCity} {order.shippingPostalCode}
            </p>
          </div>

          <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-2.5 text-sm">
            <h2 className="font-semibold text-[#FAFAFA] mb-2">Totals</h2>
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums text-[#FAFAFA]">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                <span className="font-mono tabular-nums">-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#A1A1AA]">
              <span>Shipping</span>
              <span className="font-mono tabular-nums text-[#FAFAFA]">
                {order.shippingFee === 0 ? 'Free' : formatCurrency(order.shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#27272A] pt-3 text-base font-semibold text-[#FAFAFA]">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatCurrency(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
