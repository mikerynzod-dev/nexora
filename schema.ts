import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    uid: text('uid').unique(),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    phone: text('phone'),
    passwordHash: text('password_hash'),
    role: text('role').notNull().default('customer'), // 'customer' | 'admin'
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('users_email_idx').on(table.email), index('users_role_idx').on(table.role)]
);

export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    imageUrl: text('image_url'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('categories_slug_idx').on(table.slug)]
);

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .references(() => categories.id, { onDelete: 'restrict' })
      .notNull(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    specifications: jsonb('specifications').$type<Record<string, string>>().default({}).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    compareAtPrice: numeric('compare_at_price', { precision: 12, scale: 2 }),
    stock: integer('stock').notNull().default(0),
    sku: text('sku').notNull().unique(),
    status: text('status').notNull().default('active'), // 'active' | 'draft' | 'archived'
    isFeatured: boolean('is_featured').notNull().default(false),
    isNewArrival: boolean('is_new_arrival').notNull().default(false),
    isBestSeller: boolean('is_best_seller').notNull().default(false),
    ratingAvg: numeric('rating_avg', { precision: 3, scale: 2 }).notNull().default('0.00'),
    reviewCount: integer('review_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('products_category_idx').on(table.categoryId),
    index('products_status_idx').on(table.status),
    index('products_slug_idx').on(table.slug),
  ]
);

export const productImages = pgTable(
  'product_images',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    url: text('url').notNull(),
    altText: text('alt_text'),
    isPrimary: boolean('is_primary').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('product_images_product_idx').on(table.productId)]
);

export const productVariants = pgTable(
  'product_variants',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    sku: text('sku').notNull().unique(),
    priceDelta: numeric('price_delta', { precision: 12, scale: 2 }).notNull().default('0.00'),
    stock: integer('stock').notNull().default(0),
    attributes: jsonb('attributes').$type<Record<string, string>>().default({}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('product_variants_product_idx').on(table.productId)]
);

export const carts = pgTable(
  'carts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .unique(),
    sessionId: text('session_id').unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('carts_user_idx').on(table.userId), index('carts_session_idx').on(table.sessionId)]
);

export const cartItems = pgTable(
  'cart_items',
  {
    id: serial('id').primaryKey(),
    cartId: integer('cart_id')
      .references(() => carts.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    quantity: integer('quantity').notNull().default(1),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('cart_items_cart_idx').on(table.cartId)]
);

export const addresses = pgTable(
  'addresses',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    label: text('label').notNull().default('Primary'),
    recipientName: text('recipient_name').notNull(),
    phone: text('phone').notNull(),
    street: text('street').notNull(),
    city: text('city').notNull(),
    postalCode: text('postal_code').notNull(),
    country: text('country').notNull().default('Philippines'),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('addresses_user_idx').on(table.userId)]
);

