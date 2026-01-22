"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, HardDrive, Cpu, ArrowDownUp, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAppLocale } from "@/components/common/local-datetime";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

type Range = "current" | "24h" | "7d";

type ApiResponse<T> = { success: boolean; data?: T; error?: { message?: string } };

type SeriesItem = {
  ts: string;
  cpuUsagePct: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  netRxDeltaBytes: number | null;
  netTxDeltaBytes: number | null;
};

type ChartSeriesItem = SeriesItem & {
  memUsedGB: number | null;
  diskUsedGB: number | null;
  netRxMbps: number | null;
  netTxMbps: number | null;
};

type SeriesData = {
  range: Range;
  bucketSec: number;
  since: string;
  items: SeriesItem[];
};

type CurrentSample = {
  cpuUsagePct: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  netRxBytes: number | null;
  netTxBytes: number | null;
  netRxDeltaBytes: number | null;
  netTxDeltaBytes: number | null;
  sampleIntervalSec?: number | null;
  createdAt: string;
};

type MetricsPayload = {
  range: Range;
  current: CurrentSample | null;
  series: { range: Range; bucketSec: number; since: string; items: SeriesItem[] };
};

function formatBytes(bytes: number | null | undefined) {
  const b = typeof bytes === "number" ? bytes : 0;
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function toGB(bytes: number | null | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  return bytes / (1024 * 1024 * 1024);
}

function toMbpsFromBytes(bytes: number | null | undefined, seconds: number | null | undefined) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return null;
  const s = typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  if (!s) return null;
  return (bytes * 8) / (s * 1_000_000);
}

