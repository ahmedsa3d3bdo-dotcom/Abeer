import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { salesReportsService } from "../services/sales-reports.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody } from "../utils/validation";

/**
 * Sales Reports Controller
 * HTTP request handling layer for sales reports
 * Validates input, checks permissions, delegates to service
 */

const generateReportSchema = z.object({
  format: z.enum(["pdf", "xlsx", "csv"]),
  dateRange: z.object({
    from: z.string(),
    to: z.string(),
  }).optional(),
});

function parseDateRange(dateRange?: { from: string; to: string }) {
  if (!dateRange) {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to: now };
  }
  return {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
  };
}

export class SalesReportsController {
  /**
   * Generate Daily Sales Summary Report
   */
  static async dailySummary(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateDailySummary(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "daily-summary",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,  // Spread the service data instead of nesting it
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  /**
   * Generate Weekly Revenue Report
   */
  static async weeklyReport(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateWeeklyReport(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "weekly-report",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  /**
   * Generate Monthly Sales Report
   */
  static async monthlyReport(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateMonthlyReport(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "monthly-report",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  /**
   * Generate Order Details Export
   */
  static async orderDetails(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateOrderDetails(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "order-details",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  /**
   * Generate Revenue by Product Report
   */
  static async revenueByProduct(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateRevenueByProduct(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "revenue-by-product",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  /**
   * Generate Revenue by Category Report
   */
  static async revenueByCategory(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await salesReportsService.generateRevenueByCategory(from, to);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        );
      }

      return successResponse({
        reportType: "sales",
        reportId: "revenue-by-category",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}
