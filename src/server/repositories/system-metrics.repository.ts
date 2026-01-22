import { db } from "@/shared/db";
import { systemMetricsSamples } from "@/shared/db/schema/system";
import { desc, gte, sql } from "drizzle-orm";
import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

type MetricsSnapshot = {
  cpuUsagePct: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  netRxBytes: number | null;
  netTxBytes: number | null;
};

type StoredSample = {
  cpuUsagePct: number | null;
  memUsedBytes: number | null;
  memTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskTotalBytes: number | null;
  netRxBytes: number | null;
  netTxBytes: number | null;
  netRxDeltaBytes: number | null;
  netTxDeltaBytes: number | null;
  sampleIntervalSec: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeNumber(v: any): number | null {
  const cleaned =
    typeof v === "string"
      ? v
          .trim()
          // some locales / tools output thousands separators
          .replace(/,/g, "")
          .replace(/\s+/g, "")
      : v;
  const n = typeof cleaned === "bigint" ? Number(cleaned) : Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

const execFileAsync = promisify(execFile);

function winExeCandidates(kind: "powershell" | "pwsh" | "netstat") {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";

  if (kind === "netstat") {
    return [
      `${systemRoot}\\System32\\netstat.exe`,
      `${systemRoot}\\Sysnative\\netstat.exe`,
      "netstat",
    ];
  }

  if (kind === "powershell") {
    return [
      `${systemRoot}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`,
      `${systemRoot}\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe`,
      "powershell",
    ];
  }

  return [
    "pwsh",
    "pwsh.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    "C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe",
  ];
}

async function execWinFirstAvailable(
  candidates: string[],
  args: string[],
  options: any,
): Promise<{ stdout: string; stderr: string }> {
  let lastErr: unknown = null;
  for (const cmd of candidates) {
    try {
      const out = await execFileAsync(cmd, args, options);
      return { stdout: String((out as any)?.stdout ?? ""), stderr: String((out as any)?.stderr ?? "") };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function parseProcStatCpuLine(content: string): { total: number; idle: number } | null {
  const line = content
    .split(/\r?\n/)
    .find((l) => l.startsWith("cpu "));
  if (!line) return null;
  const parts = line
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((x) => Number(x));
  if (parts.length < 4 || parts.some((x) => !Number.isFinite(x))) return null;

  const [user, nice, system, idle, iowait, irq, softirq, steal] = parts;
  const idleAll = (idle || 0) + (iowait || 0);
  const nonIdle = (user || 0) + (nice || 0) + (system || 0) + (irq || 0) + (softirq || 0) + (steal || 0);
  const total = idleAll + nonIdle;
  return { total, idle: idleAll };
}

function parseProcNetDev(content: string): { rx: number; tx: number } | null {
  const lines = content.split(/\r?\n/).slice(2);
  let rx = 0;
  let tx = 0;

  for (const line of lines) {
    const raw = String(line || "").trim();
    if (!raw) continue;
    const [ifaceRaw, restRaw] = raw.split(":");
    if (!restRaw) continue;
    const iface = String(ifaceRaw || "").trim();
    if (!iface || iface === "lo") continue;

    const cols = restRaw
      .trim()
      .split(/\s+/)
      .map((x) => Number(x));

    // rx bytes col[0], tx bytes col[8]
    if (cols.length >= 9) {
      const rxb = cols[0];
      const txb = cols[8];
      if (Number.isFinite(rxb)) rx += rxb;
      if (Number.isFinite(txb)) tx += txb;
    }
  }

  return { rx, tx };
}

function cpuTotalsFromOs() {
  const cpus = os.cpus();
  let total = 0;
  let idle = 0;
  for (const c of cpus) {
    const t = c.times as any;
    const i = Number(t?.idle || 0);
    const user = Number(t?.user || 0);
    const nice = Number(t?.nice || 0);
    const sys = Number(t?.sys || 0);
    const irq = Number(t?.irq || 0);
    const coreTotal = i + user + nice + sys + irq;
    if (Number.isFinite(coreTotal)) total += coreTotal;
    if (Number.isFinite(i)) idle += i;
  }
  if (!Number.isFinite(total) || !Number.isFinite(idle) || total <= 0) return null;
  return { total, idle };
}

async function getCpuUsagePctFromProc(): Promise<number | null> {
  try {
    const c1 = await fs.readFile("/proc/stat", "utf8");
    const s1 = parseProcStatCpuLine(c1);
    if (!s1) return null;
    await sleep(200);
    const c2 = await fs.readFile("/proc/stat", "utf8");
    const s2 = parseProcStatCpuLine(c2);
    if (!s2) return null;

    const totald = s2.total - s1.total;
    const idled = s2.idle - s1.idle;
    if (totald <= 0) return null;

    const usage = (1 - idled / totald) * 100;
    const pct = Math.round(Math.max(0, Math.min(100, usage)));
    return pct;
  } catch {
    return null;
  }
}

async function getCpuUsagePctFromOs(): Promise<number | null> {
  const s1 = cpuTotalsFromOs();
  if (!s1) return null;
  await sleep(200);
  const s2 = cpuTotalsFromOs();
  if (!s2) return null;
  const totald = s2.total - s1.total;
  const idled = s2.idle - s1.idle;
  if (totald <= 0) return null;
  const usage = (1 - idled / totald) * 100;
  return Math.round(Math.max(0, Math.min(100, usage)));
}

async function getCpuUsagePct(): Promise<number | null> {
  const proc = await getCpuUsagePctFromProc();
  if (proc != null) return proc;
  return getCpuUsagePctFromOs();
}

async function getDiskUsageBytes(): Promise<{ used: number | null; total: number | null }> {
  const diskPath = process.env.SYSTEM_METRICS_DISK_PATH || "/";
  try {
    const stats = await (fs as any).statfs(diskPath);
    const bsize = safeNumber(stats?.bsize) ?? safeNumber(stats?.frsize) ?? null;
    const blocks = safeNumber(stats?.blocks);
    const bfree = safeNumber(stats?.bfree);
    if (!bsize || blocks == null || bfree == null) return { used: null, total: null };

    const total = blocks * bsize;
    const used = Math.max(0, (blocks - bfree) * bsize);
    return { used, total };
  } catch {
    return { used: null, total: null };
  }
}

async function getNetworkTotalsBytes(): Promise<{ rx: number | null; tx: number | null }> {
  try {
    const c = await fs.readFile("/proc/net/dev", "utf8");
    const v = parseProcNetDev(c);
    if (!v) return { rx: null, tx: null };
    return { rx: v.rx, tx: v.tx };
  } catch {
    // Fallback (Windows/macOS)
    const platform = process.platform;
    try {
      if (platform === "win32") {
        let lastWinNetErr: unknown = null;

        // 1) Preferred: Get-NetAdapterStatistics (cumulative totals)
        {
          const cmd =
            "$ErrorActionPreference='Stop';" +
            "$items=(Get-NetAdapterStatistics | Where-Object { $_.Name -and $_.Name -notmatch 'Loopback' -and $_.ReceivedBytes -ne $null -and $_.SentBytes -ne $null });" +
            "$rx=($items | Measure-Object -Property ReceivedBytes -Sum).Sum;" +
            "$tx=($items | Measure-Object -Property SentBytes -Sum).Sum;" +
            "Write-Output (([string]$rx)+','+([string]$tx))";
          try {
            const out = await execWinFirstAvailable(
              [...winExeCandidates("powershell"), ...winExeCandidates("pwsh")],
              ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", cmd],
              { timeout: 2500, windowsHide: true },
            );
            const s = String(out.stdout || "").trim();
            const [rxRaw, txRaw] = s.split(",").map((x) => x.trim());
            const rx = safeNumber(rxRaw);
            const tx = safeNumber(txRaw);
            if (rx != null && tx != null) return { rx, tx };
          } catch (e) {
            lastWinNetErr = e;
          }
        }

        // 2) Fallback: WMI raw perf counters (usually cumulative)
        {
          const cmd =
            "$ErrorActionPreference='SilentlyContinue';" +
            "$items=Get-CimInstance -ClassName Win32_PerfRawData_Tcpip_NetworkInterface;" +
            "$items=$items | Where-Object { $_.Name -and $_.Name -notmatch 'Loopback' -and $_.Name -notmatch 'isatap' -and $_.Name -notmatch 'Teredo' };" +
            "$rx=($items | Measure-Object -Property BytesReceivedPersec -Sum).Sum;" +
            "$tx=($items | Measure-Object -Property BytesSentPersec -Sum).Sum;" +
            "Write-Output (([string]$rx)+','+([string]$tx))";
          try {
            const out = await execWinFirstAvailable(
              [...winExeCandidates("powershell"), ...winExeCandidates("pwsh")],
              ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", cmd],
              { timeout: 2500, windowsHide: true },
            );
            const s = String(out.stdout || "").trim();
            const [rxRaw, txRaw] = s.split(",").map((x) => x.trim());
            const rx = safeNumber(rxRaw);
            const tx = safeNumber(txRaw);
            if (rx != null && tx != null) return { rx, tx };
          } catch (e) {
            lastWinNetErr = e;
          }
        }

        // 3) Fallback: CIM StandardCimv2 (cumulative totals on many Windows builds)
        {
          const cmd =
            "$ErrorActionPreference='SilentlyContinue';" +
            "$items=Get-CimInstance -Namespace root/StandardCimv2 -ClassName MSFT_NetAdapterStatisticsSettingData;" +
            "$rx=($items | Measure-Object -Property ReceivedBytes -Sum).Sum;" +
            "$tx=($items | Measure-Object -Property SentBytes -Sum).Sum;" +
            "Write-Output (([string]$rx)+','+([string]$tx))";
          try {
            const out = await execWinFirstAvailable(
              [...winExeCandidates("powershell"), ...winExeCandidates("pwsh")],
              ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", cmd],
              { timeout: 2500, windowsHide: true },
            );
            const s = String(out.stdout || "").trim();
            const [rxRaw, txRaw] = s.split(",").map((x) => x.trim());
            const rx = safeNumber(rxRaw);
            const tx = safeNumber(txRaw);
            if (rx != null && tx != null) return { rx, tx };
          } catch (e) {
            lastWinNetErr = e;
          }
        }

        // 4) Fallback: netstat -e (bytes received/sent since boot)
        {
          try {
            const out = await execWinFirstAvailable(winExeCandidates("netstat"), ["-e"], { timeout: 2500, windowsHide: true } as any);
            const text = String(out.stdout || "");
            const lines = text.split(/\r?\n/).map((l) => l.trim());

            // Locale-agnostic: pick the line that contains 2+ numeric tokens and has the largest total.
            let best: { rx: number; tx: number; score: number } | null = null;
            for (const line of lines) {
              const matches = line.match(/[0-9][0-9,\.\s]*/g) || [];
              const nums = matches.map((m) => safeNumber(m)).filter((n): n is number => n != null);
              if (nums.length < 2) continue;
              const rx = nums[nums.length - 2];
              const tx = nums[nums.length - 1];
              const score = rx + tx;
              if (!best || score > best.score) best = { rx, tx, score };
            }
            if (best && Number.isFinite(best.rx) && Number.isFinite(best.tx)) return { rx: best.rx, tx: best.tx };
          } catch (e) {
            lastWinNetErr = e;
          }
        }

        if (process.env.NODE_ENV !== "production") {
          console.warn("[system-metrics] Windows network counters unavailable (all methods failed)", lastWinNetErr);
        }
        return { rx: null, tx: null };
      }

      if (platform === "darwin") {
        // netstat -ib output: Name ... Ibytes Obytes
        const out = await execFileAsync("netstat", ["-ib"], { timeout: 2500 });
        const text = String((out as any)?.stdout || "");
        const lines = text.split(/\r?\n/);
        const headerIdx = lines.findIndex((l) => l.includes("Ibytes") && l.includes("Obytes"));
        const start = headerIdx >= 0 ? headerIdx + 1 : 0;
        let rx = 0;
        let tx = 0;
        for (const line of lines.slice(start)) {
          const cols = line.trim().split(/\s+/);
          if (cols.length < 10) continue;
          const name = cols[0];
          if (!name || name === "lo0") continue;
          const iBytes = safeNumber(cols[cols.length - 2]);
          const oBytes = safeNumber(cols[cols.length - 1]);
          if (iBytes != null) rx += iBytes;
          if (oBytes != null) tx += oBytes;
        }
        return { rx: Number.isFinite(rx) ? rx : null, tx: Number.isFinite(tx) ? tx : null };
      }
    } catch {
      // ignore
    }

    return { rx: null, tx: null };
  }
}

export class SystemMetricsRepository {
  async getLatestSample() {
    const [row] = await db.select().from(systemMetricsSamples).orderBy(desc(systemMetricsSamples.createdAt)).limit(1);
    return row || null;
  }

  async collectSnapshot(): Promise<MetricsSnapshot> {
    const cpuUsagePct = await getCpuUsagePct();

    const memTotalBytes = safeNumber(os.totalmem());
    const memFreeBytes = safeNumber(os.freemem());
    const memUsedBytes = memTotalBytes != null && memFreeBytes != null ? Math.max(0, memTotalBytes - memFreeBytes) : null;

    const disk = await getDiskUsageBytes();
    const net = await getNetworkTotalsBytes();

    return {
      cpuUsagePct,
      memUsedBytes,
      memTotalBytes,
      diskUsedBytes: disk.used,
      diskTotalBytes: disk.total,
      netRxBytes: net.rx,
      netTxBytes: net.tx,
    };
  }

  async insertSample(input: StoredSample) {
    const [row] = await db
      .insert(systemMetricsSamples)
      .values({
        cpuUsagePct: input.cpuUsagePct ?? null,
        memUsedBytes: input.memUsedBytes ?? null,
        memTotalBytes: input.memTotalBytes ?? null,
        diskUsedBytes: input.diskUsedBytes ?? null,
        diskTotalBytes: input.diskTotalBytes ?? null,
        netRxBytes: input.netRxBytes ?? null,
        netTxBytes: input.netTxBytes ?? null,
        netRxDeltaBytes: input.netRxDeltaBytes ?? null,
        netTxDeltaBytes: input.netTxDeltaBytes ?? null,
        sampleIntervalSec: input.sampleIntervalSec ?? null,
      } as any)
      .returning();
    return row as any;
  }

  async getSeries(params: { since: Date; bucketSec: number }) {
    const since = params.since;
    const bucketSec = Math.max(60, Number(params.bucketSec || 300));

    // Bucket by N seconds using epoch arithmetic.
    // This avoids complex minute-floor logic and works for 5m / 1h, etc.
    // Inline the bucket size as raw SQL to avoid placeholder typing issues
    // (observed as 400 errors for 24h/7d aggregation in some environments).
    const bucketSecRaw = sql.raw(String(bucketSec));
    const bucketExpr = sql`to_timestamp(floor(extract(epoch from ${systemMetricsSamples.createdAt}) / ${bucketSecRaw}) * ${bucketSecRaw})`;

    const rows = await db
      .select({
        bucket: bucketExpr,
        cpuUsagePct: sql<number | null>`avg(${systemMetricsSamples.cpuUsagePct})`,
        memUsedBytes: sql<number | null>`avg(${systemMetricsSamples.memUsedBytes})`,
        memTotalBytes: sql<number | null>`avg(${systemMetricsSamples.memTotalBytes})`,
        diskUsedBytes: sql<number | null>`avg(${systemMetricsSamples.diskUsedBytes})`,
        diskTotalBytes: sql<number | null>`avg(${systemMetricsSamples.diskTotalBytes})`,
        netRxDeltaBytes: sql<number | null>`sum(${systemMetricsSamples.netRxDeltaBytes})`,
        netTxDeltaBytes: sql<number | null>`sum(${systemMetricsSamples.netTxDeltaBytes})`,
      })
      .from(systemMetricsSamples)
      .where(gte(systemMetricsSamples.createdAt, since) as any)
      .groupBy(bucketExpr)
      .orderBy(bucketExpr);

    return rows.map((r: any) => ({
      ts: r.bucket,
      cpuUsagePct: r.cpuUsagePct == null ? null : Number(r.cpuUsagePct),
      memUsedBytes: r.memUsedBytes == null ? null : Number(r.memUsedBytes),
      memTotalBytes: r.memTotalBytes == null ? null : Number(r.memTotalBytes),
      diskUsedBytes: r.diskUsedBytes == null ? null : Number(r.diskUsedBytes),
      diskTotalBytes: r.diskTotalBytes == null ? null : Number(r.diskTotalBytes),
      netRxDeltaBytes: r.netRxDeltaBytes == null ? null : Number(r.netRxDeltaBytes),
      netTxDeltaBytes: r.netTxDeltaBytes == null ? null : Number(r.netTxDeltaBytes),
    }));
  }
}

export const systemMetricsRepository = new SystemMetricsRepository();
