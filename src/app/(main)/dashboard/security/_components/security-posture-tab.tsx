import { AlertTriangle, CheckCircle2, RefreshCcw, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { SecuritySettings } from "./security-shared";

function statusPill(label: string, value: string, tone: "good" | "warn" | "bad") {
  const cls =
    tone === "good"
      ? "border-green-200 bg-green-50 text-green-700"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
      <div className="text-sm font-medium">{label}</div>
      <div className={`rounded-md border px-2 py-0.5 text-xs ${cls}`}>{value}</div>
    </div>
  );
}

function bytesToMb(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "-";
  return `${Math.round(n / (1024 * 1024))}MB`;
}

export function SecurityPostureTab(props: {
  settings: SecuritySettings;
  status: any;
  saving: boolean;
  onRefresh: () => void;
  onEnableRecommended: () => void;
}) {
  const { settings, status, saving, onRefresh, onEnableRecommended } = props;

  const headers = status?.headers || {};
  const backups = status?.backups || {};
  const schedule = backups?.schedule || null;
  const uploadMaxBytes = Number(backups?.uploadMaxBytes || 0);
  const uploadMaxLabel = bytesToMb(uploadMaxBytes);

  const risks: Array<{ title: string; detail: string; severity: "high" | "medium" }> = [];

  if (!settings.rateLimit.enabled) {
    risks.push({
      title: "Rate limiting disabled",
      detail: "Key endpoints can be brute-forced or spammed.",
      severity: "high",
    });
  }

  if (!settings.originCheck.enabled) {
    risks.push({
      title: "Origin checks disabled",
      detail: "Requests can come from unexpected origins.",
      severity: "high",
    });
  }

  const origins = Array.isArray(settings.originCheck.allowedOrigins) ? settings.originCheck.allowedOrigins : [];
  const hasInsecureOrigin = origins.some((o) => String(o).trim().toLowerCase().startsWith("http://"));
  if (hasInsecureOrigin) {
    risks.push({
      title: "Insecure origin allowlist entry",
      detail: "Allowlisted origins should be HTTPS in production.",
      severity: "medium",
    });
  }

  if (headers?.isProd && !headers?.hsts) {
    risks.push({
      title: "HSTS disabled",
      detail: "HTTPS downgrade protection is not enforced.",
      severity: "medium",
    });
  }

  const retentionOk = Boolean(schedule?.enabled) && (Number(schedule?.keepLast || 0) > 0 || Number(schedule?.maxAgeDays || 0) > 0);
  if (!retentionOk) {
    risks.push({
      title: "Backup retention not configured",
      detail: "Enable schedule + retention to ensure recovery points exist.",
      severity: "medium",
    });
  }

  const tooLargeUploads = uploadMaxBytes > 500 * 1024 * 1024;
  if (tooLargeUploads) {
    risks.push({
      title: "Backup upload limit is high",
      detail: "Large uploads increase storage and abuse risk.",
      severity: "medium",
    });
  }

  const postureRaw = String(status?.posture || "").trim().toLowerCase();
  const posture = postureRaw ? postureRaw[0].toUpperCase() + postureRaw.slice(1) : "-";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <CardTitle className="text-base">Posture</CardTitle>
              <div className="mt-1 text-sm text-muted-foreground">A quick overview of your current security posture.</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onRefresh()} disabled={saving}>
                <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
              </Button>
              <Button onClick={() => onEnableRecommended()} disabled={saving}>
                <ShieldAlert className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Enable recommended defaults
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {statusPill("Overall posture", posture, postureRaw === "strong" ? "good" : postureRaw === "partial" ? "warn" : "bad")}
            {statusPill("Rate limiting", settings.rateLimit.enabled ? "On" : "Off", settings.rateLimit.enabled ? "good" : "bad")}
            {statusPill("Origin checks", settings.originCheck.enabled ? "On" : "Off", settings.originCheck.enabled ? "good" : "bad")}
            {statusPill("CSP", headers?.csp ? "On" : "Off", headers?.csp ? "good" : "warn")}
            {statusPill("HSTS", headers?.hsts ? "On" : "Off", headers?.hsts ? "good" : headers?.isProd ? "bad" : "warn")}
            {statusPill(
              "Backups retention",
              retentionOk ? "Configured" : "Not set",
              retentionOk ? "good" : "warn",
            )}
            {statusPill("Backup upload limit", uploadMaxLabel, tooLargeUploads ? "warn" : "good")}
            {statusPill("Admin RBAC", status?.rbac?.enabled ? "On" : "-", status?.rbac?.enabled ? "good" : "warn")}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Top risks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {risks.length ? (
                  <div className="space-y-2">
                    {risks.slice(0, 4).map((r) => (
                      <div key={r.title} className="flex items-start gap-2 rounded-lg border p-3">
                        {r.severity === "high" ? (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{r.title}</div>
                          <div className="text-xs text-muted-foreground">{r.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div className="text-sm">No high-priority risks detected.</div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>
                  Origin allowlist behavior: when the allowlist is empty, only the current site origin is accepted.
                </div>
                <div>
                  Headers (CSP/HSTS) are derived from the server configuration and environment.
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
