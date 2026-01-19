import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { storefrontPreferencesService } from "../services/preferences.service";

const updateSchema = z.object({
  promotions: z.boolean().optional(),
  backInStock: z.boolean().optional(),
  priceDrop: z.boolean().optional(),
  emailOrderUpdates: z.boolean().optional(),
  emailPromotions: z.boolean().optional(),
  emailNewsletter: z.boolean().optional(),
  emailRecommendations: z.boolean().optional(),
});

export class StorefrontPreferencesController {
  static async get(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
      const row = await storefrontPreferencesService.get(userId);
      return NextResponse.json({ success: true, data: row });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: { message: e?.message || "Failed to load preferences" } }, { status: 500 });
    }
  }

  static async update(request: NextRequest) {
    try {
      const session = await auth();
      const userId = (session as any)?.user?.id as string | undefined;
      if (!userId) return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
      const body = await request.json().catch(() => ({}));
      const input = updateSchema.parse(body || {});
      const row = await storefrontPreferencesService.update(userId, input);
      return NextResponse.json({ success: true, data: row });
    } catch (e: any) {
      if (e?.issues) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", details: e.issues } }, { status: 400 });
      return NextResponse.json({ success: false, error: { message: e?.message || "Failed to update preferences" } }, { status: 500 });
    }
  }
}