function pct(used: number | null | undefined, total: number | null | undefined) {
  if (typeof used !== "number" || typeof total !== "number" || !Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
  return Math.round(Math.max(0, Math.min(100, (used / total) * 100)));
}

const cpuChartConfig = {
  cpuUsagePct: { label: "CPU %", color: "var(--chart-1)" },
} satisfies ChartConfig;

const memChartConfig = {
  memUsedGB: { label: "Used (GB)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const diskChartConfig = {
  diskUsedGB: { label: "Used (GB)", color: "var(--chart-3)" },
} satisfies ChartConfig;

const netChartConfig = {
  netRxMbps: { label: "RX (Mb/s)", color: "var(--chart-4)" },
  netTxMbps: { label: "TX (Mb/s)", color: "var(--chart-5)" },
} satisfies ChartConfig;

export default function SystemMetricsPage() {
  const locale = useAppLocale();
  const [range, setRange] = useState<Range>("current");
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState<MetricsPayload | null>(null);

  const cards = useMemo(() => {
    const cur = payload?.current || null;
    const cpu = cur?.cpuUsagePct ?? null;

    const memUsed = cur?.memUsedBytes ?? null;
    const memTotal = cur?.memTotalBytes ?? null;
    const memPct = pct(memUsed, memTotal);

    const diskUsed = cur?.diskUsedBytes ?? null;
    const diskTotal = cur?.diskTotalBytes ?? null;
    const diskPct = pct(diskUsed, diskTotal);

    const rxDelta = cur?.netRxDeltaBytes ?? null;
    const txDelta = cur?.netTxDeltaBytes ?? null;
    const intervalSec = (cur as any)?.sampleIntervalSec ?? payload?.series?.bucketSec ?? 1;

    const rxMbps = toMbpsFromBytes(rxDelta, intervalSec);
    const txMbps = toMbpsFromBytes(txDelta, intervalSec);

    return {
      cpu: cpu != null ? `${cpu}%` : "—",
      mem: memPct != null ? `${memPct}%` : "—",
      disk: diskPct != null ? `${diskPct}%` : "—",
      net:
        rxMbps != null || txMbps != null
          ? `${(rxMbps ?? 0).toFixed(2)} / ${(txMbps ?? 0).toFixed(2)} Mb/s`
          : rxDelta != null || txDelta != null
            ? `${formatBytes(rxDelta)} / ${formatBytes(txDelta)}`
            : "—",
      memSub: memUsed != null && memTotal != null ? `${formatBytes(memUsed)} / ${formatBytes(memTotal)}` : "—",
      diskSub: diskUsed != null && diskTotal != null ? `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}` : "—",
    };
  }, [payload, range]);

  useEffect(() => {
    void fetchMetrics();
  }, [range]);

  async function fetchMetrics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/system/metrics?range=${range}`, { cache: "no-store" });
      const j = (await res.json()) as ApiResponse<MetricsPayload>;
      if (!res.ok) throw new Error(j?.error?.message || "Failed to load system metrics");
      setPayload((j.data as any) || null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load system metrics");
    } finally {
      setLoading(false);
    }
  }

  const series = useMemo<ChartSeriesItem[]>(() => {
    const base = payload?.series?.items || [];
    const bucketSec = payload?.series?.bucketSec || 0;
    const sec = Math.max(1, bucketSec || 1);
    return base.map((r) => ({
      ...r,
      memUsedGB: toGB(r.memUsedBytes),
      diskUsedGB: toGB(r.diskUsedBytes),
      netRxMbps: toMbpsFromBytes(r.netRxDeltaBytes, sec),
      netTxMbps: toMbpsFromBytes(r.netTxDeltaBytes, sec),
    }));
  }, [payload]);

  const fmtGB = useMemo(() => (value: any) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2)} GB`;
  }, []);

  const fmtMbps = useMemo(() => (value: any) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2)} Mb/s`;
  }, []);

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold">System Metrics</div>
          <div className="text-sm text-muted-foreground">CPU, RAM, Disk and Network</div>
        </div>

        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={range} onValueChange={(v) => (v ? setRange(v as Range) : null)} variant="outline">
            <ToggleGroupItem value="current">Current</ToggleGroupItem>
            <ToggleGroupItem value="24h">24h</ToggleGroupItem>
            <ToggleGroupItem value="7d">7d</ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" onClick={() => void fetchMetrics()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="CPU" value={cards.cpu} icon={Cpu} tone="blue" />
        <MetricCard title="RAM" value={cards.mem} subtitle={cards.memSub} icon={Activity} tone="violet" />
        <MetricCard title="Disk" value={cards.disk} subtitle={cards.diskSub} icon={HardDrive} tone="amber" />
        <MetricCard title="Network (RX / TX)" value={cards.net} icon={ArrowDownUp} tone="emerald" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardTitle>CPU Usage</CardTitle>
            <CardDescription>Average by bucket</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={cpuChartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={series}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    try {
                      return new Intl.DateTimeFormat(locale || undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
                    } catch {
                      return String(value);
                    }
                  }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" valueFormatter={(v) => `${Number(v).toFixed(0)}%`} />} />
                <Area dataKey="cpuUsagePct" type="natural" fill="var(--color-cpuUsagePct)" stroke="var(--color-cpuUsagePct)" fillOpacity={0.15} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Network Traffic</CardTitle>
            <CardDescription>Sum of deltas per bucket</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={netChartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={series}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    try {
                      return new Intl.DateTimeFormat(locale || undefined, { month: "short", day: "numeric", hour: "2-digit" }).format(new Date(value));
                    } catch {
                      return String(value);
                    }
                  }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" valueFormatter={(v, k) => (k === "netRxMbps" || k === "netTxMbps" ? fmtMbps(v) : String(v))} />} />
                <Area dataKey="netRxMbps" type="natural" fill="var(--color-netRxMbps)" stroke="var(--color-netRxMbps)" fillOpacity={0.12} />
                <Area dataKey="netTxMbps" type="natural" fill="var(--color-netTxMbps)" stroke="var(--color-netTxMbps)" fillOpacity={0.12} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle>RAM Used</CardTitle>
            <CardDescription>Average used bytes by bucket</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={memChartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={series}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    try {
                      return new Intl.DateTimeFormat(locale || undefined, { month: "short", day: "numeric", hour: "2-digit" }).format(new Date(value));
                    } catch {
                      return String(value);
                    }
                  }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" valueFormatter={(v, k) => (k === "memUsedGB" ? fmtGB(v) : String(v))} />} />
                <Area dataKey="memUsedGB" type="natural" fill="var(--color-memUsedGB)" stroke="var(--color-memUsedGB)" fillOpacity={0.12} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardTitle>Disk Used</CardTitle>
            <CardDescription>Average used bytes by bucket</CardDescription>
          </CardHeader>
          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer config={diskChartConfig} className="aspect-auto h-[260px] w-full">
              <AreaChart data={series}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="ts"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    try {
                      return new Intl.DateTimeFormat(locale || undefined, { month: "short", day: "numeric", hour: "2-digit" }).format(new Date(value));
                    } catch {
                      return String(value);
                    }
                  }}
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" valueFormatter={(v, k) => (k === "diskUsedGB" ? fmtGB(v) : String(v))} />} />
                <Area dataKey="diskUsedGB" type="natural" fill="var(--color-diskUsedGB)" stroke="var(--color-diskUsedGB)" fillOpacity={0.12} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
