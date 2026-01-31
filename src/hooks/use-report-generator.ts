"use client";

import { useState, useCallback } from "react";
import {
    generatePDFReport,
    generateExcelReport,
    generateCSVReport,
    downloadFile,
    getReportFilename,
    type ReportMetadata,
    type SummaryItem,
    type TableColumn,
} from "@/lib/reports/report-generator";

export type ReportFormat = "pdf" | "xlsx" | "csv";

export interface ReportConfig {
    id: string;
    name: string;
    type: "sales" | "products" | "customers" | "financial";
    description?: string;
}

interface UseReportGeneratorOptions {
    onSuccess?: (filename: string) => void;
    onError?: (error: Error) => void;
}

// Column configurations for different report types - widths are proportional
const SALES_COLUMNS: Record<string, TableColumn[]> = {
    orders: [
        { header: "Order #", key: "orderNumber", width: 15 },
        { header: "Date", key: "date", format: "date", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Total", key: "total", format: "currency", align: "right", width: 14 },
        { header: "Discount", key: "discount", format: "currency", align: "right", width: 12 },
        { header: "Payment Method", key: "paymentMethod", width: 14 },
        { header: "Payment Status", key: "paymentStatus", width: 12 },
    ],
    daily: [
        { header: "Date", key: "date", format: "date", width: 22 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 22 },
        { header: "Profit", key: "profit", format: "currency", align: "right", width: 22 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 18 },
    ],
    topProducts: [
        { header: "Product Name", key: "name", width: 20 },
        { header: "SKU", key: "sku", width: 12 },
        { header: "Units", key: "units", format: "number", align: "center", width: 10 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 14 },
        { header: "Cost", key: "cost", format: "currency", align: "right", width: 12 },
        { header: "Profit", key: "profit", format: "currency", align: "right", width: 14 },
        { header: "Margin %", key: "profitMargin", format: "percentage", align: "right", width: 10 },
    ],
};

const PRODUCTS_COLUMNS: Record<string, TableColumn[]> = {
    all: [
        { header: "Product Name", key: "name", width: 28 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Price", key: "price", format: "currency", align: "right", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Stock", key: "stock", format: "number", align: "center", width: 10 },
        { header: "Sold", key: "sold", format: "number", align: "center", width: 10 },
        { header: "Views", key: "views", format: "number", align: "center", width: 10 },
    ],
    inventory: [
        { header: "Product", key: "product", width: 30 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Stock", key: "stock", format: "number", align: "center", width: 12 },
        { header: "Reserved", key: "reserved", format: "number", align: "center", width: 12 },
        { header: "Available", key: "available", format: "number", align: "center", width: 12 },
        { header: "Value", key: "value", format: "currency", align: "right", width: 15 },
    ],
    lowStock: [
        { header: "Product Name", key: "product", width: 30 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Current Stock", key: "currentStock", format: "number", align: "center", width: 15 },
        { header: "Threshold", key: "threshold", format: "number", align: "center", width: 15 },
        { header: "Reorder Qty", key: "reorderQty", format: "number", align: "center", width: 15 },
    ],
    performance: [
        { header: "Product", key: "product", width: 25 },
        { header: "SKU", key: "sku", width: 12 },
        { header: "Units Sold", key: "unitsSold", format: "number", align: "center", width: 12 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 15 },
        { header: "Profit", key: "profit", format: "currency", align: "right", width: 15 },
        { header: "Margin %", key: "profitMargin", format: "percentage", align: "right", width: 12 },
        { header: "Views", key: "views", format: "number", align: "center", width: 10 },
    ],
    categories: [
        { header: "Category", key: "category", width: 25 },
        { header: "Products", key: "products", format: "number", align: "center", width: 12 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 18 },
        { header: "Profit", key: "profit", format: "currency", align: "right", width: 18 },
        { header: "Units", key: "units", format: "number", align: "center", width: 12 },
        { header: "Margin %", key: "profitMargin", format: "percentage", align: "right", width: 12 },
    ],
    outOfStock: [
        { header: "Product Name", key: "name", width: 60 },
        { header: "SKU", key: "sku", width: 40 },
    ],
};

const CUSTOMERS_COLUMNS: Record<string, TableColumn[]> = {
    list: [
        { header: "Customer Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Address", key: "address", width: 20 },
        { header: "Join Date", key: "joinDate", format: "date", width: 15 },
        { header: "Status", key: "status", width: 12 },
    ],
    ltv: [
        { header: "Customer", key: "customer", width: 25 },
        { header: "Email", key: "email", width: 28 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 10 },
        { header: "Total Spent", key: "totalSpent", format: "currency", align: "right", width: 15 },
        { header: "Avg Order", key: "avgOrder", format: "currency", align: "right", width: 15 },
        { header: "Last Purchase", key: "lastPurchase", format: "date", width: 15 },
    ],
    acquisition: [
        { header: "Period", key: "period", format: "date", width: 20 },
        { header: "New Customers", key: "newCustomers", format: "number", align: "center", width: 20 },
        { header: "Source", key: "source", width: 20 },
        { header: "Conversion Rate", key: "conversionRate", format: "percentage", align: "right", width: 20 },
    ],
    segments: [
        { header: "Segment", key: "segment", width: 25 },
        { header: "Count", key: "count", format: "number", align: "center", width: 15 },
        { header: "Avg Value", key: "avgValue", format: "currency", align: "right", width: 18 },
        { header: "Revenue %", key: "revenuePercent", format: "percentage", align: "right", width: 15 },
        { header: "Retention", key: "retention", format: "percentage", align: "right", width: 15 },
    ],
    geographic: [
        { header: "Region", key: "region", width: 25 },
        { header: "Customers", key: "customers", format: "number", align: "center", width: 15 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 15 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 20 },
        { header: "Top City", key: "topCity", width: 20 },
    ],
    top: [
        { header: "Customer Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 12 },
        { header: "Total Spent", key: "totalSpent", format: "currency", align: "right", width: 18 },
        { header: "Last Order", key: "lastOrder", format: "date", width: 15 },
    ],
    new: [
        { header: "Customer Name", key: "name", width: 35 },
        { header: "Email", key: "email", width: 42 },
        { header: "Joined Date", key: "joinedAt", format: "date", width: 23 },
    ],
};

const FINANCIAL_COLUMNS: Record<string, TableColumn[]> = {
    byMethod: [
        { header: "Payment Method", key: "method", width: 30 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 25 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 20 },
    ],
    payments: [
        { header: "Payment Method", key: "paymentMethod", width: 25 },
        { header: "Transactions", key: "transactions", format: "number", align: "center", width: 18 },
        { header: "Amount", key: "amount", format: "currency", align: "right", width: 18 },
        { header: "Fees", key: "fees", format: "currency", align: "right", width: 15 },
        { header: "Net", key: "net", format: "currency", align: "right", width: 18 },
    ],
    tax: [
        { header: "Jurisdiction", key: "jurisdiction", width: 25 },
        { header: "Taxable Sales", key: "taxableSales", format: "currency", align: "right", width: 20 },
        { header: "Tax Rate", key: "taxRate", format: "percentage", align: "right", width: 15 },
        { header: "Tax Collected", key: "taxCollected", format: "currency", align: "right", width: 20 },
    ],
    discounts: [
        { header: "Discount", key: "discount", width: 25 },
        { header: "Uses", key: "uses", format: "number", align: "center", width: 12 },
        { header: "Revenue Impact", key: "revenueImpact", format: "currency", align: "right", width: 20 },
        { header: "Avg Discount", key: "avgDiscount", format: "currency", align: "right", width: 18 },
        { header: "ROI", key: "roi", format: "percentage", align: "right", width: 12 },
    ],
    refunds: [
        { header: "Date", key: "date", format: "date", width: 15 },
        { header: "Order #", key: "orderNumber", width: 18 },
        { header: "Reason", key: "reason", width: 25 },
        { header: "Amount", key: "amount", format: "currency", align: "right", width: 15 },
        { header: "Status", key: "status", width: 15 },
    ],
    shipping: [
        { header: "Carrier", key: "carrier", width: 20 },
        { header: "Shipments", key: "shipments", format: "number", align: "center", width: 15 },
        { header: "Total Cost", key: "totalCost", format: "currency", align: "right", width: 18 },
        { header: "Avg Cost", key: "avgCost", format: "currency", align: "right", width: 15 },
        { header: "On-Time %", key: "onTimePercent", format: "percentage", align: "right", width: 15 },
    ],
    daily: [
        { header: "Date", key: "date", format: "date", width: 22 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 22 },
        { header: "Profit", key: "profit", format: "currency", align: "right", width: 22 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 18 },
    ],
};

export function useReportGenerator(options: UseReportGeneratorOptions = {}) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentReport, setCurrentReport] = useState<string | null>(null);

    const generateReport = useCallback(
        async (
            config: ReportConfig,
            format: ReportFormat,
            dateRange?: { from: Date; to: Date }
        ) => {
            setIsGenerating(true);
            setProgress(0);
            setCurrentReport(config.id);

            try {
                // Step 1: Determine API endpoint based on report type
                setProgress(20);
                const endpoint = `/api/v1/reports/${config.type}`;
                
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        reportId: config.id,
                        format,
                        dateRange: dateRange
                            ? {
                                from: dateRange.from.toISOString(),
                                to: dateRange.to.toISOString(),
                            }
                            : undefined,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch report data");
                }

                const result = await response.json();
                setProgress(50);

                if (!result.success) {
                    throw new Error(result.error || "Failed to generate report");
                }

                // successResponse wraps everything in a data property
                const responseData = result.data;
                const { reportType } = responseData;
                
                const parsedDateRange = responseData.dateRange ? {
                    from: new Date(responseData.dateRange.from),
                    to: new Date(responseData.dateRange.to),
                } : dateRange;

                // Step 2: Prepare metadata
                const metadata: ReportMetadata = {
                    title: config.name,
                    subtitle: config.description,
                    dateRange: parsedDateRange,
                    generatedAt: new Date(),
                    reportType,
                };

                // Step 3: Prepare summary and table data based on report type and reportId
                let summary: SummaryItem[] = [];
                let tables: Array<{
                    title: string;
                    columns: TableColumn[];
                    data: Record<string, any>[];
                }> = [];

                switch (reportType) {
                    case "sales":
                        // Handle different sales report types based on reportId
                        if (config.id === "weekly-report") {
                            summary = [
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Avg Order Value", value: responseData.summary?.averageOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { 
                                    title: "Weekly Summary", 
                                    columns: [
                                        { header: "Week", key: "week", width: 20 },
                                        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 25 },
                                        { header: "Profit", key: "profit", format: "currency", align: "right", width: 25 },
                                        { header: "Orders", key: "orders", format: "number", align: "center", width: 15 },
                                    ], 
                                    data: responseData.weeklyData || []
                                },
                            ];
                        } else if (config.id === "monthly-report") {
                            summary = [
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Avg Order Value", value: responseData.summary?.averageOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { 
                                    title: "Monthly Summary", 
                                    columns: [
                                        { header: "Month", key: "month", width: 20 },
                                        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 22 },
                                        { header: "Profit", key: "profit", format: "currency", align: "right", width: 22 },
                                        { header: "Orders", key: "orders", format: "number", align: "center", width: 15 },
                                        { header: "New Customers", key: "newCustomers", format: "number", align: "center", width: 18 },
                                    ], 
                                    data: responseData.monthlyData || []
                                },
                            ];
                        } else if (config.id === "order-details") {
                            summary = [
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Discounts", value: responseData.summary?.totalDiscounts || 0, format: "currency" },
                                { label: "Avg Order Value", value: responseData.summary?.avgOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { 
                                    title: "Order Details", 
                                    columns: [
                                        { header: "Order #", key: "orderNumber", width: 15 },
                                        { header: "Date", key: "date", format: "date", width: 12 },
                                        { header: "Customer", key: "customer", width: 20 },
                                        { header: "Status", key: "status", width: 12 },
                                        { header: "Payment", key: "paymentStatus", width: 12 },
                                        { header: "Method", key: "paymentMethod", width: 12 },
                                        { header: "Subtotal", key: "subtotal", format: "currency", align: "right", width: 12 },
                                        { header: "Discount", key: "discount", format: "currency", align: "right", width: 12 },
                                        { header: "Tax", key: "tax", format: "currency", align: "right", width: 10 },
                                        { header: "Shipping", key: "shipping", format: "currency", align: "right", width: 12 },
                                        { header: "Total", key: "total", format: "currency", align: "right", width: 12 },
                                    ],
                                    data: responseData.orders || []
                                },
                            ];
                        } else if (config.id === "revenue-by-product") {
                            summary = [
                                { label: "Total Products", value: responseData.summary?.totalProducts || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Units", value: responseData.summary?.totalUnits || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Revenue by Product", columns: SALES_COLUMNS.topProducts, data: responseData.products || [] },
                            ];
                        } else if (config.id === "revenue-by-category") {
                            summary = [
                                { label: "Total Categories", value: responseData.summary?.totalCategories || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Units", value: responseData.summary?.totalUnits || 0, format: "number" },
                            ];
                            tables = [
                                { 
                                    title: "Revenue by Category", 
                                    columns: [
                                        { header: "Category", key: "name", width: 25 },
                                        { header: "Products", key: "products", format: "number", align: "center", width: 12 },
                                        { header: "Units", key: "units", format: "number", align: "right", width: 12 },
                                        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 18 },
                                        { header: "Profit", key: "profit", format: "currency", align: "right", width: 18 },
                                        { header: "Margin %", key: "profitMargin", format: "percentage", align: "right", width: 12 },
                                        { header: "Share %", key: "sharePercent", format: "percentage", align: "right", width: 12 },
                                    ], 
                                    data: responseData.categories || []
                                },
                            ];
                        } else {
                            // Default daily summary
                            summary = [
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Avg Order Value", value: responseData.summary?.averageOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Daily Summary", columns: SALES_COLUMNS.daily, data: responseData.dailyData || [] },
                                { title: "Top Products", columns: SALES_COLUMNS.topProducts, data: responseData.topProducts || [] },
                                { title: "Order Details", columns: SALES_COLUMNS.orders, data: responseData.orders || [] },
                            ];
                        }
                        break;

                    case "products":
                        // Handle different product report types based on reportId
                        if (config.id === "product-catalog") {
                            summary = [
                                { label: "Total Products", value: responseData.summary?.totalProducts || 0, format: "number" },
                                { label: "Active Products", value: responseData.summary?.activeProducts || 0, format: "number" },
                                { label: "Low Stock Items", value: responseData.summary?.lowStockCount || 0, format: "number" },
                                { label: "Out of Stock", value: responseData.summary?.outOfStockCount || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Product Catalog", columns: PRODUCTS_COLUMNS.all, data: responseData.products || [] },
                                { title: "Low Stock Alerts", columns: PRODUCTS_COLUMNS.lowStock, data: responseData.lowStock || [] },
                                { title: "Out of Stock Items", columns: PRODUCTS_COLUMNS.outOfStock, data: responseData.outOfStock || [] },
                            ];
                        } else if (config.id === "inventory-levels") {
                            summary = [
                                { label: "Total Products", value: responseData.summary?.totalProducts || 0, format: "number" },
                                { label: "Total Stock", value: responseData.summary?.totalStock || 0, format: "number" },
                                { label: "Total Value", value: responseData.summary?.totalValue || 0, format: "currency" },
                                { label: "Avg Stock/Product", value: responseData.summary?.avgStockPerProduct || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Inventory Levels", columns: PRODUCTS_COLUMNS.inventory, data: responseData.inventory || [] },
                            ];
                        } else if (config.id === "low-stock-alert") {
                            summary = [
                                { label: "Low Stock Count", value: responseData.summary?.lowStockCount || 0, format: "number" },
                                { label: "Critical Count", value: responseData.summary?.criticalCount || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Low Stock Alerts", columns: PRODUCTS_COLUMNS.lowStock, data: responseData.lowStock || [] },
                            ];
                        } else if (config.id === "product-performance") {
                            summary = [
                                { label: "Total Products", value: responseData.summary?.totalProducts || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                            ];
                            tables = [
                                { title: "Product Performance", columns: PRODUCTS_COLUMNS.performance, data: responseData.products || [] },
                            ];
                        } else if (config.id === "category-breakdown") {
                            summary = [
                                { label: "Total Categories", value: responseData.summary?.totalCategories || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                            ];
                            tables = [
                                { title: "Category Breakdown", columns: PRODUCTS_COLUMNS.categories, data: responseData.categories || [] },
                            ];
                        } else {
                            // Default product catalog
                            summary = [
                                { label: "Total Products", value: responseData.summary?.totalProducts || 0, format: "number" },
                                { label: "Active Products", value: responseData.summary?.activeProducts || 0, format: "number" },
                                { label: "Low Stock Items", value: responseData.summary?.lowStockCount || 0, format: "number" },
                                { label: "Out of Stock", value: responseData.summary?.outOfStockCount || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Product Catalog", columns: PRODUCTS_COLUMNS.all, data: responseData.products || [] },
                                { title: "Low Stock Alerts", columns: PRODUCTS_COLUMNS.lowStock, data: responseData.lowStock || [] },
                                { title: "Out of Stock Items", columns: PRODUCTS_COLUMNS.outOfStock, data: responseData.outOfStock || [] },
                            ];
                        }
                        break;

                    case "customers":
                        // Handle different customer report types based on reportId
                        if (config.id === "customer-list") {
                            summary = [
                                { label: "Total Customers", value: responseData.summary?.totalCustomers || 0, format: "number" },
                                { label: "Verified Customers", value: responseData.summary?.verifiedCustomers || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Customer List", columns: CUSTOMERS_COLUMNS.list, data: responseData.customers || [] },
                            ];
                        } else if (config.id === "customer-ltv") {
                            summary = [
                                { label: "Total Customers", value: responseData.summary?.totalCustomers || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Avg LTV", value: responseData.summary?.avgLTV || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Customer Lifetime Value", columns: CUSTOMERS_COLUMNS.ltv, data: responseData.customers || [] },
                            ];
                        } else if (config.id === "customer-acquisition") {
                            summary = [
                                { label: "Total New Customers", value: responseData.summary?.totalNewCustomers || 0, format: "number" },
                                { label: "Avg Per Day", value: responseData.summary?.avgPerDay || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Customer Acquisition", columns: CUSTOMERS_COLUMNS.acquisition, data: responseData.acquisitions || [] },
                            ];
                        } else if (config.id === "customer-segments") {
                            summary = [
                                { label: "Total Customers", value: responseData.summary?.totalCustomers || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Customer Segments", columns: CUSTOMERS_COLUMNS.segments, data: responseData.segments || [] },
                            ];
                        } else if (config.id === "geographic-distribution") {
                            summary = [
                                { label: "Total Regions", value: responseData.summary?.totalRegions || 0, format: "number" },
                                { label: "Total Customers", value: responseData.summary?.totalCustomers || 0, format: "number" },
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Geographic Distribution", columns: CUSTOMERS_COLUMNS.geographic, data: responseData.regions || [] },
                            ];
                        } else {
                            // Default top customers
                            summary = [
                                { label: "Total Customers", value: responseData.summary?.totalCustomers || 0, format: "number" },
                                { label: "New Customers", value: responseData.summary?.newCustomers || 0, format: "number" },
                            ];
                            tables = [
                                { title: "Top Customers by Value", columns: CUSTOMERS_COLUMNS.top, data: responseData.topCustomers || [] },
                                { title: "New Customers", columns: CUSTOMERS_COLUMNS.new, data: responseData.newCustomers || [] },
                            ];
                        }
                        break;

                    case "financial":
                        // Handle different financial report types based on reportId
                        if (config.id === "profit-loss") {
                            summary = [
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Discounts", value: responseData.summary?.totalDiscounts || 0, format: "currency" },
                                { label: "Discount Rate", value: responseData.summary?.discountRate || 0, format: "percentage" },
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Avg Order Value", value: responseData.summary?.avgOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Revenue by Payment Method", columns: FINANCIAL_COLUMNS.byMethod, data: responseData.revenueByMethod || [] },
                                { title: "Daily Revenue & Profit", columns: FINANCIAL_COLUMNS.daily, data: responseData.dailyRevenue || [] },
                            ];
                        } else if (config.id === "tax-report") {
                            summary = [
                                { label: "Total Taxable Sales", value: responseData.summary?.totalTaxableSales || 0, format: "currency" },
                                { label: "Total Tax Collected", value: responseData.summary?.totalTaxCollected || 0, format: "currency" },
                                { label: "Avg Tax Rate", value: responseData.summary?.avgTaxRate || 0, format: "percentage" },
                            ];
                            tables = [
                                { title: "Tax Summary", columns: FINANCIAL_COLUMNS.tax, data: responseData.taxData || [] },
                            ];
                        } else if (config.id === "discount-analysis") {
                            summary = [
                                { label: "Total Discounts", value: responseData.summary?.totalDiscounts || 0, format: "currency" },
                                { label: "Revenue Impact", value: responseData.summary?.revenueImpact || 0, format: "currency" },
                                { label: "Avg Discount %", value: responseData.summary?.avgDiscountPercent || 0, format: "percentage" },
                            ];
                            tables = [
                                { title: "Discount Analysis", columns: FINANCIAL_COLUMNS.discounts, data: responseData.discounts || [] },
                            ];
                        } else if (config.id === "payment-reconciliation") {
                            summary = [
                                { label: "Total Transactions", value: responseData.summary?.totalTransactions || 0, format: "number" },
                                { label: "Total Amount", value: responseData.summary?.totalAmount || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Payment Reconciliation", columns: FINANCIAL_COLUMNS.payments, data: responseData.payments || [] },
                            ];
                        } else if (config.id === "refund-report") {
                            summary = [
                                { label: "Total Refunds", value: responseData.summary?.totalRefunds || 0, format: "number" },
                                { label: "Total Amount", value: responseData.summary?.totalAmount || 0, format: "currency" },
                                { label: "Avg Refund", value: responseData.summary?.avgRefund || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Refunds & Returns", columns: FINANCIAL_COLUMNS.refunds, data: responseData.refunds || [] },
                            ];
                        } else if (config.id === "shipping-costs") {
                            summary = [
                                { label: "Total Shipments", value: responseData.summary?.totalShipments || 0, format: "number" },
                                { label: "Total Cost", value: responseData.summary?.totalCost || 0, format: "currency" },
                                { label: "Avg Cost", value: responseData.summary?.avgCost || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Shipping Costs", columns: FINANCIAL_COLUMNS.shipping, data: responseData.shipping || [] },
                            ];
                        } else {
                            // Default P&L
                            summary = [
                                { label: "Total Revenue", value: responseData.summary?.totalRevenue || 0, format: "currency" },
                                { label: "Total Profit", value: responseData.summary?.totalProfit || 0, format: "currency" },
                                { label: "Profit Margin", value: responseData.summary?.profitMargin || 0, format: "percentage" },
                                { label: "Total Discounts", value: responseData.summary?.totalDiscounts || 0, format: "currency" },
                                { label: "Discount Rate", value: responseData.summary?.discountRate || 0, format: "percentage" },
                                { label: "Total Orders", value: responseData.summary?.totalOrders || 0, format: "number" },
                                { label: "Avg Order Value", value: responseData.summary?.avgOrderValue || 0, format: "currency" },
                            ];
                            tables = [
                                { title: "Revenue by Payment Method", columns: FINANCIAL_COLUMNS.byMethod, data: responseData.revenueByMethod || [] },
                                { title: "Daily Revenue & Profit", columns: FINANCIAL_COLUMNS.daily, data: responseData.dailyRevenue || [] },
                            ];
                        }
                        break;
                }

                setProgress(70);

                // Step 4: Generate file based on format
                let blob: Blob;
                const filename = getReportFilename(config.name.replace(/\s+/g, "-"), format);

                if (format === "pdf") {
                    blob = await generatePDFReport(metadata, summary, tables);
                } else if (format === "xlsx") {
                    blob = generateExcelReport(
                        metadata,
                        summary,
                        tables.map((t) => ({
                            name: t.title,
                            columns: t.columns,
                            data: t.data,
                        }))
                    );
                } else {
                    // CSV - use the first/main table
                    const mainTable = tables[0] || { columns: [], data: [] };
                    blob = generateCSVReport(mainTable.columns, mainTable.data);
                }

                setProgress(90);

                // Step 5: Download file
                downloadFile(blob, filename);

                setProgress(100);
                options.onSuccess?.(filename);

                // Reset after a short delay
                setTimeout(() => {
                    setIsGenerating(false);
                    setProgress(0);
                    setCurrentReport(null);
                }, 1000);
            } catch (error) {
                console.error("Report generation error:", error);
                options.onError?.(error instanceof Error ? error : new Error("Unknown error"));
                setIsGenerating(false);
                setProgress(0);
                setCurrentReport(null);
            }
        },
        [options]
    );

    return {
        generateReport,
        isGenerating,
        progress,
        currentReport,
    };
}

