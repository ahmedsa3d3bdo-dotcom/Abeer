"use client";

import { useEffect, useMemo, useState } from "react";

let publicSettingsPromise: Promise<Record<string, string> | null> | null = null;

async function loadPublicSettings(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch("/api/storefront/settings/public", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    const items = json?.data?.items;
    if (!Array.isArray(items)) return null;
    const map: Record<string, string> = {};
    for (const it of items) {
      if (it?.key && typeof it?.value === "string") map[String(it.key)] = it.value;
    }
    return map;
  } catch {
    return null;
  }
}

export function useAppLocale(): string | undefined {
  const [locale, setLocale] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    publicSettingsPromise ??= loadPublicSettings();
    void publicSettingsPromise.then((settings) => {
      if (!alive) return;
      const v = settings?.["app.locale"];
      setLocale(typeof v === "string" && v ? v : undefined);
    });
    return () => {
      alive = false;
    };
  }, []);

  return locale;
}

export function useAppTimeZone(): string | undefined {
  const [timeZone, setTimeZone] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    publicSettingsPromise ??= loadPublicSettings();
    void publicSettingsPromise.then((settings) => {
      if (!alive) return;
      const v = settings?.["app.time_zone"];
      setTimeZone(typeof v === "string" && v ? v : undefined);
    });
    return () => {
      alive = false;
    };
  }, []);

  return timeZone;
}

function getZonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
  };
}

function zonedWallTimeToUtcDate(input: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ms: number;
  timeZone: string;
}): Date {
  let guess = new Date(Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, input.second, input.ms));
  for (let i = 0; i < 2; i++) {
    const p = getZonedParts(guess, input.timeZone);
    const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, input.ms);
    const desired = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, input.second, input.ms);
    const diff = desired - asIfUtc;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

function coerceDate(value: string | number | Date | null | undefined, appTimeZone?: string): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const s = value.trim();
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(s);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const local = new Date(y, mo - 1, d);
      return isNaN(local.getTime()) ? null : local;
    }

    const isNaiveDateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/.test(s);
    const hasZoneInfo = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
    if (isNaiveDateTime && !hasZoneInfo && appTimeZone) {
      const mm = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(s);
      if (mm) {
        const year = Number(mm[1]);
        const month = Number(mm[2]);
        const day = Number(mm[3]);
        const hour = Number(mm[4]);
        const minute = Number(mm[5]);
        const second = mm[6] ? Number(mm[6]) : 0;
        const ms = mm[7] ? Number(mm[7].padEnd(3, "0")) : 0;
        try {
          const zoned = zonedWallTimeToUtcDate({ year, month, day, hour, minute, second, ms, timeZone: appTimeZone });
          return isNaN(zoned.getTime()) ? null : zoned;
        } catch {
          // fall through
        }
      }
    }
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function LocalDate({
  value,
  fallback = "—",
  options,
}: {
  value: string | number | Date | null | undefined;
  fallback?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const locale = useAppLocale();
  const timeZone = useAppTimeZone();
  const date = useMemo(() => coerceDate(value, timeZone), [timeZone, value]);

  const text = useMemo(() => {
    if (!date) return fallback;
    try {
      return new Intl.DateTimeFormat(locale || undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        ...(options ?? {}),
      }).format(date);
    } catch {
      return fallback;
    }
  }, [date, fallback, locale, options]);

  return <span>{text}</span>;
}

export function LocalTime({
  value,
  fallback = "—",
  options,
}: {
  value: string | number | Date | null | undefined;
  fallback?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const locale = useAppLocale();
  const timeZone = useAppTimeZone();
  const date = useMemo(() => coerceDate(value, timeZone), [timeZone, value]);

  const text = useMemo(() => {
    if (!date) return fallback;
    try {
      return new Intl.DateTimeFormat(locale || undefined, {
        hour: "2-digit",
        minute: "2-digit",
        ...(options ?? {}),
      }).format(date);
    } catch {
      return fallback;
    }
  }, [date, fallback, locale, options]);

  return <span>{text}</span>;
}

export function LocalDateTime({
  value,
  fallback = "—",
  options,
}: {
  value: string | number | Date | null | undefined;
  fallback?: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  const locale = useAppLocale();
  const timeZone = useAppTimeZone();
  const date = useMemo(() => coerceDate(value, timeZone), [timeZone, value]);

  const text = useMemo(() => {
    if (!date) return fallback;
    try {
      return new Intl.DateTimeFormat(locale || undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        ...(options ?? {}),
      }).format(date);
    } catch {
      return fallback;
    }
  }, [date, fallback, locale, options]);

  return <span>{text}</span>;
}
