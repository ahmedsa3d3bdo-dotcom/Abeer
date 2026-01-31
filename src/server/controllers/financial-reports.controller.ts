import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { financialReportsService } from "../services/financial-reports.service";
import { handleRouteError, successResponse } from "../utils/response";
import { requirePermission } from "../utils/rbac";
import { validateBody } from "../utils/validation";

const generateReportSchema = z.object({
  format: z.enum(["pdf", "xlsx", "csv"]),
  dateRange: z.object({ from: z.string(), to: z.string() }).optional(),
});

function parseDateRange(dateRange?: { from: string; to: string }) {
  if (!dateRange) {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from, to: now };
  }
  return { from: new Date(dateRange.from), to: new Date(dateRange.to) };
}

export class FinancialReportsController {
  static async profitLoss(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generateProfitLoss(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "profit-loss",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async taxReport(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generateTaxReport(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "tax-report",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async discountAnalysis(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generateDiscountAnalysis(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "discount-analysis",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async paymentReconciliation(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generatePaymentReconciliation(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "payment-reconciliation",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async refundReport(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generateRefundReport(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "refund-report",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async shippingCosts(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await financialReportsService.generateShippingCosts(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      
      return successResponse({
        reportType: "financial",
        reportId: "shipping-costs",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}

