import { productsReportsRepository } from "../repositories/products-reports.repository";
import { success, failure, type ServiceResult } from "../types";

/**
 * Products Reports Service
 * Business logic layer for product report generation
 */
class ProductsReportsService {
  async generateCatalog(): Promise<ServiceResult<any>> {
    try {
      const products = await productsReportsRepository.getAllProducts();
      const lowStock = await productsReportsRepository.getLowStockProducts();
      const outOfStock = await productsReportsRepository.getOutOfStockProducts();
      const summary = await productsReportsRepository.getProductsSummary();

      return success({
        summary: {
          totalProducts: Number(summary?.totalProducts || 0),
          activeProducts: Number(summary?.activeProducts || 0),
          lowStockCount: lowStock.length,
          outOfStockCount: outOfStock.length,
        },
        products: products.map((p) => ({
          name: p.name,
          sku: p.sku || "",
          price: Number(p.price),
          cost: Number(p.costPerItem || 0),
          status: p.status,
          stockStatus: p.stockStatus,
          stock: Number(p.stock || 0),
          sold: Number(p.soldCount || 0),
          views: Number(p.viewCount || 0),
        })),
        lowStock: lowStock.map((p) => ({
          name: p.name,
          sku: p.sku || "",
          stock: Number(p.stock || 0),
          threshold: Number(p.threshold || 5),
        })),
        outOfStock: outOfStock.map((p) => ({
          name: p.name,
          sku: p.sku || "",
        })),
        reportTitle: "Product Catalog Export",
        reportType: "products",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate catalog");
    }
  }

  async generateInventoryLevels(): Promise<ServiceResult<any>> {
    try {
      const inventory = await productsReportsRepository.getInventoryLevels();

      const totalValue = inventory.reduce((sum, item) => 
        sum + (Number(item.availableQuantity || 0) * Number(item.price || 0)), 0
      );
      const totalStock = inventory.reduce((sum, item) => 
        sum + Number(item.availableQuantity || 0), 0
      );

      return success({
        summary: {
          totalProducts: inventory.length,
          totalStock,
          totalValue,
          avgStockPerProduct: inventory.length > 0 ? totalStock / inventory.length : 0,
        },
        inventory: inventory.map((item) => ({
          product: item.productName,
          sku: item.sku || "",
          stock: Number(item.availableQuantity || 0),
          reserved: Number(item.reservedQuantity || 0),
          available: Number(item.availableQuantity || 0),
          value: Number(item.availableQuantity || 0) * Number(item.price || 0),
        })),
        reportTitle: "Inventory Levels Report",
        reportType: "products",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate inventory levels");
    }
  }

  async generateLowStockAlert(): Promise<ServiceResult<any>> {
    try {
      const lowStock = await productsReportsRepository.getLowStockProducts(200);

      return success({
        summary: {
          lowStockCount: lowStock.length,
          criticalCount: lowStock.filter(item => 
            Number(item.stock) <= Number(item.threshold) / 2
          ).length,
        },
        lowStock: lowStock.map((item) => ({
          product: item.name,
          sku: item.sku || "",
          currentStock: Number(item.stock || 0),
          threshold: Number(item.threshold || 5),
          reorderQty: Number(item.threshold || 5) * 2,
        })),
        reportTitle: "Low Stock Alert Report",
        reportType: "products",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate low stock alert");
    }
  }

  async generatePerformance(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const performance = await productsReportsRepository.getProductPerformance(from, to);

      const totalRevenue = performance.reduce((sum, p) => sum + Number(p.revenue), 0);
      const totalProfit = performance.reduce((sum, p) => sum + Number(p.profit), 0);

      return success({
        summary: {
          totalProducts: performance.length,
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        },
        products: performance.map((p) => {
          const revenue = Number(p.revenue);
          const profit = Number(p.profit);
          return {
            product: p.name || "Unknown",
            sku: p.sku || "",
            unitsSold: Number(p.unitsSold),
            revenue,
            profit,
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
            views: Number(p.views || 0),
          };
        }),
        reportTitle: "Product Performance Report",
        reportType: "products",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate performance report");
    }
  }

  async generateCategoryBreakdown(from: Date, to: Date): Promise<ServiceResult<any>> {
    try {
      const categories = await productsReportsRepository.getCategoryBreakdown(from, to);

      const totalRevenue = categories.reduce((sum, c) => sum + Number(c.revenue), 0);
      const totalProfit = categories.reduce((sum, c) => sum + Number(c.profit), 0);

      return success({
        summary: {
          totalCategories: categories.length,
          totalRevenue,
          totalProfit,
          profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        },
        categories: categories.map((c) => {
          const revenue = Number(c.revenue);
          const profit = Number(c.profit);
          return {
            category: c.name || "Uncategorized",
            products: Number(c.products),
            revenue,
            profit,
            units: Number(c.units),
            profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          };
        }),
        reportTitle: "Category Breakdown Report",
        reportType: "products",
      });
    } catch (e: any) {
      return failure("GENERATE_REPORT_FAILED", e?.message || "Failed to generate category breakdown");
    }
  }
}

export const productsReportsService = new ProductsReportsService();
