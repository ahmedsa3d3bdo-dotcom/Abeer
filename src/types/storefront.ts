/**
 * Storefront TypeScript Type Definitions
 */

// ==================== PRODUCT TYPES ====================
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  serialNumber?: string;
  description: string;
  shortDescription: string;
  specMaterial?: string;
  specColor?: string;
  specDimensions?: string;
  specStyle?: string;
  specIdealFor?: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: Category[];
  status: "draft" | "active" | "inactive" | "archived";
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "preorder";
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  metaTitle?: string;
  metaDescription?: string;
}

export interface ProductCard {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  isOnSale?: boolean;
  primaryImage: string;
  images: string[];
  rating: number;
  reviewCount: number;
  stockStatus: string;
  isFeatured: boolean;
  badge?: "new" | "sale" | "low-stock";
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string;
  price: number;
  stockQuantity: number;
  options: Record<string, string>; // { size: 'M', color: 'Blue' }
  image?: string;
  isActive: boolean;
}

// ==================== CATEGORY TYPES ====================
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  productCount?: number;
}

// ==================== CART TYPES ====================
export interface Cart {
  id: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  appliedDiscounts?: AppliedDiscount[];
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isGift?: boolean;
  giftDiscountId?: string;
  image: string;
  maxQuantity: number; // Based on stock
}

export interface AppliedDiscount {
  id: string;
  code: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: number;
  amount: number;
  isAutomatic?: boolean;
}

// ==================== ORDER TYPES ====================
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethod: ShippingMethod;
  trackingNumber?: string;
  createdAt: string;
  estimatedDelivery?: string;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  variantName?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string;
}

// ==================== ADDRESS TYPES ====================
export interface Address {
  id?: string;
  firstName: string;
  lastName: string;
  company?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
}

// ==================== SHIPPING TYPES ====================
export interface ShippingMethod {
  id: string;
  name: string;
  description?: string;
  price: number;
  estimatedDays?: number;
  carrier?: string;
}

// ==================== USER TYPES ====================
export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  defaultShippingAddressId?: string;
  defaultBillingAddressId?: string;
}

// ==================== REVIEW TYPES ====================
export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  content: string;
  images: ReviewImage[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewImage {
  id: string;
  url: string;
  altText?: string;
}

// ==================== FILTER TYPES ====================
export interface ProductFilters {
  categories?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  inStock?: boolean;
  attributes?: Record<string, string[]>;
}

export interface SearchParams {
  query?: string;
  filters?: ProductFilters;
  sort?:
    | "relevance"
    | "price_asc"
    | "price_desc"
    | "newest"
    | "rating"
    | "popular";
  page?: number;
  limit?: number;
}

// ==================== API RESPONSE TYPES ====================
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductListResponse extends PaginatedResponse<ProductCard> {}

export interface CategoryListResponse {
  categories: Category[];
}

// ==================== WISHLIST TYPES ====================
export interface WishlistItem {
  id: string;
  productId: string;
  product: ProductCard;
  addedAt: string;
}
