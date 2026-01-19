import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { gte, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Clock, Inbox, FolderOpen, CheckCircle2 } from "lucide-react";
import { SupportVolumeBars } from "./_components/volume-bars";

export const metadata = { title: "Support Reports" };

type SupportMetricTone = "blue" | "amber" | "emerald" | "violet";

const supportToneStyles: Record<SupportMetricTone, { card: string; chip: string }> = {
  blue: { card: "bg-gradient-to-br from-blue-500/10 to-card", chip: "bg-blue-600" },
  amber: { card: "bg-gradient-to-br from-amber-500/12 to-card", chip: "bg-amber-600" },
  emerald: { card: "bg-gradient-to-br from-emerald-500/10 to-card", chip: "bg-emerald-600" },
  violet: { card: "bg-gradient-to-br from-violet-500/10 to-card", chip: "bg-violet-600" },
};

function SupportMetricCard({
  title,
  value,
  icon: Icon,
  tone,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: SupportMetricTone;
}) {
  const styles = supportToneStyles[tone];

  return (
    <div className={`rounded-xl border p-4 shadow-xs dark:bg-card ${styles.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums">{value}</div>
        </div>
        <div className={`shrink-0 rounded-lg p-2 ${styles.chip}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat().format(n); }
function fmtMs(ms: number) {
  if (!isFinite(ms) || ms <= 0) return "—";
  const mins = ms / 60000;
  if (mins < 60) return `${mins.toFixed(1)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${hrs.toFixed(1)}h`;
  const days = hrs / 24;
  return `${days.toFixed(1)}d`;
}

export default async function SupportReportsPage() {
  const session = await auth();
  const roles = ((session?.user as any)?.roles as string[] | undefined) ?? [];
  const perms = ((session?.user as any)?.permissions as string[] | undefined) ?? [];
  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/dashboard/support/messages/reports");
    redirect(`/login-v2?callbackUrl=${callbackUrl}`);
  }
  if (!roles.includes("super_admin") && !perms.includes("support.view") && !perms.includes("support.manage")) {
    redirect("/unauthorized");
  }

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id: schema.contactMessages.id,
      status: schema.contactMessages.status,
      priority: schema.contactMessages.priority,
      createdAt: schema.contactMessages.createdAt,
      respondedAt: schema.contactMessages.respondedAt,
    })
    .from(schema.contactMessages)
    .where(gte(schema.contactMessages.createdAt as any, since30))
    .orderBy(desc(schema.contactMessages.createdAt));

  const totals = {
    total: rows.length,
    new: rows.filter(r => String(r.status) === "new").length,
    open: rows.filter(r => String(r.status) === "open").length,
    closed: rows.filter(r => String(r.status) === "closed").length,
    spam: rows.filter(r => String(r.status) === "spam").length,
  };

  const responded = rows.filter(r => r.respondedAt);
  const avgResponseMs = responded.length
    ? responded.reduce((acc, r) => acc + (new Date(r.respondedAt as any).getTime() - new Date(r.createdAt as any).getTime()), 0) / responded.length
    : 0;

  const days: { dateKey: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    days.push({ dateKey: key, count: 0 });
  }
  for (const r of rows) {
    if (new Date(r.createdAt as any) < since14) continue;
    const key = new Date(r.createdAt as any).toISOString().slice(0, 10);
    const day = days.find((d) => d.dateKey === key);
    if (day) day.count += 1;
  }
  const maxDay = Math.max(1, ...days.map(d => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Reports</h1>
        <p className="text-sm text-muted-foreground">Last 30 days overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SupportMetricCard title="Total" value={fmt(totals.total)} icon={Inbox} tone="blue" />
        <SupportMetricCard title="Open" value={fmt(totals.open)} icon={FolderOpen} tone="amber" />
        <SupportMetricCard title="Closed" value={fmt(totals.closed)} icon={CheckCircle2} tone="emerald" />
        <SupportMetricCard title="Avg response" value={fmtMs(avgResponseMs)} icon={Clock} tone="violet" />
      </div>

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Last 14 days volume</div>
        <SupportVolumeBars days={days} maxDay={maxDay} />
      </div>

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">By status</div>
        <ul className="text-sm space-y-1">
          <li>new: {fmt(totals.new)}</li>
          <li>open: {fmt(totals.open)}</li>
          <li>closed: {fmt(totals.closed)}</li>
          <li>spam: {fmt(totals.spam)}</li>
        </ul>
      </div>
    </div>
  );
}
