import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as adminController from '../controllers/adminController.ts';
import * as authController from '../controllers/authController.ts';
import * as cartController from '../controllers/cartController.ts';
import * as catalogController from '../controllers/catalogController.ts';
import * as orderController from '../controllers/orderController.ts';
import * as paymentController from '../controllers/paymentController.ts';
import * as userFeatureController from '../controllers/userFeatureController.ts';
import { authenticateOptional, requireAdmin, requireAuth } from '../middleware/auth.ts';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Authentication
router.post('/auth/register', authLimiter, authController.registerCustomer);
router.post('/auth/login', authLimiter, authController.loginUser);
router.post('/auth/logout', authController.logoutUser);
router.get('/auth/admin-status', authController.getAdminSetupStatus);
router.post('/auth/claim-admin', authLimiter, authController.claimInitialAdmin);
router.get('/auth/me', requireAuth, authController.getMe);
router.patch('/auth/profile', requireAuth, authController.updateProfile);
router.post('/auth/change-password', requireAuth, authController.changePassword);

// Public Storefront Settings & Newsletter
router.get('/settings', catalogController.getPublicSettings);
router.post('/newsletter', userFeatureController.subscribeNewsletter);

// Products
router.get('/products', authenticateOptional, catalogController.listProducts);
router.get('/products/:id', catalogController.getProductDetail);
router.post('/products', requireAuth, requireAdmin, catalogController.createProduct);
router.put('/products/:id', requireAuth, requireAdmin, catalogController.updateProduct);
router.delete('/products/:id', requireAuth, requireAdmin, catalogController.deleteProduct);

// Categories
router.get('/categories', catalogController.listCategories);
router.post('/categories', requireAuth, requireAdmin, catalogController.createCategory);
router.put('/categories/:id', requireAuth, requireAdmin, catalogController.updateCategory);
router.delete('/categories/:id', requireAuth, requireAdmin, catalogController.deleteCategory);

// Cart
router.get('/cart', authenticateOptional, cartController.getCart);
router.post('/cart/items', authenticateOptional, cartController.addCartItem);
router.patch('/cart/items/:id', authenticateOptional, cartController.updateCartItem);
router.delete('/cart/items/:id', authenticateOptional, cartController.removeCartItem);
router.post('/cart/merge', requireAuth, cartController.mergeGuestCart);
router.post('/cart/validate-coupon', authenticateOptional, cartController.validateCoupon);

// Orders
router.post('/orders', requireAuth, orderController.createOrder);
router.get('/orders/my-orders', requireAuth, orderController.getMyOrders);
router.get('/orders/:id', requireAuth, orderController.getOrderDetail);
router.post('/orders/:id/cancel', requireAuth, orderController.cancelMyOrder);

// Payments
router.post('/payments/checkout', paymentLimiter, requireAuth, paymentController.createCheckoutSession);
router.post('/payments/webhook', paymentController.handlePaymongoWebhook);

// Wishlist
router.get('/wishlist', requireAuth, userFeatureController.getWishlist);
router.post('/wishlist', requireAuth, userFeatureController.addToWishlist);
router.delete('/wishlist/:id', requireAuth, userFeatureController.removeFromWishlist);

// Reviews
router.get('/products/:id/reviews', userFeatureController.getProductReviews);
router.post('/reviews', requireAuth, userFeatureController.createReview);

// Saved Addresses
router.get('/addresses', requireAuth, userFeatureController.listAddresses);
router.post('/addresses', requireAuth, userFeatureController.createAddress);
router.delete('/addresses/:id', requireAuth, userFeatureController.deleteAddress);

// Admin Management
router.get('/admin/dashboard', requireAuth, requireAdmin, adminController.getAdminDashboard);
router.get('/admin/orders', requireAuth, requireAdmin, adminController.listAllOrders);
router.patch('/admin/orders/:id/status', requireAuth, requireAdmin, adminController.updateOrderStatus);
router.get('/admin/customers', requireAuth, requireAdmin, adminController.listCustomers);
router.get('/admin/customers/:id', requireAuth, requireAdmin, adminController.getCustomerDetails);
router.patch('/admin/customers/:id/status', requireAuth, requireAdmin, adminController.toggleCustomerStatus);
router.get('/admin/inventory', requireAuth, requireAdmin, adminController.getInventoryOverview);
router.post('/admin/inventory/adjust', requireAuth, requireAdmin, adminController.adjustInventory);
router.get('/admin/coupons', requireAuth, requireAdmin, adminController.listCoupons);
router.post('/admin/coupons', requireAuth, requireAdmin, adminController.createCoupon);
router.patch('/admin/coupons/:id/toggle', requireAuth, requireAdmin, adminController.toggleCouponStatus);
router.delete('/admin/coupons/:id', requireAuth, requireAdmin, adminController.deleteCoupon);
router.get('/admin/reports', requireAuth, requireAdmin, adminController.getAdminReports);
router.put('/admin/settings', requireAuth, requireAdmin, adminController.updateStoreSettings);

export default router;
