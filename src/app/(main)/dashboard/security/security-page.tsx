"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, RefreshCcw, Save, Gauge, Globe, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getAdminSessionColumns, type AdminSessionRow } from "./sessions-columns";

import { DEFAULTS, type SecuritySettings } from "./_components/security-shared";
import { SecurityMonitoringTab } from "./_components/security-monitoring-tab";
import { SecurityRateLimitTab } from "./_components/security-rate-limit-tab";
import { SecurityOriginTab } from "./_components/security-origin-tab";
import { SecurityEndpointsTab } from "./_components/security-endpoints-tab";
import { SecuritySessionsTab } from "./_components/security-sessions-tab";
import { SecurityPostureTab } from "./_components/security-posture-tab";

export default function SecurityPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULTS);
  const [status, setStatus] = useState<any>(null);

  const [allowedOriginsInput, setAllowedOriginsInput] = useState("");

  const [tab, setTab] = useState("posture");

  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsItems, setSessionsItems] = useState<AdminSessionRow[]>([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsQ, setSessionsQ] = useState("");
  const [sessionsShowAll, setSessionsShowAll] = useState(false);
  const [sessionsIncludeRevoked, setSessionsIncludeRevoked] = useState(false);
  const [sessionsPageIndex, setSessionsPageIndex] = useState(0);
  const [sessionsPageSize, setSessionsPageSize] = useState(10);

  const [revoking, setRevoking] = useState(false);
  const [openRevoke, setOpenRevoke] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminSessionRow | null>(null);

  const originSuggestion = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  function postureLabel(raw: unknown) {
    const v = String(raw || "").trim();
    const lower = v.toLowerCase();
    if (lower === "strong") return "Strong";
    if (lower === "partial") return "Partial";
    if (lower === "off") return "Off";
    return v || "-";
  }

  async function fetchAdminSessions() {
    try {
      setSessionsLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(sessionsPageIndex + 1));
      params.set("limit", String(sessionsPageSize));
      if (sessionsQ) params.set("q", sessionsQ);
      if (sessionsIncludeRevoked) params.set("includeRevoked", "1");
      if (!sessionsShowAll) params.set("activeWithinSec", String(180));
      const res = await fetch(`/api/v1/security/sessions?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load sessions");
      setSessionsItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setSessionsTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load sessions");
    } finally {
      setSessionsLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    try {
      setRevoking(true);
      const res = await fetch("/api/v1/security/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to revoke session");
      toast.success("Session revoked");
      setOpenRevoke(false);
      setRevokeTarget(null);
      void fetchAdminSessions();
    } catch (e: any) {
      toast.error(e.message || "Failed to revoke session");
    } finally {
      setRevoking(false);
    }
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/security/settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load settings");
      const next = { ...DEFAULTS, ...(data.data || {}) } as SecuritySettings;
      setSettings(next);
      setAllowedOriginsInput((next.originCheck.allowedOrigins || []).join("\n"));
    } catch (e: any) {
      toast.error(e.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function fetchStatus() {
    try {
      const res = await fetch("/api/v1/security/status");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load status");
      setStatus(data.data || null);
    } catch {
      setStatus(null);
    }
  }

  async function saveSettings(override?: SecuritySettings) {
    try {
      setSaving(true);
      const payload = override ?? settings;
      const res = await fetch("/api/v1/security/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to save settings");
      const next = { ...DEFAULTS, ...(data.data || {}) } as SecuritySettings;
      setSettings(next);
      setAllowedOriginsInput((next.originCheck.allowedOrigins || []).join("\n"));
      toast.success("Settings saved");
      void fetchStatus();
    } catch (e: any) {
      toast.error(e.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function recommendedDefaults(): SecuritySettings {
    const suggestedOrigins = originSuggestion ? [originSuggestion] : [];
    return {
      ...DEFAULTS,
      originCheck: {
        ...DEFAULTS.originCheck,
        allowedOrigins: suggestedOrigins,
      },
    };
  }

  useEffect(() => {
    void fetchSettings();
    void fetchStatus();
  }, []);

  useEffect(() => {
    if (tab !== "sessions") return;
    void fetchAdminSessions();
  }, [tab, sessionsQ, sessionsShowAll, sessionsIncludeRevoked, sessionsPageIndex, sessionsPageSize]);

  const sessionsColumns = useMemo(
    () =>
      getAdminSessionColumns({
        onRevoke: (row) => {
          setRevokeTarget(row);
          setOpenRevoke(true);
        },
      }),
    [],
  );

  const sessionsTable = useDataTableInstance({
    data: sessionsItems,
    columns: sessionsColumns,
    manualPagination: true,
    defaultPageIndex: sessionsPageIndex,
    defaultPageSize: sessionsPageSize,
    pageCount: Math.max(1, Math.ceil(sessionsTotal / Math.max(1, sessionsPageSize))),
    getRowId: (row) => row.id,
    onPaginationChange: ({ pageIndex: pi, pageSize: ps }) => {
      setSessionsPageIndex(pi);
      setSessionsPageSize(ps);
    },
  });

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-500" />
          <h1 className="text-xl font-semibold">Security</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchSettings()} disabled={loading || saving}>
            <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => void saveSettings()} disabled={loading || saving}>
            <Save className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard title="Rate limiting" value={settings.rateLimit.enabled ? "On" : "Off"} subtitle="Rate limit key endpoints." icon={Gauge} tone="amber" />
        <MetricCard title="Origin protection" value={settings.originCheck.enabled ? "On" : "Off"} subtitle="Origin checks for critical endpoints." icon={Globe} tone="blue" />
        <MetricCard title="Posture" value={postureLabel(status?.posture)} subtitle="Overall security posture" icon={ShieldCheck} tone="violet" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="posture">Posture</TabsTrigger>
          <TabsTrigger value="rateLimit">Rate limit</TabsTrigger>
          <TabsTrigger value="origin">Origin</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring & Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="posture" className="pt-2">
          <SecurityPostureTab
            settings={settings}
            status={status}
            saving={saving}
            onRefresh={() => {
              void fetchSettings();
              void fetchStatus();
            }}
            onEnableRecommended={() => {
              const rec = recommendedDefaults();
              setSettings(rec);
              setAllowedOriginsInput((rec.originCheck.allowedOrigins || []).join("\n"));
              void saveSettings(rec);
            }}
          />
        </TabsContent>

        <TabsContent value="rateLimit" className="pt-2">
          <SecurityRateLimitTab settings={settings} setSettings={setSettings} />
        </TabsContent>

        <TabsContent value="origin" className="pt-2">
          <SecurityOriginTab
            settings={settings}
            setSettings={setSettings}
            allowedOriginsInput={allowedOriginsInput}
            setAllowedOriginsInput={setAllowedOriginsInput}
            originSuggestion={originSuggestion}
          />
        </TabsContent>

        <TabsContent value="endpoints" className="pt-2">
          <SecurityEndpointsTab status={status} />
        </TabsContent>

        <TabsContent value="sessions" className="pt-2">
          <SecuritySessionsTab
            loading={sessionsLoading}
            q={sessionsQ}
            setQ={setSessionsQ}
            showAll={sessionsShowAll}
            setShowAll={setSessionsShowAll}
            includeRevoked={sessionsIncludeRevoked}
            setIncludeRevoked={setSessionsIncludeRevoked}
            table={sessionsTable}
            columns={sessionsColumns}
            total={sessionsTotal}
            pageIndex={sessionsPageIndex}
            pageSize={sessionsPageSize}
            onRefresh={() => void fetchAdminSessions()}
            openRevoke={openRevoke}
            setOpenRevoke={setOpenRevoke}
            revoking={revoking}
            revokeTarget={revokeTarget}
            setRevokeTarget={setRevokeTarget}
            onRevoke={(id) => void revokeSession(id)}
          />
        </TabsContent>

        <TabsContent value="monitoring" className="pt-2">
          <SecurityMonitoringTab settings={settings} setSettings={setSettings} disabled={loading || saving} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
