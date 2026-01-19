"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Bell, Check, Archive, ExternalLink, Truck, Package, Megaphone, AlertTriangle } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  status?: "unread" | "read" | "archived";
  type?: string;
  createdAt: string;
}

const STATUSES = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
] as const;

type StatusKey = typeof STATUSES[number]["key"];

export default function AccountNotificationsPage() {
  const [status, setStatus] = useState<StatusKey>("unread");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);

  const hasMore = useMemo(() => page * limit < total, [page, limit, total]);

  const fetchList = async (opts?: { reset?: boolean }) => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      qs.set("page", String(opts?.reset ? 1 : page));
      qs.set("limit", String(limit));
      if (status !== "all") qs.set("status", status);
      if (search.trim()) qs.set("search", search.trim());
      const res = await fetch(`/api/storefront/notifications?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data?.success) {
        setItems(data.data?.items || []);
        setTotal(Number(data.data?.total || 0));
        if (opts?.reset) setPage(1);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    const t = setTimeout(() => void fetchList({ reset: true }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Optimistic actions with toasts
  const markAllRead = async () => {
    const prev = items;
    try {
      if (status === "unread") {
        setItems([]);
        setTotal(0);
      }
      const res = await fetch("/api/storefront/notifications/mark-all", { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark all as read");
      toast.success("All notifications marked as read");
      if (status !== "unread") void fetchList({ reset: true });
    } catch (e) {
      setItems(prev);
      toast.error("Could not mark all as read");
    }
  };
  const markRead = async (id: string) => {
    const prev = items;
    try {
      if (status === "unread") {
        setItems((arr) => arr.filter((n) => n.id !== id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setItems((arr) => arr.map((n) => (n.id === id ? { ...n, status: "read" } : n)));
      }
      const res = await fetch(`/api/storefront/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to mark as read");
      toast.success("Marked as read");
    } catch (e) {
      setItems(prev);
      toast.error("Could not mark as read");
    }
  };
  const archive = async (id: string) => {
    const prev = items;
    try {
      setItems((arr) => arr.filter((n) => n.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      const res = await fetch(`/api/storefront/notifications/${id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive");
      toast.success("Archived");
    } catch (e) {
      setItems(prev);
      toast.error("Could not archive");
    }
  };

  // SSE realtime: append unreads as they arrive if filter allows
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/storefront/notifications/stream");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (!data || !data.kind) return;
          if (data.kind === "created") {
            if ((status === "all" || status === "unread") && !search.trim()) {
              setItems((arr) => [{
                id: data.payload?.id,
                title: data.payload?.title,
                message: data.payload?.message,
                createdAt: data.payload?.createdAt,
                actionUrl: data.payload?.actionUrl,
                type: data.payload?.type,
                status: "unread",
              }, ...arr]);
              setTotal((t) => t + 1);
            }
            toast(data.payload?.title || "New notification", { description: data.payload?.message || "" });
          }
        } catch {}
      };
    } catch {}
    return () => { try { es?.close(); } catch {} };
  }, [status, search]);

  const getTypeMeta = (type?: string) => {
    const t = (type || "").toString();
    if (t.includes("order_ship") || t === "order_shipped") return { Icon: Truck, badge: "bg-blue-600 text-white" };
    if (t.includes("order_deliver") || t === "order_delivered") return { Icon: Package, badge: "bg-emerald-600 text-white" };
    if (t.includes("order_")) return { Icon: Package, badge: "bg-primary text-primary-foreground" };
    if (t.includes("promo") || t.includes("promotion")) return { Icon: Megaphone, badge: "bg-pink-600 text-white" };
    if (t.includes("system") || t.includes("alert")) return { Icon: AlertTriangle, badge: "bg-amber-500 text-white" };
    return { Icon: Bell, badge: "bg-slate-600 text-white" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground">Stay up to date with your account and orders</p>
        </div>
        <div className="flex w-full sm:w-auto items-stretch sm:items-center gap-2 flex-col sm:flex-row">
          <Input
            placeholder="Search notifications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Button variant="outline" onClick={() => void fetchList({ reset: true })} className="w-full sm:w-auto">Search</Button>
        </div>
      </div>

      <Tabs value={status} className="w-full" onValueChange={(v) => setStatus(v as StatusKey)}>
        <TabsList className="mb-4 w-full justify-start overflow-x-auto whitespace-nowrap no-scrollbar">
          {STATUSES.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
          </CardTitle>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="ghost" size="sm" onClick={markAllRead} className="w-full sm:w-auto justify-center">
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div key={n.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4">
                  <div className="min-w-0 flex items-start gap-3">
                    {(() => { const { Icon } = getTypeMeta(n.type); return (<div className="mt-0.5 p-2 rounded-md bg-muted/50"><Icon className="h-4 w-4" /></div>); })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[60vw] sm:max-w-[40vw]">{n.title}</span>
                        {n.type && (() => { const { badge } = getTypeMeta(n.type); return (<span className={`text-xs px-2 py-0.5 rounded-md ${badge}`}>{n.type.replace(/_/g, " ")}</span>); })()}
                        {n.status === "unread" && <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary" />}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(parseISO(String(n.createdAt)), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.actionUrl && (
                      <Button variant="outline" size="sm" onClick={() => (window.location.href = n.actionUrl!)}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Open
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                      <Check className="h-4 w-4 mr-1" /> Read
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => archive(n.id)}>
                      <Archive className="h-4 w-4 mr-1" /> Archive
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {items.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {page} • {total} total
              </div>
              <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
