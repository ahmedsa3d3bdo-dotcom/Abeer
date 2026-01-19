"use client";

import { LocalDate, useAppLocale } from "@/components/common/local-datetime";

function parseYyyyMmDdLocal(s: string): Date {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
  if (!m) return new Date(s);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d);
}

export function SupportVolumeBars({ days, maxDay }: { days: Array<{ dateKey: string; count: number }>; maxDay: number }) {
  const locale = useAppLocale();

  return (
    <div className="grid grid-cols-14 gap-2 items-end" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-full bg-primary/20 rounded" style={{ height: `${(d.count / maxDay) * 80 + 4}px` }} />
          <div
            className="text-[10px] text-muted-foreground"
            title={typeof d.dateKey === "string" ? new Intl.DateTimeFormat(locale || undefined, { year: "numeric", month: "short", day: "2-digit" }).format(parseYyyyMmDdLocal(d.dateKey)) : String(d.dateKey)}
          >
            {d.count}
          </div>
          <span className="sr-only"><LocalDate value={d.dateKey} /></span>
        </div>
      ))}
    </div>
  );
}
