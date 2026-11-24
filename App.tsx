import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminCategoriesPage } from './admin/AdminCategoriesPage';
import { AdminCouponsPage } from './admin/AdminCouponsPage';
import { AdminCustomersPage } from './admin/AdminCustomersPage';
import { AdminInventoryPage } from './admin/AdminInventoryPage';
import { AdminOrdersPage } from './admin/AdminOrdersPage';
import { AdminOverviewPage } from './admin/AdminOverviewPage';
import { AdminProductsPage } from './admin/AdminProductsPage';
import { AdminReportsPage } from './admin/AdminReportsPage';
import { AdminSettingsPage } from './admin/AdminSettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';
import { AdminLayout } from './layouts/AdminLayout';
import { StoreLayout } from './layouts/StoreLayout';
import { AccountPage } from './pages/AccountPage';
import { AuthPage } from './pages/AuthPage';
import { CartPage } from './pages/CartPage';
import { CatalogPage } from './pages/CatalogPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WishlistPage } from './pages/WishlistPage';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <Routes>
                {/* Customer Storefront */}
                <Route element={<StoreLayout />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/products/:id" element={<ProductDetailPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/login" element={<AuthPage />} />
                  <Route path="/register" element={<AuthPage />} />

                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <CheckoutPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <AccountPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/wishlist"
                    element={
                      <ProtectedRoute>
                        <WishlistPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account/orders/:id"
                    element={
                      <ProtectedRoute>
                        <OrderDetailPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Administrator Console */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }
                >
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="products" element={<AdminProductsPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="inventory" element={<AdminInventoryPage />} />
                  <Route path="customers" element={<AdminCustomersPage />} />
                  <Route path="coupons" element={<AdminCouponsPage />} />
                  <Route path="reports" element={<AdminReportsPage />} />
                  <Route path="settings" element={<AdminSettingsPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
