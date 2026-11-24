import { ArrowRight, Menu, ShoppingBag, User, X } from 'lucide-react';
import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { CartDrawer } from '../components/CartDrawer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api, extractApiError } from '../services/api';

export function StoreLayout() {
  const { user } = useAuth();
  const { cart, setDrawerOpen } = useCart();
  const { showToast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    try {
      setSubscribing(true);
      await api.post('/newsletter', { email: newsletterEmail.trim() });
      setNewsletterEmail('');
      showToast('Subscribed to NEXORA hardware dispatches', 'success');
    } catch (err) {
      showToast(extractApiError(err, 'Unable to subscribe'), 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
      isActive ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#09090B] text-[#FAFAFA]">
      <header className="sticky top-0 z-40 border-b border-[#27272A] bg-[#09090B]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single-element brand wordmark */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-[0.14em] text-[#FAFAFA] whitespace-nowrap shrink-0"
          >
            NEXORA
          </Link>

          {/* Zone 2: 4–5 single-line navigation links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Primary Navigation">
            <NavLink to="/catalog" className={navLinkClass}>
              Catalog
            </NavLink>
            <NavLink to="/catalog?category=audio-systems" className={navLinkClass}>
              Audio
            </NavLink>
            <NavLink to="/catalog?category=wearable-optics" className={navLinkClass}>
              Wearables
            </NavLink>
            <NavLink to="/catalog?category=precision-computing" className={navLinkClass}>
              Computing
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </nav>

          {/* Zone 3: Compact action cluster */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? '/account' : '/login'}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap shrink-0"
            >
              <User className="w-4 h-4" />
              <span>{user ? user.name.split(' ')[0] : 'Sign In'}</span>
            </Link>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">Bag ({cart.itemCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#27272A] bg-[#111114] px-4 py-4 space-y-2">
            <Link
              to="/catalog"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#FAFAFA]"
            >
              Catalog
            </Link>
            <Link
              to="/catalog?category=audio-systems"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA]"
            >
              Audio Systems
            </Link>
            <Link
              to="/catalog?category=wearable-optics"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA]"
            >
              Wearable Optics
            </Link>
            <Link
              to="/catalog?category=precision-computing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA]"
            >
              Precision Computing
            </Link>
            <Link
              to={user ? '/account' : '/login'}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-[#A1A1AA]"
            >
              {user ? 'My Account' : 'Sign In / Register'}
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-[#8B5CF6]"
              >
                Admin Console
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[#27272A] bg-[#111114] mt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-5 space-y-4">
              <Link
                to="/"
                className="font-display text-xl font-bold tracking-[0.14em] text-[#FAFAFA]"
              >
                NEXORA
              </Link>
              <p className="text-sm text-[#A1A1AA] max-w-sm leading-relaxed">
                Precision-engineered personal acoustics, titanium chronographs, and modular computing instruments built for longevity.
              </p>
              <form onSubmit={handleNewsletter} className="flex gap-2 max-w-sm pt-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email for releases"
                  className="flex-1 rounded-lg border border-[#27272A] bg-[#09090B] px-3.5 py-2 text-sm text-[#FAFAFA] placeholder:text-[#A1A1AA]/60 focus:border-[#8B5CF6] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-medium text-white hover:bg-[#7C3AED] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Join</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[#FAFAFA]">Hardware</h3>
              <ul className="space-y-2 text-sm text-[#A1A1AA]">
                <li>
                  <Link to="/catalog" className="hover:text-[#FAFAFA] transition-colors">
                    All Products
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?category=audio-systems"
                    className="hover:text-[#FAFAFA] transition-colors"
                  >
                    Audio Systems
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?category=wearable-optics"
                    className="hover:text-[#FAFAFA] transition-colors"
                  >
                    Wearables
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?category=precision-computing"
                    className="hover:text-[#FAFAFA] transition-colors"
                  >
                    Computing
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2 space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[#FAFAFA]">Customer</h3>
              <ul className="space-y-2 text-sm text-[#A1A1AA]">
                <li>
                  <Link to="/account" className="hover:text-[#FAFAFA] transition-colors">
                    Account & Orders
                  </Link>
                </li>
                <li>
                  <Link to="/account/wishlist" className="hover:text-[#FAFAFA] transition-colors">
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link to="/cart" className="hover:text-[#FAFAFA] transition-colors">
                    Shopping Bag
                  </Link>
                </li>
                <li>
                  <Link to="/checkout" className="hover:text-[#FAFAFA] transition-colors">
                    Checkout
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-semibold tracking-wider text-[#FAFAFA]">Channels</h3>
              <ul className="space-y-2 text-sm text-[#A1A1AA]">
                <li>concierge@nexora.store</li>
                <li>Singapore · Tokyo · San Francisco</li>
                <li className="flex items-center gap-4 pt-1">
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#06B6D4] transition-colors"
                  >
                    X / Twitter
                  </a>
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#06B6D4] transition-colors"
                  >
                    Instagram
                  </a>
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#06B6D4] transition-colors"
                  >
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#27272A] pt-6 text-xs text-[#A1A1AA]">
            <span>© {new Date().getFullYear()} NEXORA Hardware Inc. All rights reserved.</span>
            <span>Secured Checkout · Express Global Dispatch</span>
          </div>
        </div>
      </footer>

      <CartDrawer />
    </div>
  );
}
