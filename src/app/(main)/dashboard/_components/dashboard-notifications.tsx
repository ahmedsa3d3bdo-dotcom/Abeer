"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { displayNotificationTitle } from "../notifications/columns";

type NotifItem = {
  id: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  type?: string;
};

export function DashboardNotifications() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotifItem[]>([]);

  const refresh = async () => {
    try {
      const res = await fetch("/api/storefront/notifications?status=unread&page=1&limit=5&sort=createdAt.desc", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.success) return;
      setUnreadCount(Number(data?.data?.total || 0));
      const list = Array.isArray(data?.data?.items) ? data.data.items : [];
      setItems(
        list.map((n: any) => ({
          id: String(n.id),
          title: String(n.title || ""),
          message: String(n.message || ""),
          actionUrl: n.actionUrl ?? null,
          type: n.type ?? undefined,
        }))
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void refresh();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/storefront/notifications/stream");
      es.onmessage = () => {
        void refresh();
      };
    } catch {}
    return () => {
      try {
        es?.close();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        setOpen(open);
        if (open) void refresh();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-80 rounded-lg p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={async () => {
              try {
                const res = await fetch("/api/storefront/notifications/mark-all", { method: "POST" });
                if (res.ok) {
                  setUnreadCount(0);
                  setItems([]);
                }
              } catch {}
              setOpen(false);
            }}
          >
            Mark all as read
          </Button>
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">You're all caught up</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                onClick={async () => {
                  try {
                    await fetch(`/api/storefront/notifications/${n.id}/read`, { method: "POST" });
                    setUnreadCount((c) => Math.max(0, c - 1));
                    setItems((prev) => prev.filter((x) => x.id !== n.id));
                  } catch {}
                  setOpen(false);
                  if (n.actionUrl) window.location.href = n.actionUrl;
                }}
              >
                <div className="text-sm font-medium line-clamp-1">{displayNotificationTitle({ type: n.type, title: n.title })}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Link href="/dashboard/notifications">
            <Button variant="ghost" className="w-full" onClick={() => setOpen(false)}>
              View all notifications
            </Button>
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
