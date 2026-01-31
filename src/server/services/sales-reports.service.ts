import { salesReportsRepository } from "../repositories/sales-reports.repository";
import { success, failure, type ServiceResult } from "../types";

/**
 * Sales Reports Service
 * Business logic layer for sales report generation
 * Transforms repository data into report-ready format
 */
class SalesReportsService {
  /**
   * Generate Daily Sales Summary Report
   * Includes daily breakdown, top products, and order list
   */
  async generateDailySummary(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      // Fetch all required data with individual error handling
      const summary = await salesReportsRepository.getSalesSummary(from, to).catch(e => {
        console.error("[Daily Summary] getSalesSummary failed:", e);
        return { totalRevenue: 0, totalOrders: 0, averageOrderValue: 0 };
      });
      
      const profit = await salesReportsRepository.getTotalProfit(from, to).catch(e => {
        console.error("[Daily Summary] getTotalProfit failed:", e);
        return { totalProfit: 0 };
      });
      
      const dailyData = await salesReportsRepository.getDailySalesData(from, to).catch(e => {
        console.error("[Daily Summary] getDailySalesData failed:", e);
        return [];
      });
      
      const dailyProfit = await salesReportsRepository.getDailyProfit(from, to).catch(e => {
        console.error("[Daily Summary] getDailyProfit failed:", e);
        return [];
      });
      
      const topProducts = await salesReportsRepository.getTopProducts(from, to, 20).catch(e => {
        console.error("[Daily Summary] getTopProducts failed:", e);
        return [];
      });
      
      const orders = await salesReportsRepository.getOrdersList(from, to, 500).catch(e => {
        console.error("[Daily Summary] getOrdersList failed:", e);
        return [];
      });

      // Calculate metrics
      const totalRevenue = Number(summary?.totalRevenue || 0);
      const totalProfit = Number(profit?.totalProfit || 0);
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // Map profit by date for easy lookup
      const profitByDate = new Map(
        dailyProfit.map((p) => [p.date, Number(p.profit || 0)])
      );

      return success({
        summary: {
          totalRevenue,
          totalProfit,
          profitMargin,
          totalOrders: Number(summary?.totalOrders || 0),
          averageOrderValue: Number(summary?.averageOrderValue || 0),
        },
        dailyData: dailyData.map((d) => ({
          date: d.date,
          revenue: Number(d.revenue),
          orders: Number(d.orders),
          profit: profitByDate.get(d.date) || 0,
        })),
        topProducts: topProducts.map((p) => {
          const revenue = Number(p.revenue);
          const profit = Number(p.profit);
          return {
            name: p.name || "Unknown",
            sku: p.sku || "",
            units: Number(p.units),
            revenue,
            cost: Number(p.cost),
            profit,
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          };
        }),
        orders: orders.map((o) => ({
          orderNumber: o.orderNumber,
          date: o.createdAt?.toISOString().split("T")[0] || "",
          status: o.status,
          total: Number(o.totalAmount || 0),
          discount: Number(o.discountAmount || 0),
          paymentMethod: o.paymentMethod || "N/A",
          paymentStatus: o.paymentStatus || "N/A",
        })),
        reportTitle: "Daily Sales Summary",
        reportType: "sales",
      });
    } catch (e: any) {
      console.error("[Daily Summary] Fatal error:", e);
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate daily summary");
    }
  }

  /**
   * Generate Weekly Revenue Report
   * Aggregates sales data by week with ISO week numbers
   */
  async generateWeeklyReport(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const weeklyData = await salesReportsRepository.getWeeklySalesData(from, to);
      const weeklyProfit = await salesReportsRepository.getWeeklyProfit(from, to);

      const profitByWeek = new Map(
        weeklyProfit.map((p) => [p.weekStart, Number(p.profit || 0)])
      );

      const totalRevenue = weeklyData.reduce((sum, w) => sum + Number(w.revenue), 0);
      const totalOrders = weeklyData.reduce((sum, w) => sum + Number(w.orders), 0);
      const totalProfit: number = Array.from(profitByWeek.values()).reduce<number>((sum, p) => sum + (p as number), 0);

      return success({
        summary: {
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        weeklyData: weeklyData.map((w) => ({
          week: w.week,
          weekStart: w.weekStart,
          revenue: Number(w.revenue),
          orders: Number(w.orders),
          profit: profitByWeek.get(w.weekStart) || 0,
        })),
        reportTitle: "Weekly Revenue Report",
        reportType: "sales",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate weekly report");
    }
  }

  /**
   * Generate Monthly Sales Report
   * Aggregates sales data by month with new customer counts
   */
  async generateMonthlyReport(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const monthlyData = await salesReportsRepository.getMonthlySalesData(from, to);
      const monthlyProfit = await salesReportsRepository.getMonthlyProfit(from, to);
      const newCustomers = await salesReportsRepository.getNewCustomersByMonth(from, to);

      const profitByMonth = new Map(
        monthlyProfit.map((p) => [p.monthStart, Number(p.profit || 0)])
      );
      const customersByMonth = new Map(
        newCustomers.map((c) => [c.monthStart, Number(c.newCustomers || 0)])
      );

      const totalRevenue = monthlyData.reduce((sum, m) => sum + Number(m.revenue), 0);
      const totalOrders = monthlyData.reduce((sum, m) => sum + Number(m.orders), 0);
      const totalProfit: number = Array.from(profitByMonth.values()).reduce<number>((sum, p) => sum + (p as number), 0);

      return success({
        summary: {
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        },
        monthlyData: monthlyData.map((m) => ({
          month: m.month,
          monthStart: m.monthStart,
          revenue: Number(m.revenue),
          orders: Number(m.orders),
          profit: profitByMonth.get(m.monthStart) || 0,
          newCustomers: customersByMonth.get(m.monthStart) || 0,
        })),
        reportTitle: "Monthly Sales Report",
        reportType: "sales",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate monthly report");
    }
  }

  /**
   * Generate Order Details Export
   * Complete list of orders with full breakdown
   */
  async generateOrderDetails(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const orders = await salesReportsRepository.getOrdersList(from, to, 1000);

      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
      const totalDiscounts = orders.reduce((sum, o) => sum + Number(o.discountAmount || 0), 0);

      return success({
        summary: {
          totalOrders: orders.length,
          totalRevenue,
          totalDiscounts,
          avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        },
        orders: orders.map((o) => ({
          orderNumber: o.orderNumber,
          date: o.createdAt?.toISOString().split("T")[0] || "",
          customer: o.customerEmail || "Guest",
          status: o.status,
          paymentStatus: o.paymentStatus,
          paymentMethod: o.paymentMethod || "N/A",
          subtotal: Number(o.subtotal || 0),
          discount: Number(o.discountAmount || 0),
          tax: Number(o.taxAmount || 0),
          shipping: Number(o.shippingAmount || 0),
          total: Number(o.totalAmount || 0),
        })),
        reportTitle: "Order Details Export",
        reportType: "sales",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate order details");
    }
  }

  /**
   * Generate Revenue by Product Report
   * Product-level profit analysis
   */
  async generateRevenueByProduct(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const products = await salesReportsRepository.getTopProducts(from, to, 500);

      const totalRevenue = products.reduce((sum, p) => sum + Number(p.revenue), 0);
      const totalProfit = products.reduce((sum, p) => sum + Number(p.profit), 0);
      const totalUnits = products.reduce((sum, p) => sum + Number(p.units), 0);

      return success({
        summary: {
          totalProducts: products.length,
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          totalUnits,
        },
        products: products.map((p) => {
          const revenue = Number(p.revenue);
          const profit = Number(p.profit);
          return {
            name: p.name || "Unknown",
            sku: p.sku || "",
            units: Number(p.units),
            revenue,
            cost: Number(p.cost),
            profit,
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          };
        }),
        reportTitle: "Revenue by Product",
        reportType: "sales",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate revenue by product");
    }
  }

  /**
   * Generate Revenue by Category Report
   * Category-level performance with market share
   */
  async generateRevenueByCategory(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const categories = await salesReportsRepository.getRevenueByCategory(from, to);

      const totalRevenue = categories.reduce((sum, c) => sum + Number(c.revenue), 0);
      const totalProfit = categories.reduce((sum, c) => sum + Number(c.profit), 0);
      const totalUnits = categories.reduce((sum, c) => sum + Number(c.units), 0);

      return success({
        summary: {
          totalCategories: categories.length,
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          totalUnits,
        },
        categories: categories.map((c) => {
          const revenue = Number(c.revenue);
          const profit = Number(c.profit);
          return {
            name: c.name || "Uncategorized",
            products: Number(c.products),
            units: Number(c.units),
            revenue,
            cost: Number(c.cost),
            profit,
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
            sharePercent: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
          };
        }),
        reportTitle: "Revenue by Category",
        reportType: "sales",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate revenue by category");
    }
  }
}

export const salesReportsService = new SalesReportsService();
