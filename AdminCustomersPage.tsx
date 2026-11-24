import { Eye, ShieldAlert, UserCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

interface CustomerDetail {
  customer: CustomerRow;
  orders: Array<{
    id: number;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
  }>;
}

export function AdminCustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ customers: CustomerRow[] }>('/admin/customers');
      setCustomers(res.data.customers);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load customers'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleStatus = async (id: number) => {
    try {
      await api.patch(`/admin/customers/${id}/status`);
      showToast('Account status updated', 'success');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to update customer status'), 'error');
    }
  };

  const inspectCustomer = async (id: number) => {
    try {
      const res = await api.get<CustomerDetail>(`/admin/customers/${id}`);
      setDetail(res.data);
    } catch (err) {
      showToast(extractApiError(err, 'Unable to load customer details'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Customer Directory</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Inspect registered accounts, lifetime spend, purchase history, and account status.
        </p>
      </div>

      {loading ? (
        <div className="h-64 rounded-xl bg-[#18181B] animate-pulse" />
      ) : (
        <div className="rounded-xl border border-[#27272A] bg-[#111114] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
              <tr>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium text-right">Orders</th>
                <th className="px-4 py-3 font-medium text-right">Total Spent</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#FAFAFA]">{c.name}</div>
                    <div className="text-[11px] text-[#A1A1AA]">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{c.role}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                    {formatCurrency(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.isActive ? 'text-emerald-400' : 'text-rose-400'}>
                      {c.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => inspectCustomer(c.id)}
                        className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                        aria-label={`View ${c.name}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {c.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c.id)}
                          className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#8B5CF6]"
                          aria-label={c.isActive ? 'Suspend account' : 'Activate account'}
                        >
                          {c.isActive ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <div>
                <h2 className="text-base font-semibold text-[#FAFAFA]">{detail.customer.name}</h2>
                <p className="text-xs text-[#A1A1AA]">{detail.customer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-1 text-[#A1A1AA] hover:text-[#FAFAFA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-[#FAFAFA]">Purchase History</p>
              {detail.orders.length === 0 ? (
                <p className="text-xs text-[#A1A1AA]">No orders placed by this customer yet.</p>
              ) : (
                <ul className="divide-y divide-[#27272A]">
                  {detail.orders.map((o) => (
                    <li key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-[#FAFAFA]">{o.orderNumber}</span>
                        <span className="text-[#A1A1AA] ml-2">{formatDate(o.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#06B6D4]">{o.status}</span>
                        <span className="font-mono tabular-nums">{formatCurrency(o.totalAmount)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
