import { pgEnum } from "drizzle-orm/pg-core";

// ==================== USER & AUTH ENUMS ====================
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "user"]);

// ==================== ORDER ENUMS ====================
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "processing",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "credit_card",
  "debit_card",
  "paypal",
  "stripe",
  "cash_on_delivery",
  "bank_transfer",
]);

// ==================== CART ENUMS ====================
export const cartStatusEnum = pgEnum("cart_status", ["active", "abandoned", "converted", "expired"]);

// ==================== REFUND & RETURN ENUMS ====================
export const refundStatusEnum = pgEnum("refund_status", ["pending", "approved", "rejected", "processed"]);
export const returnStatusEnum = pgEnum("return_status", ["requested", "approved", "rejected", "received", "refunded", "cancelled"]);

// ==================== DISCOUNT ENUMS ====================
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed_amount", "free_shipping"]);
export const discountScopeEnum = pgEnum("discount_scope", ["all", "products", "categories", "collections", "customer_groups"]);
export const discountStatusEnum = pgEnum("discount_status", ["draft", "active", "expired", "archived"]);

// ==================== SHIPPING ENUMS ====================
export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "processing",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
]);

// ==================== NOTIFICATION & EMAIL ENUMS ====================
export const notificationTypeEnum = pgEnum("notification_type", [
  "order_created",
  "order_updated",
  "order_shipped",
  "order_delivered",
  "product_review",
  "customer_registered",
  "shipment_created",
  "newsletter_subscribed",
  "contact_message",
  "low_stock",
  "system_alert",
  "promotional",
]);

export const notificationStatusEnum = pgEnum("notification_status", ["unread", "read", "archived"]);

export const emailStatusEnum = pgEnum("email_status", ["pending", "sent", "failed", "bounced"]);

// ==================== AUDIT & SYSTEM ENUMS ====================
export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "password_change",
  "permission_change",
  "settings_change",
  "backup_create",
  "backup_restore",
]);

// ==================== PRODUCT ENUMS ====================
export const productStatusEnum = pgEnum("product_status", ["draft", "active", "inactive", "archived"]);

export const stockStatusEnum = pgEnum("stock_status", ["in_stock", "out_of_stock", "low_stock", "preorder"]);

// ==================== BACKUP & HEALTH ENUMS ====================
export const backupStatusEnum = pgEnum("backup_status", ["pending", "in_progress", "completed", "failed"]);

export const healthCheckStatusEnum = pgEnum("health_check_status", ["healthy", "degraded", "unhealthy"]);

// ==================== STORY ENUMS ====================
export const storyStatusEnum = pgEnum("story_status", ["draft", "published", "archived"]);

// ==================== COMMUNICATION ENUMS ====================
export const newsletterSubscriberStatusEnum = pgEnum("newsletter_subscriber_status", [
  "pending",
  "confirmed",
  "unsubscribed",
]);

export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "new",
  "open",
  "closed",
  "spam",
]);

export const contactPriorityEnum = pgEnum("contact_priority", ["low", "normal", "high"]);
