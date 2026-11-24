import { Plus, Power, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Coupon } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

export function AdminCouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrderAmount, setMinOrderAmount] = useState('100');
  const [maxUsage, setMaxUsage] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get<{ coupons: Coupon[] }>('/admin/coupons');
      setCoupons(res.data.coupons);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load coupons'), 'error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.post('/admin/coupons', {
        code: code.trim().toUpperCase(),
        discountType,
        discountValue: Number(discountValue),
        minOrderAmount: Number(minOrderAmount || 0),
        maxUsage: maxUsage ? Number(maxUsage) : null,
        expiresAt: expiresAt || null,
        isActive: true,
      });
      setCode('');
      showToast('Coupon created', 'success');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Could not create coupon'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.patch(`/admin/coupons/${id}/toggle`);
      showToast('Coupon status updated', 'info');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to toggle coupon'), 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/admin/coupons/${id}`);
      showToast('Coupon deleted', 'info');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to delete coupon'), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Coupon Management</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Configure percentage or fixed promotional codes with usage limits and expiration dates.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 rounded-xl border border-[#27272A] bg-[#111114] overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Min Order</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {coupons.map((c) => (
                <tr key={c.id} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-[#FAFAFA]">{c.code}</div>
                    {c.expiresAt && (
                      <div className="text-[11px] text-[#A1A1AA]">Exp {formatDate(c.expiresAt)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#06B6D4]">
                    {c.discountType === 'percentage'
                      ? `${c.discountValue}%`
                      : formatCurrency(c.discountValue)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#A1A1AA]">
                    {formatCurrency(c.minOrderAmount)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-[#FAFAFA]">
                    {c.usedCount} / {c.maxUsage ?? '∞'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={c.isActive ? 'text-emerald-400' : 'text-[#A1A1AA]'}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(c.id)}
                        className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
                        aria-label={`Toggle ${c.code}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded border border-[#27272A] text-[#A1A1AA] hover:text-rose-400"
                        aria-label={`Delete ${c.code}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form
          onSubmit={handleCreate}
          className="lg:col-span-4 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#8B5CF6]" />
            <span>New Coupon</span>
          </h2>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FUTURE20"
            className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
              className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs text-[#FAFAFA]"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed ($)</option>
            </select>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder="Value"
              className="rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-[#A1A1AA] mb-1">Min Order ($)</label>
              <input
                type="number"
                min="0"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#A1A1AA] mb-1">Max Uses</label>
              <input
                type="number"
                min="1"
                value={maxUsage}
                onChange={(e) => setMaxUsage(e.target.value)}
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-[#A1A1AA] mb-1">Expiry Date (Optional)</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-[#8B5CF6] py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED]"
          >
            {saving ? 'Creating...' : 'Create Coupon'}
          </button>
        </form>
      </div>
    </div>
  );
}
