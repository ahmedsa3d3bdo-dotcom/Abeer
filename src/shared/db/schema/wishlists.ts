import { pgTable, uuid, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users";
import { products } from "./products";

// ==================== WISHLISTS ====================
export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("wishlists_user_id_idx").on(table.userId),
    userUnique: uniqueIndex("wishlists_user_unique").on(table.userId),
  })
);

// ==================== WISHLIST ITEMS ====================
export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    wishlistId: uuid("wishlist_id").notNull().references(() => wishlists.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  (table) => ({
    wishlistIdIdx: index("wishlist_items_wishlist_id_idx").on(table.wishlistId),
    productIdIdx: index("wishlist_items_product_id_idx").on(table.productId),
    uniqueWishlistProduct: uniqueIndex("wishlist_items_unique").on(table.wishlistId, table.productId),
  })
);
