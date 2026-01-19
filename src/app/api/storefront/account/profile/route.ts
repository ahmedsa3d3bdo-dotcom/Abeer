import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        phone: schema.users.phone,
        avatar: schema.users.avatar,
      })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);

    return NextResponse.json({ success: true, data: user });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to load profile" } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
    }

    const body = await request.json();
    const updates: Partial<{ firstName: string | null; lastName: string | null; phone: string | null; avatar: string | null }> = {
      firstName: body.firstName ?? null,
      lastName: body.lastName ?? null,
      phone: body.phone ?? null,
      avatar: body.avatar ?? null,
    };

    const [saved] = await db
      .update(schema.users)
      .set(updates as any)
      .where(eq(schema.users.id, session.user.id))
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        phone: schema.users.phone,
        avatar: schema.users.avatar,
      });

    return NextResponse.json({ success: true, data: saved });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: { message: e?.message || "Failed to update profile" } },
      { status: 500 }
    );
  }
}
