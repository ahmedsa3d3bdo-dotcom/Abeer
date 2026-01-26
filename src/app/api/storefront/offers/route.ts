import { NextResponse } from "next/server";
import { storefrontOffersService } from "@/server/storefront/services/offers.service";

export async function GET() {
  try {
    const items = await storefrontOffersService.listActiveDisplayPromotions();
    return NextResponse.json({ success: true, data: { items } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { message: e?.message || "Failed to load offers" } }, { status: 500 });
  }
}
