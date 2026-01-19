"use client";

import { useMemo, useState } from "react";
import { LocalDateTime } from "@/components/common/local-datetime";
import { useNewNotifications } from "@/hooks/use-new-notifications";

type Item = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  createdAt: string;
};

export function NewsletterAdminClient({ items, query }: { items: Item[]; query: Record<string, string | undefined> }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const anySelected = useMemo(() => Object.values(selected).some(Boolean), [selected]);

  const { isNew } = useNewNotifications({ type: "newsletter_subscribed", limit: 300 });

  const toggle = (id: string, v: boolean) => setSelected((s) => ({ ...s, [id]: v }));
  const selectAll = (v: boolean) => {
    const next: Record<string, boolean> = {};
    for (const it of items) next[it.id] = v;
    setSelected(next);
  };

  async function bulkUnsubscribe() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    await fetch("/api/v1/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    window.location.reload();
  }

  async function bulkResendConfirm() {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) return;
    await fetch("/api/v1/newsletter/resend-confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    alert("Queued confirmation emails.");
  }

  async function manualAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const name = String(fd.get("name") || "");
    const confirmed = fd.get("confirmed") === "on";
    await fetch("/api/v1/newsletter/add", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, confirmed }) });
    e.currentTarget.reset();
    window.location.reload();
  }

  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) qs.set(k, v);
  const csvUrl = `/api/v1/newsletter/export?${qs.toString()}`;

  return (
    <div className="space-y-4">
      <form className="flex flex-wrap gap-2" action="/dashboard/marketing/newsletter" method="get">
        <input name="email" placeholder="Email" defaultValue={query.email || ""} className="border rounded px-2 py-1" />
        <select name="status" defaultValue={query.status || ""} className="border rounded px-2 py-1">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <input type="date" name="from" defaultValue={query.from || ""} className="border rounded px-2 py-1" />
        <input type="date" name="to" defaultValue={query.to || ""} className="border rounded px-2 py-1" />
        <button className="border rounded px-3 py-1">Filter</button>
        <a href={csvUrl} className="border rounded px-3 py-1">Export CSV</a>
      </form>

      <div className="flex gap-2">
        <button className="border rounded px-3 py-1" onClick={() => selectAll(true)}>Select all</button>
        <button className="border rounded px-3 py-1" onClick={() => selectAll(false)}>Clear</button>
        <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={!anySelected} onClick={bulkUnsubscribe}>Bulk unsubscribe</button>
        <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={!anySelected} onClick={bulkResendConfirm}>Resend confirmation</button>
      </div>

      <form onSubmit={manualAdd} className="flex flex-wrap gap-2 items-center">
        <input name="name" placeholder="Name (optional)" className="border rounded px-2 py-1" />
        <input name="email" type="email" placeholder="Email" className="border rounded px-2 py-1" required />
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" name="confirmed" /> Confirmed</label>
        <button className="border rounded px-3 py-1">Add subscriber</button>
      </form>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-3 py-2"><input type="checkbox" onChange={(e) => selectAll(e.currentTarget.checked)} /></th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className={"border-t " + (isNew(r.id) ? "bg-amber-50/60" : "") }>
                <td className="px-3 py-2"><input type="checkbox" checked={!!selected[r.id]} onChange={(e) => toggle(r.id, e.currentTarget.checked)} /></td>
                <td className="px-3 py-2 font-medium">{r.email}</td>
                <td className="px-3 py-2">{r.name || "—"}</td>
                <td className="px-3 py-2 capitalize">{r.status}</td>
                <td className="px-3 py-2"><LocalDateTime value={r.createdAt} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
