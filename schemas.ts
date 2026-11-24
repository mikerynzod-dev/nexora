import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email address is required').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  phone: z.string().trim().max(30).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const claimAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(8, 'Admin password must be at least 8 characters').max(128),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40).default('Primary'),
  recipientName: z.string().trim().min(2, 'Recipient name is required').max(100),
  phone: z.string().trim().min(6, 'Contact phone is required').max(30),
  street: z.string().trim().min(4, 'Street address is required').max(200),
  city: z.string().trim().min(2, 'City is required').max(100),
  postalCode: z.string().trim().min(3, 'Postal code is required').max(20),
  country: z.string().trim().min(2).max(80).default('Philippines'),
  isDefault: z.boolean().optional().default(false),
});

export const addToCartSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const createOrderSchema = z.object({
  paymentMethod: z.enum(['COD', 'Online']),
  shippingRecipient: z.string().trim().min(2, 'Recipient name is required').max(100),
  shippingPhone: z.string().trim().min(6, 'Contact number is required').max(30),
  shippingAddress: z.string().trim().min(4, 'Shipping address is required').max(250),
  shippingCity: z.string().trim().min(2, 'City is required').max(100),
  shippingPostalCode: z.string().trim().min(3, 'Postal code is required').max(20),
  couponCode: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2, 'Review title is required').max(120),
  comment: z.string().trim().min(5, 'Review comment must be at least 5 characters').max(1500),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(400).optional().nullable(),
  imageUrl: z.string().trim().max(500).optional().nullable(),
});

export const productSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(2).max(140),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().min(10).max(4000),
  specifications: z.record(z.string(), z.string()).default({}),
  price: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((v) => !Number.isNaN(v) && v >= 0),
  compareAtPrice: z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((v) => (v === null || v === undefined || v === '' ? null : Number(v))),
  stock: z.number().int().min(0),
  sku: z.string().trim().min(2).max(60),
  status: z.enum(['active', 'draft', 'archived']).default('active'),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  images: z
    .array(
      z.object({
        url: z.string().trim().min(1),
        altText: z.string().optional().nullable(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        sku: z.string().trim().min(1),
        priceDelta: z.union([z.number(), z.string()]).transform((v) => Number(v)).default(0),
        stock: z.number().int().min(0),
        attributes: z.record(z.string(), z.string()).default({}),
      })
    )
    .optional(),
});

export const couponSchema = z.object({
  code: z.string().trim().min(3).max(40).transform((s) => s.toUpperCase()),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((v) => v > 0),
  minOrderAmount: z.union([z.number(), z.string()]).transform((v) => Number(v)).default(0),
  maxUsage: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
});

export const adjustInventorySchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().nullable().optional(),
  changeAmount: z.number().int().refine((v) => v !== 0, 'Change amount cannot be zero'),
  reason: z.string().trim().min(2).max(200),
});

export const storeSettingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80),
  supportEmail: z.string().trim().email(),
  supportPhone: z.string().trim().min(4).max(40),
  storeAddress: z.string().trim().min(4).max(200),
  shippingFlatFee: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((v) => v >= 0),
  freeShippingThreshold: z.union([z.number(), z.string()]).transform((v) => Number(v)).refine((v) => v >= 0),
  codEnabled: z.boolean(),
  onlinePaymentEnabled: z.boolean(),
});
