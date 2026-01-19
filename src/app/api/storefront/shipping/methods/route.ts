import { NextResponse } from "next/server";
import { db } from "@/shared/db";
import { shippingMethods } from "@/shared/db/schema/shipping";
import { desc, eq, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await db
      .select({
        id: shippingMethods.id,
        name: shippingMethods.name,
        description: shippingMethods.description,
        price: shippingMethods.price,
        estimatedDays: shippingMethods.estimatedDays,
        carrier: shippingMethods.carrier,
      })
      .from(shippingMethods)
      .where(eq(shippingMethods.isActive, true))
      .orderBy(shippingMethods.sortOrder);

    return NextResponse.json({ success: true, data: items });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load shipping methods" } },
      { status: 500 }
    );
  }
}
