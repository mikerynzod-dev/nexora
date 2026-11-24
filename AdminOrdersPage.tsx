import { Eye, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Order } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const;

export function AdminOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingDraft, setTrackingDraft] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ orders: Order[] }>(`/admin/orders?status=${filterStatus}`);
      setOrders(res.data.orders);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load orders'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const handleStatusChange = async (orderId: number, status: string, trackingNumber?: string) => {
    try {
      await api.patch(`/admin/orders/${orderId}/status`, {
        status,
        trackingNumber: trackingNumber !== undefined ? trackingNumber : undefined,
      });
      showToast(`Order status updated to ${status}`, 'success');
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: status as Order['status'], trackingNumber: trackingNumber ?? prev.trackingNumber } : null
        );
      }
    } catch (err) {
      showToast(extractApiError(err, 'Could not update order status'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Order Management</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Confirm, process, dispatch, deliver, or cancel orders with automatic inventory reconciliation.
          </p>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[#27272A] bg-[#111114] px-3.5 py-2 text-xs text-[#FAFAFA]"
        >
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-[#18181B] animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#111114] p-12 text-center text-sm text-[#A1A1AA]">
          No orders found matching this filter.
        </div>
      ) : (
        <div className="rounded-xl border border-[#27272A] bg-[#11114] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-[#FAFAFA]">{order.orderNumber}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{formatDate(order.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#FAFAFA]">{order.shippingRecipient}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{order.customer?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#FAFAFA]">{order.paymentMethod}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{order.paymentStatus}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                    {formatCurrency(order.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      disabled={order.status === 'Cancelled'}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="rounded border border-[#27272A] bg-[#09090B] px-2.5 py-1 text-xs text-[#FAFAFA] disabled:opacity-50"
                    >
                      {ORDER_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(order);
                        setTrackingDraft(order.trackingNumber || '');
                      }}
                      className="inline-flex items-center gap-1 rounded border border-[#27272A] px-2.5 py-1 text-xs text-[#FAFAFA] hover:border-[#8B5CF6]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <h2 className="font-mono text-base font-semibold text-[#FAFAFA]">
                  {selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-[#A1A1AA]">
                  {selectedOrder.shippingRecipient} · {selectedOrder.shippingPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#A1A1AA] space-y-1">
              <p className="text-[#FAFAFA] font-medium">Destination</p>
              <p>
                {selectedOrder.shippingAddress}, {selectedOrder.shippingCity}{' '}
                {selectedOrder.shippingPostalCode}
              </p>
            </div>

            <div className="divide-y divide-[#27272A] border-y border-[#27272A]">
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between text-xs">
                  <span>
                    {item.quantity}x {item.productNameSnapshot}{' '}
                    {item.variantNameSnapshot ? `(${item.variantNameSnapshot})` : ''}
                  </span>
                  <span className="font-mono tabular-nums">{formatCurrency(item.lineTotal)}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={trackingDraft}
                onChange={(e) => setTrackingDraft(e.target.value)}
                placeholder="Courier Tracking Number"
                className="flex-1 rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
              />
              <button
                type="button"
                onClick={() =>
                  handleStatusChange(selectedOrder.id, selectedOrder.status, trackingDraft.trim())
                }
                className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white"
              >
                Save Tracking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