export const coupons = pgTable(
  'coupons',
  {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(),
    discountType: text('discount_type').notNull(), // 'percentage' | 'fixed'
    discountValue: numeric('discount_value', { precision: 12, scale: 2 }).notNull(),
    minOrderAmount: numeric('min_order_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    maxUsage: integer('max_usage'),
    usedCount: integer('used_count').notNull().default(0),
    expiresAt: timestamp('expires_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('coupons_code_idx').on(table.code)]
);

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'restrict' })
      .notNull(),
    status: text('status').notNull().default('Pending'), // Pending | Confirmed | Processing | Shipped | Delivered | Cancelled
    paymentMethod: text('payment_method').notNull(), // COD | Online
    paymentStatus: text('payment_status').notNull().default('Pending'), // Pending | Paid | Failed | Refunded
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
    discountAmount: numeric('discount_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
    shippingFee: numeric('shipping_fee', { precision: 12, scale: 2 }).notNull().default('0.00'),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    couponId: integer('coupon_id').references(() => coupons.id, { onDelete: 'set null' }),
    couponCode: text('coupon_code'),
    shippingRecipient: text('shipping_recipient').notNull(),
    shippingPhone: text('shipping_phone').notNull(),
    shippingAddress: text('shipping_address').notNull(),
    shippingCity: text('shipping_city').notNull(),
    shippingPostalCode: text('shipping_postal_code').notNull(),
    notes: text('notes'),
    trackingNumber: text('tracking_number'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_user_idx').on(table.userId),
    index('orders_status_idx').on(table.status),
    index('orders_created_idx').on(table.createdAt),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    variantNameSnapshot: text('variant_name_snapshot'),
    skuSnapshot: text('sku_snapshot').notNull(),
    imageUrlSnapshot: text('image_url_snapshot'),
    unitPriceSnapshot: numeric('unit_price_snapshot', { precision: 12, scale: 2 }).notNull(),
    quantity: integer('quantity').notNull(),
    lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)]
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'restrict' })
      .notNull(),
    provider: text('provider').notNull(), // 'cod' | 'paymongo'
    providerReference: text('provider_reference').unique(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    status: text('status').notNull().default('Pending'), // Pending | Paid | Failed | Refunded
    idempotencyKey: text('idempotency_key').notNull().unique(),
    checkoutUrl: text('checkout_url'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('payments_order_idx').on(table.orderId)]
);

export const wishlists = pgTable(
  'wishlists',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('wishlists_user_product_uidx').on(table.userId, table.productId),
    index('wishlists_user_idx').on(table.userId),
  ]
);

export const reviews = pgTable(
  'reviews',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id').references(() => orders.id, { onDelete: 'set null' }),
    rating: integer('rating').notNull(),
    title: text('title').notNull(),
    comment: text('comment').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('reviews_user_product_uidx').on(table.userId, table.productId),
    index('reviews_product_idx').on(table.productId),
  ]
);

export const couponUsages = pgTable(
  'coupon_usages',
  {
    id: serial('id').primaryKey(),
    couponId: integer('coupon_id')
      .references(() => coupons.id, { onDelete: 'cascade' })
      .notNull(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    discountApplied: numeric('discount_applied', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('coupon_usages_coupon_idx').on(table.couponId)]
);

export const inventoryLogs = pgTable(
  'inventory_logs',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .references(() => products.id, { onDelete: 'cascade' })
      .notNull(),
    variantId: integer('variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
    changeAmount: integer('change_amount').notNull(),
    previousStock: integer('previous_stock').notNull(),
    newStock: integer('new_stock').notNull(),
    reason: text('reason').notNull(),
    referenceId: text('reference_id'),
    actorUserId: integer('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('inventory_logs_product_idx').on(table.productId)]
);

export const storeSettings = pgTable('store_settings', {
  id: serial('id').primaryKey(),
  storeName: text('store_name').notNull().default('NEXORA'),
  supportEmail: text('support_email').notNull().default('concierge@nexora.store'),
  supportPhone: text('support_phone').notNull().default('+1 (800) 555-0194'),
  storeAddress: text('store_address').notNull().default('880 Obsidian Way, Suite 400, Singapore'),
  shippingFlatFee: numeric('shipping_flat_fee', { precision: 12, scale: 2 }).notNull().default('15.00'),
  freeShippingThreshold: numeric('free_shipping_threshold', { precision: 12, scale: 2 }).notNull().default('250.00'),
  codEnabled: boolean('cod_enabled').notNull().default(true),
  onlinePaymentEnabled: boolean('online_payment_enabled').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  addresses: many(addresses),
  orders: many(orders),
  wishlists: many(wishlists),
  reviews: many(reviews),
  cart: one(carts, { fields: [users.id], references: [carts.userId] }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
  inventoryLogs: many(inventoryLogs),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, { fields: [carts.userId], references: [users.id] }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  coupon: one(coupons, { fields: [orders.couponId], references: [coupons.id] }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const wishlistsRelations = relations(wishlists, ({ one }) => ({
  user: one(users, { fields: [wishlists.userId], references: [users.id] }),
  product: one(products, { fields: [wishlists.productId], references: [products.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));
