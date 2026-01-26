import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { storefrontCartService } from "@/server/storefront/services/cart.service";

const singleSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
});

const multiSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1).default(1),
      }),
    )
    .min(1),
});

const schema = z.union([singleSchema, multiSchema]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);

    const prevCartId = request.cookies.get("cart_id")?.value || null;

    const bnSession = `buy-${uuidv4()}`;
    const cart = await storefrontCartService.getOrCreate(undefined, bnSession);

    try {
      await storefrontCartService.clearCart(cart.id);
    } catch {}

    let updated = cart;
    if ("items" in parsed) {
      for (const it of parsed.items) {
        updated = await storefrontCartService.addItem({
          cartId: updated.id,
          productId: it.productId,
          variantId: it.variantId,
          quantity: it.quantity,
        });
      }
    } else {
      updated = await storefrontCartService.addItem({
        cartId: cart.id,
        productId: parsed.productId,
        variantId: parsed.variantId,
        quantity: parsed.quantity,
      });
    }

    const response = NextResponse.json({
      success: true,
      data: { cartId: updated.id, checkoutUrl: "/checkout?mode=buy-now" },
    });

    response.cookies.set("buy_now_cart_id", updated.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 30,
    });
    if (prevCartId) {
      response.cookies.set("prev_cart_id", prevCartId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 30,
      });
    }
    response.cookies.set("cart_id", updated.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 30,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { message: "Validation failed", details: error.errors } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { message: error instanceof Error ? error.message : "Buy now failed" } },
      { status: 500 }
    );
  }
}
