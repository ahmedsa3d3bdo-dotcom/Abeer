import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { notificationsService } from "@/server/services/notifications.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const session = await auth();
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ success: false, error: { message: "Unauthorized" } }, { status: 401 });
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const limit = Number(url.searchParams.get("limit") || 10);
  const status = url.searchParams.get("status") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const search = url.searchParams.get("search") || undefined;
  const sort = (url.searchParams.get("sort") as any) || "createdAt.desc";
  const result = await notificationsService.list({ page, limit, sort, userId, status, type, search });
  if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, data: result.data });
}
