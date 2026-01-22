import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { systemMetricsService } from "../services/system-metrics.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";

const seriesQuerySchema = z.object({ range: z.enum(["current", "24h", "7d"]).optional() });

export class SystemMetricsController {
  static async current(request: NextRequest) {
    try {
      await requirePermission(request, "system.metrics.view");
      systemMetricsService.ensureInternalSchedulerStarted();
      await systemMetricsService.ensureFreshSample({ maxAgeSec: 20 });
      const result = await systemMetricsService.current();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async series(request: NextRequest) {
    try {
      await requirePermission(request, "system.metrics.view");
      systemMetricsService.ensureInternalSchedulerStarted();
      await systemMetricsService.ensureFreshSample({ maxAgeSec: 20 });
      const query = seriesQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams.entries()));
      const range = (query.range as any) || "current";

      const current = await systemMetricsService.current();
      if (!current.success) return NextResponse.json({ success: false, error: current.error }, { status: 400 });

      const series = await systemMetricsService.series({ range });
      if (!series.success) return NextResponse.json({ success: false, error: series.error }, { status: 400 });

      return successResponse({
        range,
        current: current.data,
        series: series.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async collect(request: NextRequest) {
    try {
      await requirePermission(request, "system.metrics.manage");
      systemMetricsService.ensureInternalSchedulerStarted();
      const result = await systemMetricsService.collectAndStore();
      if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      return successResponse(result.data, 201);
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
