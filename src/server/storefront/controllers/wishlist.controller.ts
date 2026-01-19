import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { storefrontWishlistService } from "../services/wishlist.service";

const itemSchema = z.object({ productId: z.string().uuid() });
const mergeSchema = z.object({ productIds: z.array(z.string().uuid()).default([]) });

export class StorefrontWishlistController {
  static async list() {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Authentication required" } }, { status: 401 });
      const items = await storefrontWishlistService.list(userId);
      return NextResponse.json({ success: true, data: items });
    } catch (error) {
      return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to list wishlist" } }, { status: 500 });
    }
  }

  static async add(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Authentication required" } }, { status: 401 });
      const body = await request.json();
      const data = itemSchema.parse(body);
      const items = await storefrontWishlistService.add(userId, data.productId);
      return NextResponse.json({ success: true, data: items });
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { message: "Validation failed", details: error.errors } }, { status: 400 });
      return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to add to wishlist" } }, { status: 500 });
    }
  }

  static async remove(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Authentication required" } }, { status: 401 });
      const body = await request.json();
      const data = itemSchema.parse(body);
      const items = await storefrontWishlistService.remove(userId, data.productId);
      return NextResponse.json({ success: true, data: items });
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { message: "Validation failed", details: error.errors } }, { status: 400 });
      return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to remove from wishlist" } }, { status: 500 });
    }
  }

  static async merge(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Authentication required" } }, { status: 401 });
      const body = await request.json().catch(() => ({}));
      const data = mergeSchema.parse(body || {});
      const items = await storefrontWishlistService.merge(userId, data.productIds || []);
      return NextResponse.json({ success: true, data: items });
    } catch (error) {
      if (error instanceof z.ZodError) return NextResponse.json({ success: false, error: { message: "Validation failed", details: error.errors } }, { status: 400 });
      return NextResponse.json({ success: false, error: { message: error instanceof Error ? error.message : "Failed to merge wishlist" } }, { status: 500 });
    }
  }

  static async clear() {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId)
        return NextResponse.json(
          { success: false, error: { message: "Authentication required" } },
          { status: 401 }
        );
      await storefrontWishlistService.clear(userId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: { message: error instanceof Error ? error.message : "Failed to clear wishlist" },
        },
        { status: 500 }
      );
    }
  }
}
