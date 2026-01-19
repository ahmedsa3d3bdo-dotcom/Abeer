import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/shared/db";
import { shippingAddresses } from "@/shared/db/schema/shipping";
import { and, desc, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const [address] = await db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, session.user.id))
      .orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt))
      .limit(1);

    return NextResponse.json({ success: true, data: address || null });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load shipping address" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const input = body || {};

    // Find existing default or latest address
    const [existing] = await db
      .select()
      .from(shippingAddresses)
      .where(eq(shippingAddresses.userId, session.user.id))
      .orderBy(desc(shippingAddresses.isDefault), desc(shippingAddresses.updatedAt))
      .limit(1);

    let saved;
    if (existing) {
      [saved] = await db
        .update(shippingAddresses)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company ?? null,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          phone: input.phone,
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(eq(shippingAddresses.id, existing.id))
        .returning();
    } else {
      [saved] = await db
        .insert(shippingAddresses)
        .values({
          userId: session.user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          company: input.company ?? null,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2 ?? null,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
          country: input.country,
          phone: input.phone,
          isDefault: true,
        })
        .returning();
    }

    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to save shipping address" } },
      { status: 500 }
    );
  }
}
