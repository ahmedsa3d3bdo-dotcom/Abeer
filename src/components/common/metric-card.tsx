"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type MetricTone = "slate" | "blue" | "emerald" | "amber" | "rose" | "violet";

const toneStyles: Record<MetricTone, { card: string; chip: string }> = {
  slate: {
    card: "bg-gradient-to-br from-slate-500/10 to-card",
    chip: "bg-slate-700",
  },
  blue: {
    card: "bg-gradient-to-br from-blue-500/10 to-card",
    chip: "bg-blue-600",
  },
  emerald: {
    card: "bg-gradient-to-br from-emerald-500/10 to-card",
    chip: "bg-emerald-600",
  },
  amber: {
    card: "bg-gradient-to-br from-amber-500/12 to-card",
    chip: "bg-amber-600",
  },
  rose: {
    card: "bg-gradient-to-br from-rose-500/10 to-card",
    chip: "bg-rose-600",
  },
  violet: {
    card: "bg-gradient-to-br from-violet-500/10 to-card",
    chip: "bg-violet-600",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "slate",
  className,
}: {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: LucideIcon;
  tone?: MetricTone;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-xs",
        "dark:bg-card",
        styles.card,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="mt-1 text-2xl font-semibold leading-tight tabular-nums">{value}</div>
          {subtitle !== undefined && subtitle !== null && (
            <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        <div className={cn("shrink-0 rounded-lg p-2", styles.chip)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
