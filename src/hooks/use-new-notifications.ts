"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type NotificationRow = {
  id: string;
  type: string;
  status: string;
  metadata?: any;
};

export function useNewNotifications(params: {
  type: string;
  limit?: number;
  enabled?: boolean;
  entityIdFrom?: (n: NotificationRow) => string | null;
}) {
  const { type, limit = 100, enabled = true, entityIdFrom } = params;

  const [notifIds, setNotifIds] = useState<string[]>([]);
  const [entityIds, setEntityIds] = useState<string[]>([]);

  const entitySet = useMemo(() => new Set(entityIds), [entityIds]);
  const ranMarkRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let alive = true;

    const fetchUnread = async () => {
      try {
        const url = new URL("/api/storefront/notifications", window.location.origin);
        url.searchParams.set("status", "unread");
        url.searchParams.set("type", type);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("sort", "createdAt.desc");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) return;

        const items = Array.isArray(data?.data?.items) ? (data.data.items as NotificationRow[]) : [];
        const ids: string[] = [];
        const eids: string[] = [];

        for (const n of items) {
          const id = String((n as any)?.id || "");
          if (id) ids.push(id);

          const eid = entityIdFrom
            ? entityIdFrom(n)
            : (n as any)?.metadata?.entityId
              ? String((n as any).metadata.entityId)
              : null;
          if (eid) eids.push(eid);
        }

        setNotifIds(ids);
        setEntityIds(eids);
      } catch {
        // ignore
      }
    };

    void fetchUnread();

    return () => {
      alive = false;
    };
  }, [type, limit, enabled, entityIdFrom]);

  useEffect(() => {
    if (!enabled) return;
    if (ranMarkRef.current) return;
    if (!notifIds.length) return;

    ranMarkRef.current = true;
    fetch("/api/storefront/notifications/mark-read-bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: notifIds }),
    }).catch(() => {
      // ignore
    });
  }, [notifIds, enabled]);

  return {
    notifIds,
    entityIds,
    isNew: (entityId: string) => entitySet.has(String(entityId)),
  };
}
