"use client";

import Link from "next/link";
import { LocalDateTime } from "@/components/common/local-datetime";
import { useNewNotifications } from "@/hooks/use-new-notifications";

type Row = {
  id: string;
  name: string | null;
  email: string;
  subject: string | null;
  status: string;
  priority: string;
  createdAt: string;
  respondedAt: string | null;
};

export function MessagesTableClient({ items }: { items: Row[] }) {
  const { isNew } = useNewNotifications({ type: "contact_message", limit: 200 });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-sm">
        <thead className="bg-muted">
          <tr>
            <th className="px-3 py-2 text-left">Subject</th>
            <th className="px-3 py-2 text-left">From</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Priority</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-left">Responded</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className={"border-t " + (isNew(r.id) ? "bg-amber-50/60" : "")}>
              <td className="px-3 py-2 font-medium">
                <Link href={`/dashboard/support/messages/${r.id}`}>{r.subject || "(no subject)"}</Link>
              </td>
              <td className="px-3 py-2">{r.name ? `${r.name} <${r.email}>` : r.email}</td>
              <td className="px-3 py-2 capitalize">{String(r.status)}</td>
              <td className="px-3 py-2 capitalize">{String(r.priority)}</td>
              <td className="px-3 py-2"><LocalDateTime value={r.createdAt as any} /></td>
              <td className="px-3 py-2">{r.respondedAt ? <LocalDateTime value={r.respondedAt as any} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
