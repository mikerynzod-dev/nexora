import { AlertTriangle, Minus, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import { formatDate } from '../utils/format';

interface InventoryProduct {
  id: number;
  name: string;
  sku: string;
  categoryName: string;
  stock: number;
  price: number;
  status: string;
}

interface InventoryLog {
  id: number;
  productId: number;
  productName: string;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export function AdminInventoryPage() {
  const { showToast } = useToast();
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<string>('10');
  const [reason, setReason] = useState<string>('Warehouse restock');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ inventory: InventoryProduct[]; logs: InventoryLog[] }>(
        '/admin/inventory'
      );
      setInventory(res.data.inventory);
      setLogs(res.data.logs);
      if (res.data.inventory[0] && selectedProductId === 0) {
        setSelectedProductId(res.data.inventory[0].id);
      }
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load inventory'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjust = async (e: React.FormEvent, deltaOverride?: number) => {
    e.preventDefault();
    const delta = deltaOverride ?? Number(changeAmount);
    if (!selectedProductId || !delta || Number.isNaN(delta)) {
      showToast('Enter a valid non-zero stock adjustment', 'error');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/admin/inventory/adjust', {
        productId: Number(selectedProductId),
        changeAmount: delta,
        reason: reason.trim() || 'Manual inventory adjustment',
      });
      showToast('Stock level updated', 'success');
      await load();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to adjust stock'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Inventory Control</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Monitor stock thresholds, restock or deduct units, and inspect the immutable inventory ledger.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 rounded-xl border border-[#27272A] bg-[#111114] overflow-x-auto">
          {loading ? (
            <div className="h-64 bg-[#18181B] animate-pulse" />
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium text-right">Stock</th>
                  <th className="px-4 py-3 font-medium">Alert</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A]">
                {inventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[#18181B]/60">
                    <td className="px-4 py-3 font-medium text-[#FAFAFA]">{item.name}</td>
                    <td className="px-4 py-3 font-mono text-[#A1A1AA]">{item.sku}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                      {item.stock}
                    </td>
                    <td className="px-4 py-3">
                      {item.stock <= 10 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{item.stock === 0 ? 'Depleted' : 'Low Stock'}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400">Nominal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={(e) => handleAdjust(e)}
          className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Adjust Stock Level</h2>

          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Product</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs text-[#FAFAFA]"
            >
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.stock} units)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Quantity Delta (positive or negative)</label>
            <input
              type="number"
              required
              value={changeAmount}
              onChange={(e) => setChangeAmount(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs font-mono text-[#FAFAFA]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Audit Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3 py-2 text-xs text-[#FAFAFA]"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#8B5CF6] py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Apply Adjustment</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={(e) => handleAdjust(e, -Math.abs(Number(changeAmount) || 1))}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#27272A] bg-[#18181B] px-4 py-2.5 text-xs text-[#FAFAFA] hover:border-rose-400"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Deduct</span>
            </button>
          </div>
        </form>
      </div>

      {/* Inventory Audit Ledger */}
      <div className="rounded-xl border border-[#27272A] bg-[#111114] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272A]">
          <h2 className="text-sm font-semibold text-[#FAFAFA]">Recent Inventory Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#27272A] bg-[#18181B] text-[#A1A1AA]">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium text-right">Change</th>
                <th className="px-4 py-3 font-medium text-right">Result Stock</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#18181B]/60">
                  <td className="px-4 py-3 text-[#A1A1AA]">{formatDate(log.createdAt)}</td>
                  <td className="px-4 py-3 text-[#FAFAFA]">{log.productName}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono tabular-nums ${
                      log.changeAmount > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {log.changeAmount > 0 ? `+${log.changeAmount}` : log.changeAmount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-[#FAFAFA]">
                    {log.newStock}
                  </td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{log.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
