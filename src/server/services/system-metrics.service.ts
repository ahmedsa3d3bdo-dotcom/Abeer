import { systemMetricsRepository } from "../repositories/system-metrics.repository";
import { failure, success, type ServiceResult } from "../types";

type MetricsRange = "current" | "24h" | "7d";

function parseRange(v: string | null | undefined): MetricsRange {
  const x = String(v || "").trim();
  if (x === "24h" || x === "7d" || x === "current") return x;
  return "current";
}

class SystemMetricsService {
  ensureInternalSchedulerStarted() {
    const enabled =
      process.env.SYSTEM_METRICS_INTERNAL_SCHEDULER !== "false" &&
      process.env.SYSTEM_METRICS_INTERNAL_SCHEDULER !== "0";

    if (!enabled) return;

    const g = globalThis as any;
    if (g.__systemMetricsInternalSchedulerStarted) return;
    g.__systemMetricsInternalSchedulerStarted = true;

    const intervalSec = Math.max(10, Number(process.env.SYSTEM_METRICS_SAMPLE_INTERVAL_SEC || 60));
    const intervalMs = intervalSec * 1000;

    g.__systemMetricsInternalSchedulerInterval = setInterval(() => {
      this.collectAndStore({ intervalSec }).catch(() => {});
    }, intervalMs);

    // Try to collect once on startup (non-blocking)
    this.collectAndStore({ intervalSec }).catch(() => {});
  }

  async ensureFreshSample(opts?: { maxAgeSec?: number; intervalSec?: number }) {
    try {
      const intervalSec = Math.max(1, Number(opts?.intervalSec ?? process.env.SYSTEM_METRICS_SAMPLE_INTERVAL_SEC ?? 60));
      const maxAgeSec = Math.max(5, Number(opts?.maxAgeSec ?? Math.min(30, intervalSec)));

      const last = await systemMetricsRepository.getLatestSample();
      const lastAt = (last as any)?.createdAt ? new Date((last as any).createdAt).getTime() : 0;
      const ageSec = lastAt ? (Date.now() - lastAt) / 1000 : Number.POSITIVE_INFINITY;

      const missingCore =
        !last ||
        (last as any)?.cpuUsagePct == null ||
        (last as any)?.netRxBytes == null ||
        (last as any)?.netTxBytes == null;

      if (missingCore || ageSec > maxAgeSec) {
        await this.collectAndStore({ intervalSec });
      }
    } catch {
      // ignore
    }
  }

  async collectAndStore(opts?: { intervalSec?: number }): Promise<ServiceResult<any>> {
    try {
      const intervalSec = Math.max(1, Number(opts?.intervalSec ?? process.env.SYSTEM_METRICS_SAMPLE_INTERVAL_SEC ?? 60));
      const snapshot = await systemMetricsRepository.collectSnapshot();
      const last = await systemMetricsRepository.getLatestSample();

      const lastAtMs = (last as any)?.createdAt ? new Date((last as any).createdAt).getTime() : 0;
      const elapsedSec = lastAtMs ? Math.max(1, Math.round((Date.now() - lastAtMs) / 1000)) : intervalSec;

      const netRxDeltaBytes =
        snapshot.netRxBytes != null && (last as any)?.netRxBytes != null
          ? Math.max(0, Number(snapshot.netRxBytes) - Number((last as any).netRxBytes))
          : snapshot.netRxBytes != null
            ? 0
            : null;
      const netTxDeltaBytes =
        snapshot.netTxBytes != null && (last as any)?.netTxBytes != null
          ? Math.max(0, Number(snapshot.netTxBytes) - Number((last as any).netTxBytes))
          : snapshot.netTxBytes != null
            ? 0
            : null;

      const row = await systemMetricsRepository.insertSample({
        ...snapshot,
        netRxDeltaBytes,
        netTxDeltaBytes,
        sampleIntervalSec: elapsedSec,
      });

      return success(row);
    } catch (e: any) {
      return failure("COLLECT_SYSTEM_METRICS_FAILED", e?.message || "Failed to collect system metrics");
    }
  }

  async current(): Promise<ServiceResult<any>> {
    try {
      const row = await systemMetricsRepository.getLatestSample();
      return success(row);
    } catch (e: any) {
      return failure("GET_SYSTEM_METRICS_CURRENT_FAILED", e?.message || "Failed to get system metrics");
    }
  }

  async series(input?: { range?: MetricsRange }): Promise<ServiceResult<{ range: MetricsRange; bucketSec: number; since: string; items: any[] }>> {
    try {
      const range = parseRange(input?.range || "current");

      if (range === "current") {
        return success({ range, bucketSec: 0, since: new Date().toISOString(), items: [] });
      }

      const hours = range === "7d" ? 24 * 7 : 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const bucketSec = range === "7d" ? 3600 : 300;

      const items = await systemMetricsRepository.getSeries({ since, bucketSec });
      return success({ range, bucketSec, since: since.toISOString(), items });
    } catch (e: any) {
      return failure("GET_SYSTEM_METRICS_SERIES_FAILED", e?.message || "Failed to get system metrics series");
    }
  }
}

export const systemMetricsService = new SystemMetricsService();
