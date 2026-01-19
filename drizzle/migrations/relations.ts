import { relations } from "drizzle-orm/relations";
import { orders, orderItems, products, productVariants, users, carts, payments, returns, userRoles, roles, productCategories, categories, inventory, passwordResetTokens, sessions, productImages, shipments, trackingUpdates, shippingAddresses, productReviews, reviewImages, stories, orderShippingAddresses, shippingMethods, emailLogs, emailTemplates, notifications, auditLogs, backups, storyViews, systemSettings, billingAddresses, shippingZones, shippingZoneCountries, discounts, discountProducts, refunds, returnItems, shippingZoneRates, discountCategories, orderDiscounts, orderItemDiscounts, wishlists, wishlistItems, userNotificationPreferences, rolePermissions, permissions, cartItems, refundItems, contactMessages } from "./schema";

export const orderItemsRelations = relations(orderItems, ({one, many}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id]
	}),
	returnItems: many(returnItems),
	orderItemDiscounts: many(orderItemDiscounts),
	refundItems: many(refundItems),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
	payments: many(payments),
	returns: many(returns),
	productReviews: many(productReviews),
	orderShippingAddresses: many(orderShippingAddresses),
	shipments: many(shipments),
	refunds: many(refunds),
	orderDiscounts: many(orderDiscounts),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	productCategories: many(productCategories),
	inventories: many(inventory),
	productImages: many(productImages),
	productVariants: many(productVariants),
	user_createdBy: one(users, {
		fields: [products.createdBy],
		references: [users.id],
		relationName: "products_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [products.updatedBy],
		references: [users.id],
		relationName: "products_updatedBy_users_id"
	}),
	productReviews: many(productReviews),
	discountProducts: many(discountProducts),
	wishlistItems: many(wishlistItems),
	cartItems: many(cartItems),
}));

export const productVariantsRelations = relations(productVariants, ({one, many}) => ({
	orderItems: many(orderItems),
	inventories: many(inventory),
	product: one(products, {
		fields: [productVariants.productId],
		references: [products.id]
	}),
	cartItems: many(cartItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
	carts: many(carts),
	payments: many(payments),
	returns_requestedBy: many(returns, {
		relationName: "returns_requestedBy_users_id"
	}),
	returns_approvedBy: many(returns, {
		relationName: "returns_approvedBy_users_id"
	}),
	userRoles_userId: many(userRoles, {
		relationName: "userRoles_userId_users_id"
	}),
	userRoles_assignedBy: many(userRoles, {
		relationName: "userRoles_assignedBy_users_id"
	}),
	passwordResetTokens: many(passwordResetTokens),
	sessions: many(sessions),
	products_createdBy: many(products, {
		relationName: "products_createdBy_users_id"
	}),
	products_updatedBy: many(products, {
		relationName: "products_updatedBy_users_id"
	}),
	shippingAddresses: many(shippingAddresses),
	productReviews_userId: many(productReviews, {
		relationName: "productReviews_userId_users_id"
	}),
	productReviews_approvedBy: many(productReviews, {
		relationName: "productReviews_approvedBy_users_id"
	}),
	stories: many(stories),
	emailLogs: many(emailLogs),
	notifications: many(notifications),
	auditLogs: many(auditLogs),
	backups: many(backups),
	storyViews: many(storyViews),
	systemSettings: many(systemSettings),
	billingAddresses: many(billingAddresses),
	refunds: many(refunds),
	wishlists: many(wishlists),
	userNotificationPreferences: many(userNotificationPreferences),
	rolePermissions: many(rolePermissions),
	contactMessages: many(contactMessages),
}));

export const cartsRelations = relations(carts, ({one, many}) => ({
	user: one(users, {
		fields: [carts.userId],
		references: [users.id]
	}),
	cartItems: many(cartItems),
}));

export const paymentsRelations = relations(payments, ({one, many}) => ({
	order: one(orders, {
		fields: [payments.orderId],
		references: [orders.id]
	}),
	user: one(users, {
		fields: [payments.createdBy],
		references: [users.id]
	}),
	refunds: many(refunds),
}));

export const returnsRelations = relations(returns, ({one, many}) => ({
	order: one(orders, {
		fields: [returns.orderId],
		references: [orders.id]
	}),
	user_requestedBy: one(users, {
		fields: [returns.requestedBy],
		references: [users.id],
		relationName: "returns_requestedBy_users_id"
	}),
	user_approvedBy: one(users, {
		fields: [returns.approvedBy],
		references: [users.id],
		relationName: "returns_approvedBy_users_id"
	}),
	returnItems: many(returnItems),
}));

export const userRolesRelations = relations(userRoles, ({one}) => ({
	user_userId: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
		relationName: "userRoles_userId_users_id"
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user_assignedBy: one(users, {
		fields: [userRoles.assignedBy],
		references: [users.id],
		relationName: "userRoles_assignedBy_users_id"
	}),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	userRoles: many(userRoles),
	rolePermissions: many(rolePermissions),
}));

export const productCategoriesRelations = relations(productCategories, ({one}) => ({
	product: one(products, {
		fields: [productCategories.productId],
		references: [products.id]
	}),
	category: one(categories, {
		fields: [productCategories.categoryId],
		references: [categories.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	productCategories: many(productCategories),
	discountCategories: many(discountCategories),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
	product: one(products, {
		fields: [inventory.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [inventory.variantId],
		references: [productVariants.id]
	}),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	}),
}));

export const productImagesRelations = relations(productImages, ({one}) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id]
	}),
}));

