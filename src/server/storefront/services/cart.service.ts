import { storefrontCartRepository } from "../repositories/cart.repository";
import { storefrontProductsRepository } from "../repositories/products.repository";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";
import type { Cart } from "@/types/storefront";

/**
 * Storefront Cart Service
 * Business logic for shopping cart operations
 */

export class StorefrontCartService {
  /**
   * Get or create cart
   */
  async getOrCreate(userId?: string, sessionId?: string): Promise<Cart> {
    const cart = await storefrontCartRepository.getOrCreate(userId, sessionId);
    return await this.formatCart(cart.id);
  }

  /**
   * Get cart with items
   */
  async getCart(cartId: string): Promise<Cart | null> {
    const cart = await storefrontCartRepository.getWithItems(cartId);
    if (!cart) {
      return null;
    }

    return await this.formatCartData(cart);
  }

  /**
   * Add item to cart
   */
  async addItem(params: {
    cartId: string;
    productId: string;
    variantId?: string;
    quantity?: number;
  }): Promise<Cart> {
    const { cartId, productId, variantId, quantity = 1 } = params;

    // Get product details
    const product = await storefrontProductsRepository.getById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Determine which variant and price to use
    let sku: string;
    let unitPrice = parseFloat(product.price);
    let variantName: string | undefined;

    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new Error("Variant not found");
      }
      sku = variant.sku;
      unitPrice = parseFloat(variant.price);
      variantName = variant.name || undefined;

      // Check stock
      if (variant.stockQuantity < quantity) {
        throw new Error("Insufficient stock");
      }
    } else {
      // Use product SKU, default to ID if not set
      sku = product.sku || product.id;

      const [{ available = 0 } = {} as any] = await db
        .select({ available: sql<number>`COALESCE(SUM(${schema.inventory.availableQuantity}), 0)` })
        .from(schema.inventory)
        .where(and(eq(schema.inventory.productId, productId as any), sql`${schema.inventory.variantId} is null` as any) as any);

      if (Number(available || 0) < quantity) {
        throw new Error("Insufficient stock");
      }
    }

    await storefrontCartRepository.addItem({
      cartId,
      productId,
      variantId,
      productName: product.name,
      variantName,
      sku,
      quantity,
      unitPrice,
    });

    return await this.formatCart(cartId);
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<string> {
    if (quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    return await storefrontCartRepository.updateItemQuantity(itemId, quantity);
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string): Promise<string> {
    return await storefrontCartRepository.removeItem(itemId);
  }

  /**
   * Merge guest cart into user cart
   */
  async mergeCart(guestCartId: string, userId: string): Promise<Cart> {
    const cart = await storefrontCartRepository.mergeCart(guestCartId, userId);
    return await this.formatCart(cart.id);
  }

  /**
   * Clear cart
   */
  async clearCart(cartId: string): Promise<void> {
    await storefrontCartRepository.clear(cartId);
  }

  /**
   * Apply discount code
   */
  async applyDiscount(cartId: string, code: string): Promise<Cart> {
    await storefrontCartRepository.applyDiscountCode(cartId, code);
    return await this.formatCart(cartId);
  }

  /**
   * Remove discount code
   */
  async clearDiscount(cartId: string): Promise<Cart> {
    await storefrontCartRepository.clearDiscount(cartId);
    return await this.formatCart(cartId);
  }

  /**
   * Format cart for API response
   */
  private async formatCart(cartId: string): Promise<Cart> {
    const cart = await storefrontCartRepository.getWithItems(cartId);
    if (!cart) {
      throw new Error("Cart not found");
    }

    return await this.formatCartData(cart);
  }

  /**
   * Format cart data to API response format
   */
  private async formatCartData(cart: any): Promise<Cart> {
    const items = await Promise.all(
      cart.items.map(async (item: any) => {
        // Always compute image from product data to avoid stale or generic repository value
        const product = await storefrontProductsRepository.getById(item.productId);
        let image: string | null = null;
        let productSlug = item.productSlug;
        if (product) {
          productSlug = product.slug || productSlug;
          // Variant image if selected
          if (item.variantId) {
            const variant = product.variants?.find((v: any) => v.id === item.variantId);
            if (variant?.image) image = variant.image;
          }
          // Product primary image
          if (!image && product.images?.length) {
            const primary = product.images.find((img: any) => img.isPrimary) || product.images[0];
            image = primary?.url || null;
          }
          // First active variant image
          if (!image && product.variants?.length) {
            const withImage = product.variants.find((v: any) => v.image);
            image = withImage?.image || null;
          }
        }

        return {
          id: item.id,
          productId: item.productId,
          productSlug: productSlug || item.product?.slug || `product-${item.productId}`,
          variantId: item.variantId || undefined,
          productName: item.productName,
          variantName: item.variantName || undefined,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice),
          image: image || "/placeholder-product.svg",
          maxQuantity: Number(item.maxQuantity) || 0,
        };
      })
    );

    const best = await storefrontCartRepository.computeBestDiscount(cart.id);
    const appliedDiscounts = best.amount > 0 && best.applied
      ? [{ id: best.applied.id, code: best.applied.code, type: best.applied.type as any, value: parseFloat(best.applied.value as any) || 0, amount: best.amount, isAutomatic: Boolean((best.applied as any)?.isAutomatic) }]
      : [];

    return {
      id: cart.id,
      items,
      itemCount: items.reduce((sum: number, item: any) => sum + Number(item.quantity), 0),
      subtotal: parseFloat(cart.subtotal),
      taxAmount: parseFloat(cart.taxAmount),
      shippingAmount: parseFloat(cart.shippingAmount),
      discountAmount: best.amount > 0 ? best.amount : parseFloat(cart.discountAmount),
      totalAmount: parseFloat(cart.totalAmount),
      appliedDiscounts,
    };
  }
}

export const storefrontCartService = new StorefrontCartService();
