import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { requirePermission } from "@/server/utils/rbac";
import { notificationsService } from "@/server/services/notifications.service";
import { emailsService } from "@/server/services/emails.service";
import { securityService } from "@/server/services/security.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(request, "security.manage");

    const settings = await securityService.getSettingsCached();

    let inApp: any = null;

    const baseTitle = "Security alert test";
    const stamp = new Date().toISOString();
    const title = `${baseTitle} (${stamp})`;
    const message = "This is a test alert from the Security dashboard.";
    const actionUrl = "/dashboard/security?tab=monitoring";

    if (settings.monitoring.notifications.inAppAdmins) {
      inApp = await notificationsService.sendToRoles(
        {
          roleSlugs: ["super_admin", "admin"],
          type: "system_alert" as any,
          title,
          message,
          actionUrl,
          metadata: { kind: "test_alert" },
        },
        {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        },
      );
    }

    const emails = Array.isArray(settings.monitoring.notifications.emails) ? settings.monitoring.notifications.emails : [];
    for (const to of emails) {
      await emailsService.send(
        {
          to,
          subject: baseTitle,
          text: message,
          metadata: { kind: "test_alert" },
        },
        {
          userId: (session.user as any)?.id,
          ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ok: true,
        inAppAdmins: Boolean(settings.monitoring.notifications.inAppAdmins),
        inApp,
        emailsCount: emails.length,
      },
    });
  } catch (e: any) {
    const msg = process.env.NODE_ENV === "production" ? "Internal server error" : (e?.message || "Failed");
    return NextResponse.json({ success: false, error: { message: msg } }, { status: 500 });
  }
}
