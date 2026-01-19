import { NextRequest, NextResponse } from "next/server";
import { storefrontCartService } from "../services/cart.service";
import { storefrontCartRepository } from "../repositories/cart.repository";
import { auth } from "@/auth";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

/**
 * Storefront Cart Controller
 * Handles HTTP requests for cart endpoints
 */

const addItemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const removeItemSchema = z.object({
  itemId: z.string().uuid(),
});

const applyDiscountSchema = z.object({
  code: z.string().min(1),
});

export class StorefrontCartController {
  /**
   * GET /api/storefront/cart
   * Get or create cart
   */
  static async get(request: NextRequest) {
    try {
      // Buy Now short-circuit ONLY when the current cart_id is the buy-now cart.
      // This avoids stale buy-now cookies hijacking normal cart browsing (/cart page).
      const buyNowCartId = request.cookies.get("buy_now_cart_id")?.value;
      const cookieCartId = request.cookies.get("cart_id")?.value;
      if (buyNowCartId && cookieCartId && buyNowCartId === cookieCartId) {
        try {
          const bn = await storefrontCartService.getCart(buyNowCartId);
          if (bn) {
            const res = NextResponse.json({ success: true, data: bn });
            res.cookies.set("cart_id", bn.id, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 30, // keep temp cart short-lived
            });
            return res;
          }
        } catch {}
      }

      // Determine authenticated user (if any)
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;

      // Get or create session ID for guest carts
      const existingSessionId = request.cookies.get("cart_session_id")?.value;
      const sessionId = existingSessionId || uuidv4();

      let cart;
      if (userId) {
        // First resolve the user's cart
        const userCart = await storefrontCartService.getOrCreate(userId, undefined);
        const guestCartId = request.cookies.get("cart_id")?.value;
        // Only merge if the cookie cart is different from the user's cart
        if (guestCartId && guestCartId !== userCart.id) {
          // Guard against merging a cart that belongs to a different user (stale cookie after logout/login)
          const guestCart = await storefrontCartRepository.getWithItems(guestCartId);
          if (guestCart && (guestCart as any).userId && String((guestCart as any).userId) !== String(userId)) {
            cart = userCart;
          } else {
            cart = await storefrontCartService.mergeCart(guestCartId, userId);
          }
        } else {
          cart = userCart;
        }
      } else {
        // Guest cart by session
        cart = await storefrontCartService.getOrCreate(undefined, sessionId);
      }

      const response = NextResponse.json({ success: true, data: cart });

      // Maintain cookies
      if (!existingSessionId) {
        response.cookies.set("cart_session_id", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
      response.cookies.set("cart_id", cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return response;
    } catch (error) {
      console.error("Error getting cart:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to get cart",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/storefront/cart/items
   * Add item to cart
   */
  static async addItem(request: NextRequest) {
    try {
      const body = await request.json();
      const data = addItemSchema.parse(body);

      // Resolve user and target cart
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      const buyNowCartId = request.cookies.get("buy_now_cart_id")?.value;
      let cartId = request.cookies.get("cart_id")?.value;
      const existingSessionId = request.cookies.get("cart_session_id")?.value;
      const sessionId = existingSessionId || uuidv4();

      if (userId) {
        // Always use the user's persistent cart (not the buy-now cart)
        const userCart = await storefrontCartService.getOrCreate(userId, undefined);
        cartId = userCart.id;
      } else {
        // Guest carts should be stable by sessionId. Always write into the session cart.
        // This prevents “header count increments but /cart is empty” due to cart_id/session drift.
        const sessionCart = await storefrontCartService.getOrCreate(undefined, sessionId);
        cartId = sessionCart.id;

        // If a buy-now cart is active, do not write into it (we already switched to session cart).
        // We keep buy_now_cart_id cookie intact; GET will only use it when cart_id matches it.
        if (buyNowCartId && cartId === buyNowCartId) {
          // Extremely defensive; should not happen.
          const fallbackCart = await storefrontCartService.getOrCreate(undefined, `guest-${uuidv4()}`);
          cartId = fallbackCart.id;
        }
      }

      const cart = await storefrontCartService.addItem({
        cartId,
        ...data,
      });

      const response = NextResponse.json({
        success: true,
        data: cart,
      });

      // Maintain guest session cookie so GET /api/storefront/cart resolves the same cart later.
      if (!userId && !existingSessionId) {
        response.cookies.set("cart_session_id", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }

      // Always store the cart id we actually wrote into.
      response.cookies.set("cart_id", cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors,
            },
          },
          { status: 400 }
        );
      }

      console.error("Error adding item to cart:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to add item to cart",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * PATCH /api/storefront/cart/items
   * Update item quantity
   */
  static async updateItem(request: NextRequest) {
    try {
      const body = await request.json();
      const data = updateItemSchema.parse(body);

      const updatedCartId = await storefrontCartService.updateItemQuantity(data.itemId, data.quantity);
      const cart = await storefrontCartService.getCart(updatedCartId);

      const res = NextResponse.json({ success: true, data: cart });
      res.cookies.set("cart_id", updatedCartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors,
            },
          },
          { status: 400 }
        );
      }

      console.error("Error updating cart item:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to update cart item",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * DELETE /api/storefront/cart/items
   * Remove item from cart
   */
  static async removeItem(request: NextRequest) {
    try {
      const body = await request.json();
      const data = removeItemSchema.parse(body);

      const updatedCartId = await storefrontCartService.removeItem(data.itemId);
      const cart = await storefrontCartService.getCart(updatedCartId);

      const res = NextResponse.json({ success: true, data: cart });
      res.cookies.set("cart_id", updatedCartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors,
            },
          },
          { status: 400 }
        );
      }

      console.error("Error removing cart item:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to remove cart item",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/storefront/cart/discount
   * Apply discount code
   */
  static async applyDiscount(request: NextRequest) {
    try {
      const body = await request.json();
      const data = applyDiscountSchema.parse(body);

      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      const existingSessionId = request.cookies.get("cart_session_id")?.value;
      const sessionId = existingSessionId || uuidv4();

      // Resolve target cart
      let cartId: string | undefined;
      if (userId) {
        const userCart = await storefrontCartService.getOrCreate(userId, undefined);
        cartId = userCart.id;
      } else {
        // Guests: always write into the session cart to avoid stale cart_id pointing to a previous user's cart
        const guestCart = await storefrontCartService.getOrCreate(undefined, sessionId);
        cartId = guestCart.id;
      }

      if (!cartId) throw new Error("Cart not found");

      const cart = await storefrontCartService.applyDiscount(cartId, data.code);
      const res = NextResponse.json({ success: true, data: cart });

      if (!userId && !existingSessionId) {
        res.cookies.set("cart_session_id", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
      res.cookies.set("cart_id", cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              code: "VALIDATION_ERROR",
              details: error.errors,
            },
          },
          { status: 400 }
        );
      }

      console.error("Error applying discount:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to apply discount",
          },
        },
        { status: 400 }
      );
    }
  }

  /**
   * DELETE /api/storefront/cart/discount
   * Remove discount code
   */
  static async clearDiscount(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      const existingSessionId = request.cookies.get("cart_session_id")?.value;
      const sessionId = existingSessionId || uuidv4();

      let cartId: string | undefined;
      if (userId) {
        const userCart = await storefrontCartService.getOrCreate(userId, undefined);
        cartId = userCart.id;
      } else {
        // Guests: always operate on the session cart to avoid stale cart_id pointing to a previous user's cart
        const guestCart = await storefrontCartService.getOrCreate(undefined, sessionId);
        cartId = guestCart.id;
      }

      if (!cartId) throw new Error("Cart not found");

      const cart = await storefrontCartService.clearDiscount(cartId);
      const res = NextResponse.json({ success: true, data: cart });

      if (!userId && !existingSessionId) {
        res.cookies.set("cart_session_id", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
      res.cookies.set("cart_id", cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    } catch (error) {
      console.error("Error clearing discount:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to clear discount",
          },
        },
        { status: 400 }
      );
    }
  }

  /**
   * POST /api/storefront/cart/merge
   * Merge guest cart into user cart on login
   */
  static async mergeCart(request: NextRequest) {
    try {
      // TODO: Get authenticated user ID
      const userId = undefined;
      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Authentication required",
              code: "UNAUTHORIZED",
            },
          },
          { status: 401 }
        );
      }

      const guestCartId = request.cookies.get("cart_id")?.value;
      if (!guestCartId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "No guest cart found",
              code: "CART_NOT_FOUND",
            },
          },
          { status: 404 }
        );
      }

      const cart = await storefrontCartService.mergeCart(guestCartId, userId);

      const response = NextResponse.json({
        success: true,
        data: cart,
      });

      // Update cart ID cookie
      response.cookies.set("cart_id", cart.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } catch (error) {
      console.error("Error merging cart:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: error instanceof Error ? error.message : "Failed to merge cart",
          },
        },
        { status: 500 }
      );
    }
  }

  /**
   * POST /api/storefront/cart/clear
   * Clears the current cart and unsets cart cookies
   */
  static async clear(request: NextRequest) {
    try {
      const cartId = request.cookies.get("cart_id")?.value;
      const mode = request.nextUrl.searchParams.get("mode");
      if (cartId && mode !== "cookies") {
        await storefrontCartService.clearCart(cartId);
      }
      const res = NextResponse.json({ success: true });
      // Unset cart cookies
      res.cookies.set("cart_id", "", { maxAge: 0 });
      // Also unset session id to avoid cross-user leakage when a new user logs in on the same browser
      res.cookies.set("cart_session_id", "", { maxAge: 0 });
      return res;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: { message: error instanceof Error ? error.message : "Failed to clear cart" } },
        { status: 500 },
      );
    }
  }
}
