import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationsService } from "@/server/services/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  const { id } = await context.params;
  const result = await notificationsService.archive(id, { userId });
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, data: result.data });
}
