"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Download, Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { FormModal } from "@/components/ui/form-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useNewNotifications } from "@/hooks/use-new-notifications";

import { getNewsletterSubscriberColumns, type NewsletterSubscriberRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function NewsletterPage() {
  const { isNew } = useNewNotifications({ type: "newsletter_subscribed", limit: 300 });

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NewsletterSubscriberRow[]>([]);
  const [total, setTotal] = useState(0);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", confirmed: false });

  const columns = useMemo<ColumnDef<NewsletterSubscriberRow, any>[]>(() => {
    return getNewsletterSubscriberColumns() as unknown as ColumnDef<NewsletterSubscriberRow, any>[];
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      if (email) params.set("email", email);
      if (status && status !== "all") params.set("status", status);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/v1/newsletter?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error?.message || "Failed to load subscribers");

      const rows = (data?.data?.items || []).map((i: any) => ({
        id: String(i.id),
        email: String(i.email || ""),
        name: i.name ?? null,
        status: String(i.status || ""),
        createdAt: i.createdAt,
      })) as NewsletterSubscriberRow[];

      setItems(rows);
      setTotal(Number(data?.data?.total || 0));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, status, dateFrom, dateTo, pageIndex, pageSize]);

  const table = useDataTableInstance({
    data: items,
    columns: columns as any,
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

  const selectedIds = (table as any)
    .getSelectedRowModel?.()
    ?.rows?.map((r: any) => String(r?.original?.id))
    ?.filter(Boolean) as string[];
  const hasSelection = Array.isArray(selectedIds) && selectedIds.length > 0;

  async function bulkUnsubscribe() {
    if (!hasSelection) return;
    try {
      setLoading(true);
      const res = await fetch("/api/v1/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error?.message || "Bulk unsubscribe failed");
      toast.success("Unsubscribed");
      (table as any).resetRowSelection?.();
      void fetchItems();
    } catch (e: any) {
      toast.error(e?.message || "Bulk unsubscribe failed");
    } finally {
      setLoading(false);
    }
  }

  async function bulkResendConfirm() {
    if (!hasSelection) return;
    try {
      setLoading(true);
      const res = await fetch("/api/v1/newsletter/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error?.message || "Resend failed");
      toast.success("Queued confirmation emails");
      (table as any).resetRowSelection?.();
    } catch (e: any) {
      toast.error(e?.message || "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit() {
    if (!form.email) {
      toast.error("Email is required");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/v1/newsletter/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, name: form.name, confirmed: form.confirmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) throw new Error(data?.error?.message || "Add failed");
      toast.success("Subscriber added");
      setOpen(false);
      setForm({ email: "", name: "", confirmed: false });
      void fetchItems();
    } catch (e: any) {
      toast.error(e?.message || "Add failed");
    } finally {
      setSubmitting(false);
    }
  }

  const csvParams = new URLSearchParams();
  if (email) csvParams.set("email", email);
  if (status && status !== "all") csvParams.set("status", status);
  if (dateFrom) csvParams.set("from", dateFrom);
  if (dateTo) csvParams.set("to", dateTo);
  const exportUrl = `/api/v1/newsletter/export?${csvParams.toString()}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Newsletter Subscribers</h1>
        <p className="text-sm text-muted-foreground">Filter, export CSV, bulk actions, and manual add.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" placeholder="Filter by email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date from</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date to</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void fetchItems()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button asChild variant="outline">
            <a href={exportUrl}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </a>
          </Button>
          <Button variant="outline" disabled={!hasSelection || loading} onClick={() => void bulkUnsubscribe()}>
            Bulk unsubscribe
          </Button>
          <Button variant="outline" disabled={!hasSelection || loading} onClick={() => void bulkResendConfirm()}>
            Resend confirmation
          </Button>
          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : setOpen(false))}
            title="Add subscriber"
            className="sm:max-w-[520px]"
            submitting={submitting}
            submitText="Add"
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add subscriber
              </Button>
            }
          >
            <div className="grid gap-3 py-2">
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  placeholder="subscriber@example.com"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Name (optional)</Label>
                <Input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="confirmed"
                  checked={form.confirmed}
                  onCheckedChange={(v) => setForm((s) => ({ ...s, confirmed: Boolean(v) }))}
                />
                <Label htmlFor="confirmed">Confirmed</Label>
              </div>
            </div>
          </FormModal>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <DataTable
          table={table as any}
          columns={columns as any}
          getRowClassName={(row) => (isNew((row as any).id) ? "bg-amber-50/60" : undefined)}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />
    </div>
  );
}
