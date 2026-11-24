import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { StoreSettings } from '../types';

export function AdminSettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState('NEXORA');
  const [supportEmail, setSupportEmail] = useState('concierge@nexora.store');
  const [supportPhone, setSupportPhone] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [shippingFlatFee, setShippingFlatFee] = useState('15.00');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('250.00');
  const [codEnabled, setCodEnabled] = useState(true);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<{ settings: StoreSettings }>('/settings')
      .then((res) => {
        const s = res.data.settings;
        if (!s) return;
        setStoreName(s.storeName);
        setSupportEmail(s.supportEmail);
        setSupportPhone(s.supportPhone);
        setStoreAddress(s.storeAddress);
        setShippingFlatFee(String(s.shippingFlatFee));
        setFreeShippingThreshold(String(s.freeShippingThreshold));
        setCodEnabled(s.codEnabled);
        setOnlinePaymentEnabled(s.onlinePaymentEnabled);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.put('/admin/settings', {
        storeName: storeName.trim(),
        supportEmail: supportEmail.trim(),
        supportPhone: supportPhone.trim(),
        storeAddress: storeAddress.trim(),
        shippingFlatFee: Number(shippingFlatFee),
        freeShippingThreshold: Number(freeShippingThreshold),
        codEnabled,
        onlinePaymentEnabled,
      });
      showToast('Store configuration saved', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Failed to save settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-semibold text-[#FAFAFA]">Store Settings</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Configure store identity, shipping rules, payment gateways, and active admin profile.
        </p>
      </div>

      <div className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-2 text-xs">
        <p className="text-[#A1A1AA]">Active Administrator Profile</p>
        <p className="text-sm font-semibold text-[#FAFAFA]">{user?.name}</p>
        <p className="font-mono text-[#06B6D4]">{user?.email}</p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-5 text-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Store Name</label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-[#FAFAFA]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Support Email</label>
            <input
              type="email"
              required
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-[#FAFAFA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Support Phone</label>
            <input
              type="text"
              required
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-[#FAFAFA]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Store Headquarters</label>
            <input
              type="text"
              required
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-[#FAFAFA]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#27272A] pt-4">
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Flat Shipping Fee ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={shippingFlatFee}
              onChange={(e) => setShippingFlatFee(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 font-mono text-[#FAFAFA]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#A1A1AA] mb-1">Free Shipping Threshold ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={freeShippingThreshold}
              onChange={(e) => setFreeShippingThreshold(e.target.value)}
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 font-mono text-[#FAFAFA]"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6 border-t border-[#27272A] pt-4 text-xs text-[#FAFAFA]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={codEnabled}
              onChange={(e) => setCodEnabled(e.target.checked)}
              className="accent-[#8B5CF6]"
            />
            <span>Enable Cash on Delivery (COD)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlinePaymentEnabled}
              onChange={(e) => setOnlinePaymentEnabled(e.target.checked)}
              className="accent-[#8B5CF6]"
            />
            <span>Enable Online Payment Gateway (PayMongo)</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
