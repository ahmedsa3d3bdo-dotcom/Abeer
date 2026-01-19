import type { NextRequest } from "next/server";
import { EmailsController } from "@/server/controllers/emails.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  return EmailsController.send(request);
}