export const trackingUpdatesRelations = relations(trackingUpdates, ({one}) => ({
	shipment: one(shipments, {
		fields: [trackingUpdates.shipmentId],
		references: [shipments.id]
	}),
}));

export const shipmentsRelations = relations(shipments, ({one, many}) => ({
	trackingUpdates: many(trackingUpdates),
	order: one(orders, {
		fields: [shipments.orderId],
		references: [orders.id]
	}),
	shippingMethod: one(shippingMethods, {
		fields: [shipments.shippingMethodId],
		references: [shippingMethods.id]
	}),
}));

export const shippingAddressesRelations = relations(shippingAddresses, ({one}) => ({
	user: one(users, {
		fields: [shippingAddresses.userId],
		references: [users.id]
	}),
}));

export const productReviewsRelations = relations(productReviews, ({one, many}) => ({
	product: one(products, {
		fields: [productReviews.productId],
		references: [products.id]
	}),
	user_userId: one(users, {
		fields: [productReviews.userId],
		references: [users.id],
		relationName: "productReviews_userId_users_id"
	}),
	order: one(orders, {
		fields: [productReviews.orderId],
		references: [orders.id]
	}),
	user_approvedBy: one(users, {
		fields: [productReviews.approvedBy],
		references: [users.id],
		relationName: "productReviews_approvedBy_users_id"
	}),
	reviewImages: many(reviewImages),
}));

export const reviewImagesRelations = relations(reviewImages, ({one}) => ({
	productReview: one(productReviews, {
		fields: [reviewImages.reviewId],
		references: [productReviews.id]
	}),
}));

export const storiesRelations = relations(stories, ({one, many}) => ({
	user: one(users, {
		fields: [stories.authorId],
		references: [users.id]
	}),
	storyViews: many(storyViews),
}));

export const orderShippingAddressesRelations = relations(orderShippingAddresses, ({one}) => ({
	order: one(orders, {
		fields: [orderShippingAddresses.orderId],
		references: [orders.id]
	}),
}));

export const shippingMethodsRelations = relations(shippingMethods, ({many}) => ({
	shipments: many(shipments),
	shippingZoneRates: many(shippingZoneRates),
}));

export const emailLogsRelations = relations(emailLogs, ({one}) => ({
	user: one(users, {
		fields: [emailLogs.userId],
		references: [users.id]
	}),
	emailTemplate: one(emailTemplates, {
		fields: [emailLogs.templateId],
		references: [emailTemplates.id]
	}),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({many}) => ({
	emailLogs: many(emailLogs),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	}),
}));

export const backupsRelations = relations(backups, ({one}) => ({
	user: one(users, {
		fields: [backups.createdBy],
		references: [users.id]
	}),
}));

export const storyViewsRelations = relations(storyViews, ({one}) => ({
	story: one(stories, {
		fields: [storyViews.storyId],
		references: [stories.id]
	}),
	user: one(users, {
		fields: [storyViews.userId],
		references: [users.id]
	}),
}));

export const systemSettingsRelations = relations(systemSettings, ({one}) => ({
	user: one(users, {
		fields: [systemSettings.updatedBy],
		references: [users.id]
	}),
}));

export const billingAddressesRelations = relations(billingAddresses, ({one}) => ({
	user: one(users, {
		fields: [billingAddresses.userId],
		references: [users.id]
	}),
}));

export const shippingZoneCountriesRelations = relations(shippingZoneCountries, ({one}) => ({
	shippingZone: one(shippingZones, {
		fields: [shippingZoneCountries.zoneId],
		references: [shippingZones.id]
	}),
}));

