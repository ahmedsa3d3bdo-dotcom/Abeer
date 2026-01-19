"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { RefreshCcw, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useNewNotifications } from "@/hooks/use-new-notifications";

import { getContactMessageColumns, type ContactMessageRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function MessagesPage() {
  const router = useRouter();
  const { isNew } = useNewNotifications({ type: "contact_message", limit: 200 });

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ContactMessageRow[]>([]);
  const [total, setTotal] = useState(0);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [q, setQ] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const columns = useMemo<ColumnDef<ContactMessageRow, any>[]>(() => {
    return getContactMessageColumns() as unknown as ColumnDef<ContactMessageRow, any>[];
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      if (q) params.set("q", q);
      if (email) params.set("email", email);
      if (status && status !== "all") params.set("status", status);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);

      const res = await fetch(`/api/v1/support/messages?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data?.success === false) throw new Error(data?.error?.message || "Failed to load messages");

      const rows = (data?.data?.items || []).map((i: any) => ({
        id: String(i.id),
        name: i.name ?? null,
        email: String(i.email || ""),
        subject: i.subject ?? null,
        status: String(i.status || ""),
        priority: String(i.priority || ""),
        createdAt: i.createdAt,
        respondedAt: i.respondedAt ?? null,
      })) as ContactMessageRow[];

      setItems(rows);
      setTotal(Number(data?.data?.total || 0));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, email, status, dateFrom, dateTo, pageIndex, pageSize]);

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

  const csvParams = new URLSearchParams();
  if (q) csvParams.set("q", q);
  if (email) csvParams.set("email", email);
  if (status && status !== "all") csvParams.set("status", status);
  if (dateFrom) csvParams.set("from", dateFrom);
  if (dateTo) csvParams.set("to", dateTo);
  const exportUrl = `/api/v1/support/messages/export?${csvParams.toString()}`;

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Messages</h1>
        <p className="text-sm text-muted-foreground">Messages from the storefront contact form.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search subject or message" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
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
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
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
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <DataTable
          table={table as any}
          columns={columns as any}
          onRowClick={(row) => router.push(`/dashboard/support/messages/${(row as any).id}`)}
          getRowClassName={(row) => (isNew((row as any).id) ? "bg-amber-50/60" : undefined)}
        />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />
    </div>
  );
}
