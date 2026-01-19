import { relations } from "drizzle-orm";
import {
  users,
  roles,
  permissions,
  userRoles,
  rolePermissions,
  sessions,
  passwordResetTokens,
  categories,
  products,
  productVariants,
  productImages,
  productCategories,
  inventory,
  orders,
  orderItems,
  shippingAddresses,
  shippingMethods,
  shipments,
  trackingUpdates,
  productReviews,
  reviewImages,
  discounts,
  discountProducts,
  discountCategories,
  orderDiscounts,
  orderItemDiscounts,
  refunds,
  refundItems,
  returns,
  returnItems,
  stories,
  storyViews,
  notifications,
  emailLogs,
  emailTemplates,
  systemSettings,
  auditLogs,
  backups,
  healthChecks,
  wishlists,
  wishlistItems,
} from "./schema";

// ==================== USER RELATIONS ====================
export const usersRelations = relations(users, ({ many }) => ({
  userRoles: many(userRoles),
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  createdProducts: many(products, { relationName: "productCreator" }),
  updatedProducts: many(products, { relationName: "productUpdater" }),
  orders: many(orders),
  shippingAddresses: many(shippingAddresses),
  productReviews: many(productReviews),
  stories: many(stories),
  storyViews: many(storyViews),
  notifications: many(notifications),
  emailLogs: many(emailLogs),
  auditLogs: many(auditLogs),
  backups: many(backups),
  wishlists: many(wishlists),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
  assignedByUser: one(users, {
    fields: [userRoles.assignedBy],
    references: [users.id],
    relationName: "roleAssigner",
  }),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
  grantedByUser: one(users, {
    fields: [rolePermissions.grantedBy],
    references: [users.id],
    relationName: "permissionGranter",
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

// ==================== CATEGORY RELATIONS ====================
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "subcategories",
  }),
  children: many(categories, { relationName: "subcategories" }),
  productCategories: many(productCategories),
}));

// ==================== PRODUCT RELATIONS ====================
export const productsRelations = relations(products, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [products.createdBy],
    references: [users.id],
    relationName: "productCreator",
  }),
  updatedBy: one(users, {
    fields: [products.updatedBy],
    references: [users.id],
    relationName: "productUpdater",
  }),
  variants: many(productVariants),
  images: many(productImages),
  productCategories: many(productCategories),
  inventory: many(inventory),
  orderItems: many(orderItems),
  reviews: many(productReviews),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: many(inventory),
  orderItems: many(orderItems),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  product: one(products, {
    fields: [productCategories.productId],
    references: [products.id],
  }),
  category: one(categories, {
    fields: [productCategories.categoryId],
    references: [categories.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

// ==================== ORDER RELATIONS ====================
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  orderItems: many(orderItems),
  shipments: many(shipments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// ==================== SHIPPING RELATIONS ====================
export const shippingAddressesRelations = relations(shippingAddresses, ({ one }) => ({
  user: one(users, {
    fields: [shippingAddresses.userId],
    references: [users.id],
  }),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({ many }) => ({
  shipments: many(shipments),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  order: one(orders, {
    fields: [shipments.orderId],
    references: [orders.id],
  }),
  shippingMethod: one(shippingMethods, {
    fields: [shipments.shippingMethodId],
    references: [shippingMethods.id],
  }),
  trackingUpdates: many(trackingUpdates),
}));

export const trackingUpdatesRelations = relations(trackingUpdates, ({ one }) => ({
  shipment: one(shipments, {
    fields: [trackingUpdates.shipmentId],
    references: [shipments.id],
  }),
}));

// ==================== REVIEW & STORY RELATIONS ====================
export const productReviewsRelations = relations(productReviews, ({ one, many }) => ({
  product: one(products, {
    fields: [productReviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productReviews.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [productReviews.orderId],
    references: [orders.id],
  }),
  approvedByUser: one(users, {
    fields: [productReviews.approvedBy],
    references: [users.id],
    relationName: "reviewApprover",
  }),
  images: many(reviewImages),
}));

export const reviewImagesRelations = relations(reviewImages, ({ one }) => ({
  review: one(productReviews, {
    fields: [reviewImages.reviewId],
    references: [productReviews.id],
  }),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  author: one(users, {
    fields: [stories.authorId],
    references: [users.id],
  }),
  views: many(storyViews),
}));

export const storyViewsRelations = relations(storyViews, ({ one }) => ({
  story: one(stories, {
    fields: [storyViews.storyId],
    references: [stories.id],
  }),
  user: one(users, {
    fields: [storyViews.userId],
    references: [users.id],
  }),
}));

// ==================== NOTIFICATION RELATIONS ====================
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
  template: one(emailTemplates, {
    fields: [emailLogs.templateId],
    references: [emailTemplates.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  emailLogs: many(emailLogs),
}));

// ==================== SYSTEM RELATIONS ====================
export const systemSettingsRelations = relations(systemSettings, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [systemSettings.updatedBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const backupsRelations = relations(backups, ({ one }) => ({
  createdByUser: one(users, {
    fields: [backups.createdBy],
    references: [users.id],
  }),
}));

// ==================== WISHLIST RELATIONS ====================
export const wishlistsRelations = relations(wishlists, ({ one, many }) => ({
  user: one(users, {
    fields: [wishlists.userId],
    references: [users.id],
  }),
  items: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  wishlist: one(wishlists, {
    fields: [wishlistItems.wishlistId],
    references: [wishlists.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));
