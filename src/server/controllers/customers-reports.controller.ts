import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { customersReportsService } from "../services/customers-reports.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody } from "../utils/validation";

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
  return { from: new Date(dateRange.from), to: new Date(dateRange.to) };
}

export class CustomersReportsController {
  static async list(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await customersReportsService.generateList();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "customers",
        reportId: "customer-list",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async ltv(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await customersReportsService.generateLTV(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "customers",
        reportId: "customer-ltv",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async acquisition(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await customersReportsService.generateAcquisition(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "customers",
        reportId: "customer-acquisition",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async segments(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await customersReportsService.generateSegments();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "customers",
        reportId: "customer-segments",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async geographic(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await customersReportsService.generateGeographic();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "customers",
        reportId: "geographic-distribution",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}

