"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, Send, Clock, XCircle, Reply, Users, Calendar, Percent, Mail } from "lucide-react";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getEmailLogColumns, type EmailLogRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function EmailLogsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EmailLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [toFilter, setToFilter] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);

  const columns = useMemo(
    () =>
      getEmailLogColumns({
        onResend: async (row) => {
          try {
            const original = (allItemsRef.current.find((r) => r.id === row.id) as any) || (row as any);
            const res = await fetch(`/api/v1/emails/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: row.to, subject: row.subject, html: original.body || undefined, text: !original.body ? row.subject : undefined, metadata: { resendOf: row.id } }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || "Resend failed");
            toast.success("Email resent");
            void fetchLogs();
          } catch (e: any) {
            toast.error(e.message || "Resend failed");
          }
        },
      }),
    [],
  );

  const allItemsRef = { current: [] as any[] } as { current: any[] };

  const table = useDataTableInstance({
    data: items,
    columns,
    manualPagination: true,
    defaultPageIndex: pageIndex,
    defaultPageSize: pageSize,
    pageCount: Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    getRowId: (row) => row.id,
    onPaginationChange: ({ pageIndex: pi, pageSize: ps }) => {
      setPageIndex(pi);
      setPageSize(ps);
    },
  });

  useEffect(() => {
    void fetchLogs();
    void fetchMetrics();
  }, [pageIndex, pageSize, status, toFilter]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (toFilter) params.set("to", toFilter);
      if (status) params.set("status", status);
      const res = await fetch(`/api/v1/emails/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      if (toFilter) params.set("to", toFilter);
      if (status) params.set("status", status);
      const res = await fetch(`/api/v1/emails/logs?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load logs");
      const mapped = (data.data?.items || []).map((r: any) => ({ id: r.id, to: r.to, from: r.from, subject: r.subject, status: r.status, createdAt: r.createdAt, body: r.body }));
      setItems(mapped.map((r: any) => ({ id: r.id, to: r.to, from: r.from, subject: r.subject, status: r.status, createdAt: r.createdAt })));
      allItemsRef.current = mapped;
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-8">
        <MetricCard title="Total" value={metrics?.totalLogs ?? total} icon={Mail} tone="blue" />
        <MetricCard title="Pending" value={Number(metrics?.pendingCount ?? 0)} icon={Clock} tone="amber" />
        <MetricCard title="Sent" value={Number(metrics?.sentCount ?? 0)} icon={Send} tone="emerald" />
        <MetricCard title="Failed" value={Number(metrics?.failedCount ?? 0)} icon={XCircle} tone="rose" />
        <MetricCard title="Bounced" value={Number(metrics?.bouncedCount ?? 0)} icon={Reply} tone="slate" />
        <MetricCard title="New (30d)" value={Number(metrics?.last30dCount ?? 0)} icon={Calendar} tone="violet" />
        <MetricCard title="Recipients" value={Number(metrics?.distinctRecipients ?? 0)} icon={Users} tone="blue" />
        <MetricCard title="Delivery rate" value={`${Number(metrics?.deliveryRate ?? 0)}%`} icon={Percent} tone="emerald" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchLogs()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button
            variant="default"
            disabled={loading}
            onClick={async () => {
              try {
                setLoading(true);
                const res = await fetch(`/api/v1/emails/worker`, { method: "POST" });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error?.message || "Worker run failed");
                toast.success(`Processed ${data?.data?.processed ?? 0}: sent ${data?.data?.sent ?? 0}, failed ${data?.data?.failed ?? 0}`);
                void fetchLogs();
              } catch (e: any) {
                toast.error(e.message || "Worker run failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Send className="mr-1 h-4 w-4" /> Send pending
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="To (email)" value={toFilter} onChange={(e) => setToFilter(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchLogs()} className="w-56" />
          <Select value={status} onValueChange={(v) => setStatus(v || undefined)}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />
    </div>
  );
}
