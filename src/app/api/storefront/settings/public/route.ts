import { NextResponse } from "next/server";
import { settingsRepository } from "@/server/repositories/settings.repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const { items } = await settingsRepository.list({ page: 1, limit: 500, isPublic: true, sort: "createdAt.asc" });

  return NextResponse.json({
    success: true,
    data: {
      items: items.map((s) => ({
        key: s.key,
        value: s.value,
        type: s.type,
        description: s.description,
        isPublic: s.isPublic,
      })),
    },
  });
}
