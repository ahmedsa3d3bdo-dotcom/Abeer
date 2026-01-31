import { financialReportsRepository } from "../repositories/financial-reports.repository";
import { success, failure, type ServiceResult } from "../types";

class FinancialReportsService {
  async generateProfitLoss(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const summary = await financialReportsRepository.getRevenueSummary(from, to);
      const profit = await financialReportsRepository.getTotalProfit(from, to);
      const discounts = await financialReportsRepository.getDiscountSummary(from, to);
      const byMethod = await financialReportsRepository.getRevenueByPaymentMethod(from, to);

      const totalRevenue = Number(summary?.totalRevenue || 0);
      const totalProfit = Number(profit?.totalProfit || 0);

      return success({
        summary: {
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          totalOrders: Number(summary?.totalOrders || 0),
          avgOrderValue: Number(summary?.avgOrderValue || 0),
          totalDiscounts: Number(discounts?.totalDiscounts || 0),
          discountedOrders: Number(discounts?.discountedOrders || 0),
          discountRate: Number(summary?.totalOrders || 0) > 0 
            ? (Number(discounts?.discountedOrders || 0) / Number(summary?.totalOrders || 0)) * 100 
            : 0,
        },
        revenueByMethod: byMethod.map((r) => ({
          method: r.method,
          revenue: Number(r.revenue),
          orders: Number(r.count),
        })),
        reportTitle: "Profit & Loss Statement",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate P&L");
    }
  }

  async generateTaxReport(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const taxData = await financialReportsRepository.getTaxData(from, to);
      const totalTaxable = taxData.reduce((sum, d) => sum + Number(d.taxableSales), 0);
      const totalTax = taxData.reduce((sum, d) => sum + Number(d.taxCollected), 0);

      return success({
        summary: {
          totalTaxableSales: totalTaxable,
          totalTaxCollected: totalTax,
          avgTaxRate: totalTaxable > 0 ? (totalTax / totalTaxable) * 100 : 0,
        },
        taxData: taxData.map((d) => ({
          jurisdiction: "Default",
          taxableSales: Number(d.taxableSales),
          taxRate: Number(d.taxableSales) > 0 ? (Number(d.taxCollected) / Number(d.taxableSales)) * 100 : 0,
          taxCollected: Number(d.taxCollected),
        })),
        reportTitle: "Tax Summary Report",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate tax report");
    }
  }

  async generateDiscountAnalysis(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const discounts = await financialReportsRepository.getDiscountData(from, to);
      const totalDiscount = discounts.reduce((sum, d) => sum + Number(d.totalDiscount), 0);
      const totalRevenue = discounts.reduce((sum, d) => sum + Number(d.revenue), 0);

      return success({
        summary: {
          totalDiscounts: totalDiscount,
          revenueImpact: totalRevenue,
          avgDiscountPercent: totalRevenue > 0 ? (totalDiscount / (totalRevenue + totalDiscount)) * 100 : 0,
        },
        discounts: discounts.map((d) => ({
          discount: d.hasDiscount,
          uses: Number(d.uses),
          revenueImpact: Number(d.revenue),
          avgDiscount: Number(d.avgDiscount),
          roi: 0,
        })),
        reportTitle: "Discount Analysis Report",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate discount analysis");
    }
  }

  async generatePaymentReconciliation(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const byMethod = await financialReportsRepository.getRevenueByPaymentMethod(from, to);

      return success({
        summary: {
          totalTransactions: byMethod.reduce((sum, m) => sum + Number(m.count), 0),
          totalAmount: byMethod.reduce((sum, m) => sum + Number(m.revenue), 0),
        },
        payments: byMethod.map((m) => ({
          paymentMethod: m.method,
          transactions: Number(m.count),
          amount: Number(m.revenue),
          fees: Number(m.revenue) * 0.029,
          net: Number(m.revenue) * 0.971,
        })),
        reportTitle: "Payment Reconciliation Report",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate payment reconciliation");
    }
  }

  async generateRefundReport(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const refunds = await financialReportsRepository.getRefunds(from, to);
      const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);

      return success({
        summary: {
          totalRefunds: refunds.length,
          totalAmount: totalRefunds,
          avgRefund: refunds.length > 0 ? totalRefunds / refunds.length : 0,
        },
        refunds: refunds.map((r) => ({
          date: r.createdAt?.toISOString().split("T")[0] || "",
          orderNumber: r.orderNumber,
          reason: r.reason || "N/A",
          amount: Number(r.amount || 0),
          status: r.status,
        })),
        reportTitle: "Refund & Returns Report",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate refund report");
    }
  }

  async generateShippingCosts(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const shipping = await financialReportsRepository.getShippingData(from, to);
      const totalCost = shipping.reduce((sum, s) => sum + Number(s.totalCost), 0);

      return success({
        summary: {
          totalShipments: shipping.reduce((sum, s) => sum + Number(s.shipments), 0),
          totalCost,
          avgCost: shipping.length > 0 ? totalCost / shipping.reduce((sum, s) => sum + Number(s.shipments), 0) : 0,
        },
        shipping: shipping.map((s) => ({
          carrier: s.carrier,
          shipments: Number(s.shipments),
          totalCost: Number(s.totalCost),
          avgCost: Number(s.avgCost),
          onTimePercent: 95,
        })),
        reportTitle: "Shipping Costs Report",
        reportType: "financial",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate shipping costs");
    }
  }
}

export const financialReportsService = new FinancialReportsService();
