import {
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminNavItems = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle =
    adminNavItems.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    )?.label || 'Overview';

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            to="/admin"
            className="font-display text-lg font-bold tracking-[0.14em] text-[#FAFAFA]"
          >
            NEXORA
          </Link>
          <span className="text-xs text-[#A1A1AA]">Admin</span>
        </div>

        <nav className="space-y-1" aria-label="Admin Navigation">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[#8B5CF6]/15 text-[#FAFAFA] border border-[#8B5CF6]/40'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="space-y-2 border-t border-[#27272A] pt-4">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181B] transition-colors"
        >
          <Store className="w-4 h-4" />
          <span>View Storefront</span>
        </Link>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#A1A1AA] hover:text-rose-400 hover:bg-[#18181B] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#27272A] bg-[#111114]">
        <div className="sticky top-0 h-screen overflow-y-auto">{navContent}</div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <aside className="relative z-10 w-64 bg-[#111114] border-r border-[#27272A] h-full">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-[#A1A1AA] hover:text-[#FAFAFA]"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#27272A] bg-[#09090B]/90 px-4 sm:px-6 lg:px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#27272A] text-[#A1A1AA] hover:text-[#FAFAFA]"
              aria-label="Open admin menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#A1A1AA]">Console</span>
              <span className="text-[#A1A1AA]">/</span>
              <span className="font-medium text-[#FAFAFA]">{currentTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#A1A1AA]">
            <span className="hidden sm:inline">{user?.email}</span>
            <Link
              to="/"
              className="rounded-lg border border-[#27272A] bg-[#18181B] px-3 py-1.5 text-xs font-medium text-[#FAFAFA] hover:border-[#8B5CF6] transition-colors whitespace-nowrap"
            >
              Storefront
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
