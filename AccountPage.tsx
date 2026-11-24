import { Heart, LogOut, MapPin, Package, Plus, Settings, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';
import type { Address, Order } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

type AccountTab = 'orders' | 'addresses' | 'settings';

export function AccountPage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AccountTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Address form
  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrRecipient, setAddrRecipient] = useState(user?.name || '');
  const [addrPhone, setAddrPhone] = useState(user?.phone || '');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPostal, setAddrPostal] = useState('');
  const [addrDefault, setAddrDefault] = useState(true);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      const [ordRes, addrRes] = await Promise.all([
        api.get<{ orders: Order[] }>('/orders/my-orders'),
        api.get<{ addresses: Address[] }>('/addresses'),
      ]);
      setOrders(ordRes.data.orders);
      setAddresses(addrRes.data.addresses);
    } catch (err) {
      showToast(extractApiError(err, 'Failed to load account data'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.patch('/auth/profile', { name: name.trim(), phone: phone.trim() || null });
      await refreshUser();
      showToast('Profile updated', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Failed to update profile'), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPassword(true);
      await api.post('/auth/change-password', {
        currentPassword: currentPassword || 'oauth-set-password',
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      await refreshUser();
      showToast('Password updated', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Unable to update password'), 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/addresses', {
        label: addrLabel,
        recipientName: addrRecipient,
        phone: addrPhone,
        street: addrStreet,
        city: addrCity,
        postalCode: addrPostal,
        isDefault: addrDefault,
      });
      setAddrStreet('');
      setAddrCity('');
      setAddrPostal('');
      showToast('Address saved', 'success');
      await loadAccountData();
    } catch (err) {
      showToast(extractApiError(err, 'Unable to save address'), 'error');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    try {
      await api.delete(`/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed', 'info');
    } catch (err) {
      showToast(extractApiError(err, 'Unable to remove address'), 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A] pb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#FAFAFA]">{user?.name}</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            {user?.email} · {user?.role === 'admin' ? 'Administrator' : 'Member Account'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/account/wishlist"
            className="inline-flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#111114] px-4 py-2 text-xs font-medium text-[#FAFAFA] hover:border-[#8B5CF6] transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-[#8B5CF6]" />
            <span>Wishlist</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-[#27272A] bg-[#111114] px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 rounded-lg border border-[#27272A] bg-[#111114] p-1">
        <button
          type="button"
          onClick={() => setTab('orders')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            tab === 'orders' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Order History ({orders.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('addresses')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            tab === 'addresses' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Saved Addresses ({addresses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            tab === 'settings' ? 'bg-[#8B5CF6] text-white' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Profile & Security</span>
        </button>
      </div>

      {tab === 'orders' && (
        <div className="space-y-4">
          {loading ? (
            <div className="h-40 rounded-xl bg-[#18181B] animate-pulse" />
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-[#27272A] bg-[#111114] p-12 text-center space-y-3">
              <p className="text-base font-medium text-[#FAFAFA]">No orders placed yet</p>
              <p className="text-sm text-[#A1A1AA]">
                Your purchases and shipment tracking numbers will appear here.
              </p>
              <Link
                to="/catalog"
                className="inline-block rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-xs font-medium text-white"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/account/orders/${order.orderNumber}`}
                  className="block rounded-xl border border-[#27272A] bg-[#111114] p-5 hover:border-[#8B5CF6]/60 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272A] pb-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#A1A1AA]">
                      <span className="font-mono text-sm font-semibold text-[#FAFAFA]">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatDate(order.createdAt)}</span>
                      <span aria-hidden="true">·</span>
                      <span>{order.paymentMethod}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span
                        className={`font-medium ${
                          order.status === 'Delivered'
                            ? 'text-emerald-400'
                            : order.status === 'Cancelled'
                            ? 'text-rose-400'
                            : 'text-[#06B6D4]'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="font-mono text-sm font-semibold tabular-nums text-[#FAFAFA]">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#A1A1AA]">
                    <span>
                      {order.items.map((i) => `${i.quantity}x ${i.productNameSnapshot}`).join(', ')}
                    </span>
                    <span className="text-[#8B5CF6]">View & Track Order →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'addresses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-3">
            {addresses.length === 0 ? (
              <div className="rounded-xl border border-[#27272A] bg-[#111114] p-8 text-center text-sm text-[#A1A1AA]">
                No saved addresses yet. Add a primary shipping destination on the right.
              </div>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-[#27272A] bg-[#111114] p-5"
                >
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#FAFAFA]">{addr.label}</span>
                      {addr.isDefault && (
                        <span className="text-xs text-[#06B6D4]">· Default</span>
                      )}
                    </div>
                    <p className="text-[#FAFAFA]">{addr.recipientName}</p>
                    <p className="text-xs text-[#A1A1AA]">
                      {addr.street}, {addr.city} {addr.postalCode}, {addr.country}
                    </p>
                    <p className="text-xs font-mono text-[#A1A1AA]">{addr.phone}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="p-2 text-[#A1A1AA] hover:text-rose-400 transition-colors"
                    aria-label="Delete address"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleAddAddress}
            className="lg:col-span-5 rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-[#FAFAFA] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#8B5CF6]" />
              <span>Add Shipping Address</span>
            </h2>
            <input
              type="text"
              required
              value={addrLabel}
              onChange={(e) => setAddrLabel(e.target.value)}
              placeholder="Label (e.g., Home, Studio)"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA]"
            />
            <input
              type="text"
              required
              value={addrRecipient}
              onChange={(e) => setAddrRecipient(e.target.value)}
              placeholder="Recipient Name"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA]"
            />
            <input
              type="tel"
              required
              value={addrPhone}
              onChange={(e) => setAddrPhone(e.target.value)}
              placeholder="Contact Number"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA]"
            />
            <input
              type="text"
              required
              value={addrStreet}
              onChange={(e) => setAddrStreet(e.target.value)}
              placeholder="Street Address"
              className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA]"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={addrCity}
                onChange={(e) => setAddrCity(e.target.value)}
                placeholder="City"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA]"
              />
              <input
                type="text"
                required
                value={addrPostal}
                onChange={(e) => setAddrPostal(e.target.value)}
                placeholder="Postal Code"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm font-mono text-[#FAFAFA]"
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              <input
                type="checkbox"
                checked={addrDefault}
                onChange={(e) => setAddrDefault(e.target.checked)}
                className="accent-[#8B5CF6]"
              />
              <span>Set as default shipping address</span>
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-[#8B5CF6] py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] transition-colors"
            >
              Save Address
            </button>
          </form>
        </div>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#FAFAFA]">Profile Information</h2>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA]"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50"
            >
              {savingProfile ? 'Saving...' : 'Update Profile'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="rounded-xl border border-[#27272A] bg-[#111114] p-6 space-y-4"
          >
            <h2 className="text-base font-semibold text-[#FAFAFA]">Password Security</h2>
            {user?.hasPassword && (
              <div>
                <label className="block text-xs text-[#A1A1AA] mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA]"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2.5 text-sm text-[#FAFAFA]"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-lg border border-[#27272A] bg-[#18181B] px-5 py-2.5 text-xs font-medium text-[#FAFAFA] hover:border-[#8B5CF6]"
            >
              {savingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
