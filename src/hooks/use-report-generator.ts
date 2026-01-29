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
        { header: "Order #", key: "orderNumber", width: 20 },
        { header: "Date", key: "date", format: "date", width: 18 },
        { header: "Status", key: "status", width: 15 },
        { header: "Total", key: "total", format: "currency", align: "right", width: 17 },
        { header: "Payment Method", key: "paymentMethod", width: 18 },
        { header: "Payment Status", key: "paymentStatus", width: 15 },
    ],
    daily: [
        { header: "Date", key: "date", format: "date", width: 35 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 35 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 30 },
    ],
    topProducts: [
        { header: "Product Name", key: "name", width: 40 },
        { header: "SKU", key: "sku", width: 20 },
        { header: "Units Sold", key: "units", format: "number", align: "center", width: 18 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 22 },
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
    lowStock: [
        { header: "Product Name", key: "name", width: 40 },
        { header: "SKU", key: "sku", width: 22 },
        { header: "Current Stock", key: "stock", format: "number", align: "center", width: 20 },
        { header: "Threshold", key: "threshold", format: "number", align: "center", width: 18 },
    ],
    outOfStock: [
        { header: "Product Name", key: "name", width: 60 },
        { header: "SKU", key: "sku", width: 40 },
    ],
};

const CUSTOMERS_COLUMNS: Record<string, TableColumn[]> = {
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
        { header: "Payment Method", key: "method", width: 40 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 35 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 25 },
    ],
    daily: [
        { header: "Date", key: "date", format: "date", width: 35 },
        { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 35 },
        { header: "Orders", key: "orders", format: "number", align: "center", width: 30 },
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
                // Step 1: Fetch data from API
                setProgress(20);
                const response = await fetch("/api/v1/reports/generate", {
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

                const { data, reportType } = result;
                const parsedDateRange = {
                    from: new Date(result.dateRange.from),
                    to: new Date(result.dateRange.to),
                };

                // Step 2: Prepare metadata
                const metadata: ReportMetadata = {
                    title: config.name,
                    subtitle: config.description,
                    dateRange: parsedDateRange,
                    generatedAt: new Date(),
                    reportType,
                };

                // Step 3: Prepare summary and table data based on report type
                let summary: SummaryItem[] = [];
                let tables: Array<{
                    title: string;
                    columns: TableColumn[];
                    data: Record<string, any>[];
                }> = [];

                switch (reportType) {
                    case "sales":
                        summary = [
                            { label: "Total Revenue", value: data.summary.totalRevenue, format: "currency" },
                            { label: "Total Orders", value: data.summary.totalOrders, format: "number" },
                            { label: "Avg Order Value", value: data.summary.averageOrderValue, format: "currency" },
                        ];
                        tables = [
                            { title: "Daily Summary", columns: SALES_COLUMNS.daily, data: data.dailyData },
                            { title: "Top Products", columns: SALES_COLUMNS.topProducts, data: data.topProducts },
                            { title: "Order Details", columns: SALES_COLUMNS.orders, data: data.orders },
                        ];
                        break;

                    case "products":
                        summary = [
                            { label: "Total Products", value: data.summary.totalProducts, format: "number" },
                            { label: "Active Products", value: data.summary.activeProducts, format: "number" },
                            { label: "Low Stock Items", value: data.summary.lowStockCount, format: "number" },
                            { label: "Out of Stock", value: data.summary.outOfStockCount, format: "number" },
                        ];
                        tables = [
                            { title: "Product Catalog", columns: PRODUCTS_COLUMNS.all, data: data.products },
                            { title: "Low Stock Alerts", columns: PRODUCTS_COLUMNS.lowStock, data: data.lowStock },
                            { title: "Out of Stock Items", columns: PRODUCTS_COLUMNS.outOfStock, data: data.outOfStock },
                        ];
                        break;

                    case "customers":
                        summary = [
                            { label: "Total Customers", value: data.summary.totalCustomers, format: "number" },
                            { label: "New Customers", value: data.summary.newCustomers, format: "number" },
                        ];
                        tables = [
                            { title: "Top Customers by Value", columns: CUSTOMERS_COLUMNS.top, data: data.topCustomers },
                            { title: "New Customers", columns: CUSTOMERS_COLUMNS.new, data: data.newCustomers },
                        ];
                        break;

                    case "financial":
                        summary = [
                            { label: "Total Revenue", value: data.summary.totalRevenue, format: "currency" },
                            { label: "Total Orders", value: data.summary.totalOrders, format: "number" },
                            { label: "Avg Order Value", value: data.summary.avgOrderValue, format: "currency" },
                            { label: "Total Discounts", value: data.summary.totalDiscounts, format: "currency" },
                        ];
                        tables = [
                            { title: "Revenue by Payment Method", columns: FINANCIAL_COLUMNS.byMethod, data: data.revenueByMethod },
                            { title: "Daily Revenue", columns: FINANCIAL_COLUMNS.daily, data: data.dailyRevenue },
                        ];
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