export const shippingZonesRelations = relations(shippingZones, ({many}) => ({
	shippingZoneCountries: many(shippingZoneCountries),
	shippingZoneRates: many(shippingZoneRates),
}));

export const discountProductsRelations = relations(discountProducts, ({one}) => ({
	discount: one(discounts, {
		fields: [discountProducts.discountId],
		references: [discounts.id]
	}),
	product: one(products, {
		fields: [discountProducts.productId],
		references: [products.id]
	}),
}));

export const discountsRelations = relations(discounts, ({many}) => ({
	discountProducts: many(discountProducts),
	discountCategories: many(discountCategories),
	orderDiscounts: many(orderDiscounts),
	orderItemDiscounts: many(orderItemDiscounts),
}));

export const refundsRelations = relations(refunds, ({one, many}) => ({
	order: one(orders, {
		fields: [refunds.orderId],
		references: [orders.id]
	}),
	payment: one(payments, {
		fields: [refunds.paymentId],
		references: [payments.id]
	}),
	user: one(users, {
		fields: [refunds.approvedBy],
		references: [users.id]
	}),
	refundItems: many(refundItems),
}));

export const returnItemsRelations = relations(returnItems, ({one}) => ({
	return: one(returns, {
		fields: [returnItems.returnId],
		references: [returns.id]
	}),
	orderItem: one(orderItems, {
		fields: [returnItems.orderItemId],
		references: [orderItems.id]
	}),
}));

export const shippingZoneRatesRelations = relations(shippingZoneRates, ({one}) => ({
	shippingZone: one(shippingZones, {
		fields: [shippingZoneRates.zoneId],
		references: [shippingZones.id]
	}),
	shippingMethod: one(shippingMethods, {
		fields: [shippingZoneRates.methodId],
		references: [shippingMethods.id]
	}),
}));

export const discountCategoriesRelations = relations(discountCategories, ({one}) => ({
	discount: one(discounts, {
		fields: [discountCategories.discountId],
		references: [discounts.id]
	}),
	category: one(categories, {
		fields: [discountCategories.categoryId],
		references: [categories.id]
	}),
}));

export const orderDiscountsRelations = relations(orderDiscounts, ({one}) => ({
	order: one(orders, {
		fields: [orderDiscounts.orderId],
		references: [orders.id]
	}),
	discount: one(discounts, {
		fields: [orderDiscounts.discountId],
		references: [discounts.id]
	}),
}));

export const orderItemDiscountsRelations = relations(orderItemDiscounts, ({one}) => ({
	orderItem: one(orderItems, {
		fields: [orderItemDiscounts.orderItemId],
		references: [orderItems.id]
	}),
	discount: one(discounts, {
		fields: [orderItemDiscounts.discountId],
		references: [discounts.id]
	}),
}));

export const wishlistsRelations = relations(wishlists, ({one, many}) => ({
	user: one(users, {
		fields: [wishlists.userId],
		references: [users.id]
	}),
	wishlistItems: many(wishlistItems),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({one}) => ({
	wishlist: one(wishlists, {
		fields: [wishlistItems.wishlistId],
		references: [wishlists.id]
	}),
	product: one(products, {
		fields: [wishlistItems.productId],
		references: [products.id]
	}),
}));

export const userNotificationPreferencesRelations = relations(userNotificationPreferences, ({one}) => ({
	user: one(users, {
		fields: [userNotificationPreferences.userId],
		references: [users.id]
	}),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({one}) => ({
	role: one(roles, {
		fields: [rolePermissions.roleId],
		references: [roles.id]
	}),
	permission: one(permissions, {
		fields: [rolePermissions.permissionId],
		references: [permissions.id]
	}),
	user: one(users, {
		fields: [rolePermissions.grantedBy],
		references: [users.id]
	}),
}));

export const permissionsRelations = relations(permissions, ({many}) => ({
	rolePermissions: many(rolePermissions),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	cart: one(carts, {
		fields: [cartItems.cartId],
		references: [carts.id]
	}),
	product: one(products, {
		fields: [cartItems.productId],
		references: [products.id]
	}),
	productVariant: one(productVariants, {
		fields: [cartItems.variantId],
		references: [productVariants.id]
	}),
}));

export const refundItemsRelations = relations(refundItems, ({one}) => ({
	refund: one(refunds, {
		fields: [refundItems.refundId],
		references: [refunds.id]
	}),
	orderItem: one(orderItems, {
		fields: [refundItems.orderItemId],
		references: [orderItems.id]
	}),
}));

export const contactMessagesRelations = relations(contactMessages, ({one}) => ({
	user: one(users, {
		fields: [contactMessages.assigneeUserId],
		references: [users.id]
	}),
}));