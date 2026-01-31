/**
 * Report Types and Interfaces
 * Shared types for report generation across all report categories
 */

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportSummary {
  [key: string]: number | string;
}

export interface ReportData {
  summary: ReportSummary;
  [key: string]: any;
}

export type ReportFormat = "pdf" | "xlsx" | "csv";

export interface GenerateReportParams {
  dateRange?: DateRange;
  format: ReportFormat;
}

// Sales Report Types
export interface SalesSummary {
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface DailySalesData {
  date: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface WeeklySalesData {
  week: string;
  weekStart: string;
  revenue: number;
  orders: number;
  profit: number;
}

export interface MonthlySalesData {
  month: string;
  monthStart: string;
  revenue: number;
  orders: number;
  profit: number;
  newCustomers: number;
}

export interface OrderDetail {
  orderNumber: string;
  date: string;
  customer: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface ProductRevenue {
  name: string;
  sku: string;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface CategoryRevenue {
  name: string;
  products: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
  sharePercent: number;
}
