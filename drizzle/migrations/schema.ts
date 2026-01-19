import { pgTable, index, uniqueIndex, uuid, varchar, text, boolean, timestamp, foreignKey, integer, numeric, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const auditAction = pgEnum("audit_action", ['create', 'update', 'delete', 'login', 'logout', 'password_change', 'permission_change', 'settings_change', 'backup_create', 'backup_restore'])
export const backupStatus = pgEnum("backup_status", ['pending', 'in_progress', 'completed', 'failed'])
export const cartStatus = pgEnum("cart_status", ['active', 'abandoned', 'converted', 'expired'])
export const contactMessageStatus = pgEnum("contact_message_status", ['new', 'open', 'closed', 'spam'])
export const contactPriority = pgEnum("contact_priority", ['low', 'normal', 'high'])
export const discountScope = pgEnum("discount_scope", ['all', 'products', 'categories', 'collections', 'customer_groups'])
export const discountStatus = pgEnum("discount_status", ['draft', 'active', 'expired', 'archived'])
export const discountType = pgEnum("discount_type", ['percentage', 'fixed_amount', 'free_shipping'])
export const emailStatus = pgEnum("email_status", ['pending', 'sent', 'failed', 'bounced'])
export const healthCheckStatus = pgEnum("health_check_status", ['healthy', 'degraded', 'unhealthy'])
export const newsletterSubscriberStatus = pgEnum("newsletter_subscriber_status", ['pending', 'confirmed', 'unsubscribed'])
export const notificationStatus = pgEnum("notification_status", ['unread', 'read', 'archived'])
export const notificationType = pgEnum("notification_type", ['order_created', 'order_updated', 'order_shipped', 'order_delivered', 'product_review', 'low_stock', 'system_alert', 'promotional'])
export const orderStatus = pgEnum("order_status", ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'])
export const paymentMethod = pgEnum("payment_method", ['credit_card', 'debit_card', 'paypal', 'stripe', 'cash_on_delivery', 'bank_transfer'])
export const paymentStatus = pgEnum("payment_status", ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'])
export const productStatus = pgEnum("product_status", ['draft', 'active', 'inactive', 'archived'])
export const refundStatus = pgEnum("refund_status", ['pending', 'approved', 'rejected', 'processed'])
export const returnStatus = pgEnum("return_status", ['requested', 'approved', 'rejected', 'received', 'refunded', 'cancelled'])
export const shipmentStatus = pgEnum("shipment_status", ['pending', 'processing', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'])
export const stockStatus = pgEnum("stock_status", ['in_stock', 'out_of_stock', 'low_stock', 'preorder'])
export const storyStatus = pgEnum("story_status", ['draft', 'published', 'archived'])
export const userRole = pgEnum("user_role", ['super_admin', 'admin', 'user'])


export const users = pgTable("users", {
	id: uuid().defaultRandom().notNull(),
	email: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	phone: varchar({ length: 20 }),
	avatar: text(),
	isActive: boolean("is_active").default(true).notNull(),
	emailVerified: boolean("email_verified").default(false).notNull(),
	emailVerifiedAt: timestamp("email_verified_at", { mode: 'string' }),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
	lastLoginIp: varchar("last_login_ip", { length: 45 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

export const orderItems = pgTable("order_items", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	productName: varchar("product_name", { length: 255 }).notNull(),
	variantName: varchar("variant_name", { length: 255 }),
	sku: varchar({ length: 100 }),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("order_items_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("order_items_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "order_items_product_id_products_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "order_items_variant_id_product_variants_id_fk"
		}).onDelete("set null"),
]);

export const orders = pgTable("orders", {
	id: uuid().defaultRandom().notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	userId: uuid("user_id"),
	status: orderStatus().default('pending').notNull(),
	paymentStatus: paymentStatus("payment_status").default('pending').notNull(),
	paymentMethod: paymentMethod("payment_method"),
	subtotal: numeric({ precision: 10, scale:  2 }).notNull(),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	shippingAmount: numeric("shipping_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('CAD').notNull(),
	customerEmail: varchar("customer_email", { length: 255 }),
	customerPhone: varchar("customer_phone", { length: 20 }),
	customerNote: text("customer_note"),
	adminNote: text("admin_note"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	cancelledAt: timestamp("cancelled_at", { mode: 'string' }),
	cancelReason: text("cancel_reason"),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	shippedAt: timestamp("shipped_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("orders_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("orders_order_number_idx").using("btree", table.orderNumber.asc().nullsLast().op("text_ops")),
	index("orders_payment_status_idx").using("btree", table.paymentStatus.asc().nullsLast().op("enum_ops")),
	index("orders_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("orders_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}),
]);

export const carts = pgTable("carts", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	sessionId: varchar("session_id", { length: 255 }),
	status: cartStatus().default('active').notNull(),
	currency: varchar({ length: 3 }).default('CAD').notNull(),
	subtotal: numeric({ precision: 10, scale:  2 }).default('0.00').notNull(),
	taxAmount: numeric("tax_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	shippingAmount: numeric("shipping_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).default('0.00').notNull(),
	abandonedAt: timestamp("abandoned_at", { mode: 'string' }),
	convertedAt: timestamp("converted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("carts_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("carts_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("carts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "carts_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	status: paymentStatus().default('pending').notNull(),
	method: paymentMethod(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('CAD').notNull(),
	provider: varchar({ length: 100 }),
	providerPaymentId: varchar("provider_payment_id", { length: 255 }),
	reference: varchar({ length: 255 }),
	capturedAt: timestamp("captured_at", { mode: 'string' }),
	failedAt: timestamp("failed_at", { mode: 'string' }),
	failureReason: text("failure_reason"),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payments_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("payments_provider_idx").using("btree", table.provider.asc().nullsLast().op("text_ops")),
	index("payments_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "payments_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "payments_created_by_users_id_fk"
		}),
]);

export const returns = pgTable("returns", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	rmaNumber: varchar("rma_number", { length: 50 }).notNull(),
	status: returnStatus().default('requested').notNull(),
	reason: text(),
	notes: text(),
	requestedBy: uuid("requested_by"),
	approvedBy: uuid("approved_by"),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	receivedAt: timestamp("received_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("returns_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("returns_rma_idx").using("btree", table.rmaNumber.asc().nullsLast().op("text_ops")),
	index("returns_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "returns_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.requestedBy],
			foreignColumns: [users.id],
			name: "returns_requested_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "returns_approved_by_users_id_fk"
		}),
]);

export const permissions = pgTable("permissions", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	resource: varchar({ length: 50 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("permissions_resource_action_idx").using("btree", table.resource.asc().nullsLast().op("text_ops"), table.action.asc().nullsLast().op("text_ops")),
	uniqueIndex("permissions_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const userRoles = pgTable("user_roles", {
	userId: uuid("user_id").notNull(),
	roleId: uuid("role_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow().notNull(),
	assignedBy: uuid("assigned_by"),
}, (table) => [
	index("user_roles_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	index("user_roles_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_roles_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_role_id_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "user_roles_assigned_by_users_id_fk"
		}),
]);

export const productCategories = pgTable("product_categories", {
	productId: uuid("product_id").notNull(),
	categoryId: uuid("category_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_categories_category_id_idx").using("btree", table.categoryId.asc().nullsLast().op("uuid_ops")),
	index("product_categories_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_categories_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "product_categories_category_id_categories_id_fk"
		}).onDelete("cascade"),
]);

export const inventory = pgTable("inventory", {
	id: uuid().defaultRandom().notNull(),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	quantity: integer().default(0).notNull(),
	reservedQuantity: integer("reserved_quantity").default(0).notNull(),
	availableQuantity: integer("available_quantity").default(0).notNull(),
	lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
	location: varchar({ length: 100 }),
	lastRestockedAt: timestamp("last_restocked_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("inventory_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("inventory_product_variant_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops"), table.variantId.asc().nullsLast().op("uuid_ops")),
	index("inventory_quantity_idx").using("btree", table.quantity.asc().nullsLast().op("int4_ops")),
	index("inventory_variant_id_idx").using("btree", table.variantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "inventory_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "inventory_variant_id_product_variants_id_fk"
		}).onDelete("cascade"),
]);

export const roles = pgTable("roles", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 50 }).notNull(),
	slug: varchar({ length: 50 }).notNull(),
	description: text(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("roles_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("password_reset_tokens_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("password_reset_tokens_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	token: varchar({ length: 255 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sessions_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	uniqueIndex("sessions_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
	index("sessions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sessions_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	description: text(),
	image: text(),
	parentId: uuid("parent_id"),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	metaTitle: varchar("meta_title", { length: 255 }),
	metaDescription: text("meta_description"),
	metaKeywords: text("meta_keywords"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("categories_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("categories_parent_id_idx").using("btree", table.parentId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("categories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("categories_sort_order_idx").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
]);

export const productImages = pgTable("product_images", {
	id: uuid().defaultRandom().notNull(),
	productId: uuid("product_id").notNull(),
	url: text().notNull(),
	altText: varchar("alt_text", { length: 255 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_images_is_primary_idx").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")),
	index("product_images_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("product_images_sort_order_idx").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_images_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const productVariants = pgTable("product_variants", {
	id: uuid().defaultRandom().notNull(),
	productId: uuid("product_id").notNull(),
	sku: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	compareAtPrice: numeric("compare_at_price", { precision: 10, scale:  2 }),
	costPerItem: numeric("cost_per_item", { precision: 10, scale:  2 }),
	stockQuantity: integer("stock_quantity").default(0).notNull(),
	lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
	options: jsonb(),
	image: text(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_variants_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("product_variants_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("product_variants_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_variants_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const products = pgTable("products", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	sku: varchar({ length: 100 }),
	description: text(),
	shortDescription: text("short_description"),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	compareAtPrice: numeric("compare_at_price", { precision: 10, scale:  2 }),
	costPerItem: numeric("cost_per_item", { precision: 10, scale:  2 }),
	status: productStatus().default('draft').notNull(),
	stockStatus: stockStatus("stock_status").default('in_stock').notNull(),
	trackInventory: boolean("track_inventory").default(true).notNull(),
	isFeatured: boolean("is_featured").default(false).notNull(),
	allowReviews: boolean("allow_reviews").default(true).notNull(),
	averageRating: numeric("average_rating", { precision: 3, scale:  2 }).default('0.00'),
	reviewCount: integer("review_count").default(0).notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	soldCount: integer("sold_count").default(0).notNull(),
	weight: numeric({ precision: 8, scale:  2 }),
	weightUnit: varchar("weight_unit", { length: 10 }).default('kg'),
	dimensions: jsonb(),
	metaTitle: varchar("meta_title", { length: 255 }),
	metaDescription: text("meta_description"),
	metaKeywords: text("meta_keywords"),
	createdBy: uuid("created_by"),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
}, (table) => [
	index("products_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("products_is_featured_idx").using("btree", table.isFeatured.asc().nullsLast().op("bool_ops")),
	index("products_price_idx").using("btree", table.price.asc().nullsLast().op("numeric_ops")),
	uniqueIndex("products_sku_idx").using("btree", table.sku.asc().nullsLast().op("text_ops")),
	uniqueIndex("products_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("products_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("products_stock_status_idx").using("btree", table.stockStatus.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "products_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "products_updated_by_users_id_fk"
		}),
]);

export const shippingMethods = pgTable("shipping_methods", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	code: varchar({ length: 50 }).notNull(),
	carrier: varchar({ length: 100 }),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	estimatedDays: integer("estimated_days"),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("shipping_methods_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("shipping_methods_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

export const trackingUpdates = pgTable("tracking_updates", {
	id: uuid().defaultRandom().notNull(),
	shipmentId: uuid("shipment_id").notNull(),
	status: varchar({ length: 100 }).notNull(),
	location: varchar({ length: 255 }),
	description: text(),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("tracking_updates_occurred_at_idx").using("btree", table.occurredAt.asc().nullsLast().op("timestamp_ops")),
	index("tracking_updates_shipment_id_idx").using("btree", table.shipmentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.shipmentId],
			foreignColumns: [shipments.id],
			name: "tracking_updates_shipment_id_shipments_id_fk"
		}).onDelete("cascade"),
]);

export const shippingAddresses = pgTable("shipping_addresses", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	company: varchar({ length: 100 }),
	addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }).notNull(),
	country: varchar({ length: 2 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shipping_addresses_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "shipping_addresses_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const productReviews = pgTable("product_reviews", {
	id: uuid().defaultRandom().notNull(),
	productId: uuid("product_id").notNull(),
	userId: uuid("user_id"),
	orderId: uuid("order_id"),
	rating: integer().notNull(),
	title: varchar({ length: 255 }),
	content: text().notNull(),
	isVerifiedPurchase: boolean("is_verified_purchase").default(false).notNull(),
	isApproved: boolean("is_approved").default(false).notNull(),
	approvedBy: uuid("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	helpfulCount: integer("helpful_count").default(0).notNull(),
	reportCount: integer("report_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("product_reviews_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("product_reviews_is_approved_idx").using("btree", table.isApproved.asc().nullsLast().op("bool_ops")),
	index("product_reviews_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	index("product_reviews_rating_idx").using("btree", table.rating.asc().nullsLast().op("int4_ops")),
	index("product_reviews_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "product_reviews_product_id_products_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "product_reviews_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "product_reviews_order_id_orders_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "product_reviews_approved_by_users_id_fk"
		}),
]);

export const reviewImages = pgTable("review_images", {
	id: uuid().defaultRandom().notNull(),
	reviewId: uuid("review_id").notNull(),
	url: text().notNull(),
	altText: varchar("alt_text", { length: 255 }),
	sortOrder: integer("sort_order").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("review_images_review_id_idx").using("btree", table.reviewId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.reviewId],
			foreignColumns: [productReviews.id],
			name: "review_images_review_id_product_reviews_id_fk"
		}).onDelete("cascade"),
]);

export const stories = pgTable("stories", {
	id: uuid().defaultRandom().notNull(),
	title: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	excerpt: text(),
	coverImage: text("cover_image"),
	status: storyStatus().default('draft').notNull(),
	viewCount: integer("view_count").default(0).notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	authorId: uuid("author_id").notNull(),
	publishedAt: timestamp("published_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("stories_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("stories_published_at_idx").using("btree", table.publishedAt.asc().nullsLast().op("timestamp_ops")),
	index("stories_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("stories_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [users.id],
			name: "stories_author_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const orderShippingAddresses = pgTable("order_shipping_addresses", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	company: varchar({ length: 100 }),
	addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }).notNull(),
	country: varchar({ length: 2 }).notNull(),
	phone: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("order_shipping_addresses_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_shipping_addresses_order_id_orders_id_fk"
		}).onDelete("cascade"),
]);

export const shipments = pgTable("shipments", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	shippingMethodId: uuid("shipping_method_id"),
	trackingNumber: varchar("tracking_number", { length: 100 }),
	carrier: varchar({ length: 100 }),
	status: shipmentStatus().default('pending').notNull(),
	shippedAt: timestamp("shipped_at", { mode: 'string' }),
	estimatedDeliveryAt: timestamp("estimated_delivery_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shipments_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("shipments_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("shipments_tracking_number_idx").using("btree", table.trackingNumber.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "shipments_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.shippingMethodId],
			foreignColumns: [shippingMethods.id],
			name: "shipments_shipping_method_id_shipping_methods_id_fk"
		}),
]);

export const emailLogs = pgTable("email_logs", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	templateId: uuid("template_id"),
	to: varchar({ length: 255 }).notNull(),
	from: varchar({ length: 255 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	status: emailStatus().default('pending').notNull(),
	error: text(),
	metadata: jsonb(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("email_logs_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("email_logs_to_idx").using("btree", table.to.asc().nullsLast().op("text_ops")),
	index("email_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "email_logs_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [emailTemplates.id],
			name: "email_logs_template_id_email_templates_id_fk"
		}).onDelete("set null"),
]);

export const emailTemplates = pgTable("email_templates", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	slug: varchar({ length: 100 }).notNull(),
	subject: varchar({ length: 255 }).notNull(),
	body: text().notNull(),
	variables: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("email_templates_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("email_templates_slug_idx").using("btree", table.slug.asc().nullsLast().op("text_ops")),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	type: notificationType().notNull(),
	status: notificationStatus().default('unread').notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	actionUrl: text("action_url"),
	metadata: jsonb(),
	readAt: timestamp("read_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notifications_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("notifications_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("notifications_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	index("notifications_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("notifications_user_type_title_message_uniq").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.type.asc().nullsLast().op("enum_ops"), table.title.asc().nullsLast().op("uuid_ops"), table.message.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	action: auditAction().notNull(),
	resource: varchar({ length: 100 }).notNull(),
	resourceId: uuid("resource_id"),
	changes: jsonb(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_action_idx").using("btree", table.action.asc().nullsLast().op("enum_ops")),
	index("audit_logs_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("audit_logs_resource_id_idx").using("btree", table.resourceId.asc().nullsLast().op("uuid_ops")),
	index("audit_logs_resource_idx").using("btree", table.resource.asc().nullsLast().op("text_ops")),
	index("audit_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "audit_logs_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const backups = pgTable("backups", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 255 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	filePath: text("file_path").notNull(),
	fileSize: integer("file_size").notNull(),
	status: backupStatus().default('pending').notNull(),
	type: varchar({ length: 50 }).default('manual').notNull(),
	error: text(),
	metadata: jsonb(),
	createdBy: uuid("created_by"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("backups_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("backups_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("backups_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "backups_created_by_users_id_fk"
		}),
]);

export const storyViews = pgTable("story_views", {
	id: uuid().defaultRandom().notNull(),
	storyId: uuid("story_id").notNull(),
	userId: uuid("user_id"),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	viewedAt: timestamp("viewed_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("story_views_story_id_idx").using("btree", table.storyId.asc().nullsLast().op("uuid_ops")),
	index("story_views_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.id],
			name: "story_views_story_id_stories_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "story_views_user_id_users_id_fk"
		}).onDelete("set null"),
]);

export const healthChecks = pgTable("health_checks", {
	id: uuid().defaultRandom().notNull(),
	service: varchar({ length: 100 }).notNull(),
	status: healthCheckStatus().default('healthy').notNull(),
	responseTime: integer("response_time"),
	details: jsonb(),
	error: text(),
	checkedAt: timestamp("checked_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("health_checks_checked_at_idx").using("btree", table.checkedAt.asc().nullsLast().op("timestamp_ops")),
	index("health_checks_service_idx").using("btree", table.service.asc().nullsLast().op("text_ops")),
	index("health_checks_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const systemSettings = pgTable("system_settings", {
	id: uuid().defaultRandom().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text().notNull(),
	type: varchar({ length: 50 }).default('string').notNull(),
	description: text(),
	isPublic: boolean("is_public").default(false).notNull(),
	updatedBy: uuid("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("system_settings_is_public_idx").using("btree", table.isPublic.asc().nullsLast().op("bool_ops")),
	index("system_settings_key_idx").using("btree", table.key.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_settings_updated_by_users_id_fk"
		}),
]);

export const billingAddresses = pgTable("billing_addresses", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id"),
	firstName: varchar("first_name", { length: 100 }).notNull(),
	lastName: varchar("last_name", { length: 100 }).notNull(),
	company: varchar({ length: 100 }),
	addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }).notNull(),
	state: varchar({ length: 100 }),
	postalCode: varchar("postal_code", { length: 20 }).notNull(),
	country: varchar({ length: 2 }).notNull(),
	phone: varchar({ length: 20 }),
	isDefault: boolean("is_default").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("billing_addresses_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "billing_addresses_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const shippingZones = pgTable("shipping_zones", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shipping_zones_name_idx").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const shippingZoneCountries = pgTable("shipping_zone_countries", {
	zoneId: uuid("zone_id").notNull(),
	country: varchar({ length: 2 }).notNull(),
}, (table) => [
	index("shipping_zone_countries_zone_id_idx").using("btree", table.zoneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.zoneId],
			foreignColumns: [shippingZones.id],
			name: "shipping_zone_countries_zone_id_shipping_zones_id_fk"
		}).onDelete("cascade"),
]);

export const discountProducts = pgTable("discount_products", {
	discountId: uuid("discount_id").notNull(),
	productId: uuid("product_id").notNull(),
}, (table) => [
	index("discount_products_idx").using("btree", table.discountId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.discountId],
			foreignColumns: [discounts.id],
			name: "discount_products_discount_id_discounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "discount_products_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
	id: uuid().defaultRandom().notNull(),
	email: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	status: newsletterSubscriberStatus().default('pending').notNull(),
	source: varchar({ length: 100 }),
	tags: jsonb(),
	confirmToken: varchar("confirm_token", { length: 255 }),
	unsubscribeToken: varchar("unsubscribe_token", { length: 255 }),
	confirmedAt: timestamp("confirmed_at", { mode: 'string' }),
	unsubscribedAt: timestamp("unsubscribed_at", { mode: 'string' }),
	consentIp: varchar("consent_ip", { length: 64 }),
	consentUserAgent: text("consent_user_agent"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("newsletter_subscribers_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("newsletter_subscribers_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("newsletter_subscribers_email_uniq").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("newsletter_subscribers_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const refunds = pgTable("refunds", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	paymentId: uuid("payment_id"),
	status: refundStatus().default('pending').notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	currency: varchar({ length: 3 }).default('CAD').notNull(),
	reason: text(),
	approvedBy: uuid("approved_by"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("refunds_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	index("refunds_payment_id_idx").using("btree", table.paymentId.asc().nullsLast().op("uuid_ops")),
	index("refunds_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "refunds_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payments.id],
			name: "refunds_payment_id_payments_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "refunds_approved_by_users_id_fk"
		}),
]);

export const returnItems = pgTable("return_items", {
	id: uuid().defaultRandom().notNull(),
	returnId: uuid("return_id").notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	quantity: integer().notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("return_items_order_item_id_idx").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
	index("return_items_return_id_idx").using("btree", table.returnId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.returnId],
			foreignColumns: [returns.id],
			name: "return_items_return_id_returns_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "return_items_order_item_id_order_items_id_fk"
		}).onDelete("cascade"),
]);

export const shippingZoneRates = pgTable("shipping_zone_rates", {
	id: uuid().defaultRandom().notNull(),
	zoneId: uuid("zone_id").notNull(),
	methodId: uuid("method_id").notNull(),
	minSubtotal: numeric("min_subtotal", { precision: 10, scale:  2 }),
	maxSubtotal: numeric("max_subtotal", { precision: 10, scale:  2 }),
	rate: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("shipping_zone_rates_method_id_idx").using("btree", table.methodId.asc().nullsLast().op("uuid_ops")),
	index("shipping_zone_rates_zone_id_idx").using("btree", table.zoneId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.zoneId],
			foreignColumns: [shippingZones.id],
			name: "shipping_zone_rates_zone_id_shipping_zones_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.methodId],
			foreignColumns: [shippingMethods.id],
			name: "shipping_zone_rates_method_id_shipping_methods_id_fk"
		}).onDelete("cascade"),
]);

export const discounts = pgTable("discounts", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 50 }),
	type: discountType().notNull(),
	value: numeric({ precision: 10, scale:  2 }).notNull(),
	scope: discountScope().default('all').notNull(),
	usageLimit: integer("usage_limit"),
	usageCount: integer("usage_count").default(0).notNull(),
	startsAt: timestamp("starts_at", { mode: 'string' }),
	endsAt: timestamp("ends_at", { mode: 'string' }),
	minSubtotal: numeric("min_subtotal", { precision: 10, scale:  2 }),
	isAutomatic: boolean("is_automatic").default(false).notNull(),
	status: discountStatus().default('draft').notNull(),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("discounts_code_idx").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("discounts_ends_at_idx").using("btree", table.endsAt.asc().nullsLast().op("timestamp_ops")),
	index("discounts_starts_at_idx").using("btree", table.startsAt.asc().nullsLast().op("timestamp_ops")),
	index("discounts_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
]);

export const discountCategories = pgTable("discount_categories", {
	discountId: uuid("discount_id").notNull(),
	categoryId: uuid("category_id").notNull(),
}, (table) => [
	index("discount_categories_idx").using("btree", table.discountId.asc().nullsLast().op("uuid_ops"), table.categoryId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.discountId],
			foreignColumns: [discounts.id],
			name: "discount_categories_discount_id_discounts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "discount_categories_category_id_categories_id_fk"
		}).onDelete("cascade"),
]);

export const orderDiscounts = pgTable("order_discounts", {
	id: uuid().defaultRandom().notNull(),
	orderId: uuid("order_id").notNull(),
	discountId: uuid("discount_id"),
	code: varchar({ length: 50 }),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("order_discounts_order_id_idx").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_discounts_order_id_orders_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.discountId],
			foreignColumns: [discounts.id],
			name: "order_discounts_discount_id_discounts_id_fk"
		}).onDelete("set null"),
]);

export const orderItemDiscounts = pgTable("order_item_discounts", {
	id: uuid().defaultRandom().notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	discountId: uuid("discount_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("order_item_discounts_order_item_id_idx").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "order_item_discounts_order_item_id_order_items_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.discountId],
			foreignColumns: [discounts.id],
			name: "order_item_discounts_discount_id_discounts_id_fk"
		}).onDelete("set null"),
]);

export const wishlists = pgTable("wishlists", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("wishlists_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("wishlists_user_unique").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "wishlists_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const wishlistItems = pgTable("wishlist_items", {
	id: uuid().defaultRandom().notNull(),
	wishlistId: uuid("wishlist_id").notNull(),
	productId: uuid("product_id").notNull(),
	addedAt: timestamp("added_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("wishlist_items_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("wishlist_items_unique").using("btree", table.wishlistId.asc().nullsLast().op("uuid_ops"), table.productId.asc().nullsLast().op("uuid_ops")),
	index("wishlist_items_wishlist_id_idx").using("btree", table.wishlistId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.wishlistId],
			foreignColumns: [wishlists.id],
			name: "wishlist_items_wishlist_id_wishlists_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "wishlist_items_product_id_products_id_fk"
		}).onDelete("cascade"),
]);

export const userNotificationPreferences = pgTable("user_notification_preferences", {
	id: uuid().defaultRandom().notNull(),
	userId: uuid("user_id").notNull(),
	orders: boolean().default(true).notNull(),
	shipments: boolean().default(true).notNull(),
	refunds: boolean().default(true).notNull(),
	returns: boolean().default(true).notNull(),
	reviews: boolean().default(true).notNull(),
	promotions: boolean().default(true).notNull(),
	backInStock: boolean("back_in_stock").default(true).notNull(),
	priceDrop: boolean("price_drop").default(true).notNull(),
	security: boolean().default(true).notNull(),
	emailOrderUpdates: boolean("email_order_updates").default(true).notNull(),
	emailPromotions: boolean("email_promotions").default(false).notNull(),
	emailNewsletter: boolean("email_newsletter").default(true).notNull(),
	emailRecommendations: boolean("email_recommendations").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("unp_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("unp_user_uniq").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_notification_preferences_user_id_users_id_fk"
		}).onDelete("cascade"),
]);

export const rolePermissions = pgTable("role_permissions", {
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	grantedAt: timestamp("granted_at", { mode: 'string' }).defaultNow().notNull(),
	grantedBy: uuid("granted_by"),
}, (table) => [
	index("role_permissions_permission_id_idx").using("btree", table.permissionId.asc().nullsLast().op("uuid_ops")),
	index("role_permissions_role_id_idx").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "role_permissions_role_id_roles_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.id],
			name: "role_permissions_permission_id_permissions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.grantedBy],
			foreignColumns: [users.id],
			name: "role_permissions_granted_by_users_id_fk"
		}),
]);

export const cartItems = pgTable("cart_items", {
	id: uuid().defaultRandom().notNull(),
	cartId: uuid("cart_id").notNull(),
	productId: uuid("product_id"),
	variantId: uuid("variant_id"),
	productName: varchar("product_name", { length: 255 }).notNull(),
	variantName: varchar("variant_name", { length: 255 }),
	sku: varchar({ length: 100 }),
	quantity: integer().default(1).notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).default('0.00').notNull(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).default('0.00').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("cart_items_cart_id_idx").using("btree", table.cartId.asc().nullsLast().op("uuid_ops")),
	index("cart_items_product_id_idx").using("btree", table.productId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.cartId],
			foreignColumns: [carts.id],
			name: "cart_items_cart_id_carts_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productId],
			foreignColumns: [products.id],
			name: "cart_items_product_id_products_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.variantId],
			foreignColumns: [productVariants.id],
			name: "cart_items_variant_id_product_variants_id_fk"
		}).onDelete("set null"),
]);

export const refundItems = pgTable("refund_items", {
	id: uuid().defaultRandom().notNull(),
	refundId: uuid("refund_id").notNull(),
	orderItemId: uuid("order_item_id").notNull(),
	quantity: integer().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	reason: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("refund_items_order_item_id_idx").using("btree", table.orderItemId.asc().nullsLast().op("uuid_ops")),
	index("refund_items_refund_id_idx").using("btree", table.refundId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.refundId],
			foreignColumns: [refunds.id],
			name: "refund_items_refund_id_refunds_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.orderItemId],
			foreignColumns: [orderItems.id],
			name: "refund_items_order_item_id_order_items_id_fk"
		}).onDelete("cascade"),
]);

export const contactMessages = pgTable("contact_messages", {
	id: uuid().defaultRandom().notNull(),
	name: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	subject: varchar({ length: 255 }),
	message: text().notNull(),
	status: contactMessageStatus().default('new').notNull(),
	priority: contactPriority().default('normal').notNull(),
	assigneeUserId: uuid("assignee_user_id"),
	channel: varchar({ length: 50 }).default('web').notNull(),
	metadata: jsonb(),
	respondedAt: timestamp("responded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("contact_messages_assignee_idx").using("btree", table.assigneeUserId.asc().nullsLast().op("uuid_ops")),
	index("contact_messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("contact_messages_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("contact_messages_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.assigneeUserId],
			foreignColumns: [users.id],
			name: "contact_messages_assignee_user_id_users_id_fk"
		}).onDelete("set null"),
]);
