export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  sku: string;
  priceDelta: number;
  stock: number;
  attributes: Record<string, string>;
}

export interface Review {
  id: number;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
  userName: string;
}

export interface Product {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string;
  specifications: Record<string, string>;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string;
  status: 'active' | 'draft' | 'archived';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  ratingAvg: number;
  reviewCount: number;
  category?: Category | null;
  images: ProductImage[];
  variants: ProductVariant[];
  reviews?: Review[];
  createdAt: string;
}

export interface CartItem {
  id: number;
  productId: number;
  slug: string;
  name: string;
  sku: string;
  variantId: number | null;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  imageUrl: string | null;
}

export interface CartState {
  cartId: number | null;
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  freeShippingThreshold: number;
  total: number;
  itemCount: number;
}

export interface User {
  id: number;
  uid?: string | null;
  email: string;
  name: string;
  phone?: string | null;
  role: 'customer' | 'admin';
  isActive?: boolean;
  hasPassword?: boolean;
  createdAt?: string;
}

export interface Address {
  id: number;
  label: string;
  recipientName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: number;
  productId: number | null;
  variantId: number | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string;
  imageUrlSnapshot: string | null;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  userId: number;
  status: 'Pending' | 'Confirmed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  paymentMethod: 'COD' | 'Online';
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  couponCode: string | null;
  shippingRecipient: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  notes: string | null;
  trackingNumber: string | null;
  createdAt: string;
  items: OrderItem[];
  customer?: { id: number; name: string; email: string } | null;
  payment?: {
    id: number;
    provider: string;
    status: string;
    checkoutUrl: string | null;
  } | null;
}

export interface WishlistItem {
  id: number;
  productId: number;
  createdAt: string;
  product: Product;
}

export interface StoreSettings {
  id: number;
  storeName: string;
  supportEmail: string;
  supportPhone: string;
  storeAddress: string;
  shippingFlatFee: number;
  freeShippingThreshold: number;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
}

export interface Coupon {
  id: number;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxUsage: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
}
