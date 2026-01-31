import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { productsReportsService } from "../services/products-reports.service";
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
  return {
    from: new Date(dateRange.from),
    to: new Date(dateRange.to),
  };
}

export class ProductsReportsController {
  static async catalog(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await productsReportsService.generateCatalog();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return successResponse({
        reportType: "products",
        reportId: "product-catalog",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async inventoryLevels(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await productsReportsService.generateInventoryLevels();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return successResponse({
        reportType: "products",
        reportId: "inventory-levels",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async lowStockAlert(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const result = await productsReportsService.generateLowStockAlert();
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return successResponse({
        reportType: "products",
        reportId: "low-stock-alert",
        format: parsed.format,
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async performance(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await productsReportsService.generatePerformance(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return successResponse({
        reportType: "products",
        reportId: "product-performance",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }

  static async categoryBreakdown(request: NextRequest, body?: any) {
    try {
      await requirePermission(request, "reports.view");
      const validatedBody = body || await request.json();
      const parsed = generateReportSchema.parse(validatedBody);
      
      const { from, to } = parseDateRange(parsed.dateRange);
      const result = await productsReportsService.generateCategoryBreakdown(from, to);
      
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }

      return successResponse({
        reportType: "products",
        reportId: "category-breakdown",
        format: parsed.format,
        dateRange: { from: from.toISOString(), to: to.toISOString() },
        ...result.data,
      });
    } catch (e) {
      return handleRouteError(e, request);
    }
  }
}

