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

export type ExportFormat = "pdf" | "xlsx" | "csv";

export interface AdminExportConfig {
    id: string;
    name: string;
    type: "orders" | "products" | "customers" | "discounts" | "users" | "reviews" | "general";
    description: string;
    formats: ExportFormat[];
    fields: string[];
    fetchData: (dateRange?: { from: Date; to: Date }) => Promise<{
        items: Record<string, any>[];
        summary?: SummaryItem[];
    }>;
    columns: TableColumn[];
}

interface UseAdminExportOptions {
    onSuccess?: (filename: string) => void;
    onError?: (error: Error) => void;
}

export function useAdminExport(options: UseAdminExportOptions = {}) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentExport, setCurrentExport] = useState<string | null>(null);

    const exportData = useCallback(
        async (
            config: AdminExportConfig,
            format: ExportFormat,
            dateRange?: { from: Date; to: Date }
        ) => {
            setIsExporting(true);
            setProgress(10);
            setCurrentExport(config.id);

            try {
                // Fetch the data
                setProgress(20);
                const { items, summary = [] } = await config.fetchData(dateRange);

                setProgress(50);

                // Prepare metadata
                const metadata: ReportMetadata = {
                    title: config.name,
                    subtitle: config.description,
                    generatedAt: new Date(),
                    reportType: config.type as any,
                    dateRange,
                };

                const tables = [
                    {
                        title: config.name,
                        columns: config.columns,
                        data: items,
                    },
                ];

                setProgress(70);

                // Generate the report in the selected format
                let blob: Blob;
                const filename = getReportFilename(config.name.replace(/\s+/g, "-"), format);

                if (format === "pdf") {
                    blob = await generatePDFReport(metadata, summary, tables);
                } else if (format === "xlsx") {
                    blob = generateExcelReport(
                        metadata,
                        summary,
                        tables.map((t) => ({
                            name: t.title.slice(0, 31),
                            columns: t.columns,
                            data: t.data,
                        }))
                    );
                } else {
                    blob = generateCSVReport(config.columns, items);
                }

                setProgress(90);

                // Download the file
                downloadFile(blob, filename);

                setProgress(100);
                options.onSuccess?.(filename);

                // Reset after a short delay
                setTimeout(() => {
                    setIsExporting(false);
                    setProgress(0);
                    setCurrentExport(null);
                }, 1500);
            } catch (error) {
                console.error("Export error:", error);
                options.onError?.(error instanceof Error ? error : new Error(String(error)));
                setIsExporting(false);
                setProgress(0);
                setCurrentExport(null);
            }
        },
        [options]
    );

    return {
        exportData,
        isExporting,
        progress,
        currentExport,
    };
}

// Predefined column configurations for admin exports
export const ADMIN_EXPORT_COLUMNS = {
    orders: {
        all: [
            { header: "Order #", key: "orderNumber", width: 18 },
            { header: "Date", key: "createdAt", format: "date" as const, width: 16 },
            { header: "Customer", key: "customerName", width: 22 },
            { header: "Email", key: "customerEmail", width: 25 },
            { header: "Status", key: "status", width: 12 },
            { header: "Payment", key: "paymentStatus", width: 12 },
            { header: "Total", key: "totalAmount", format: "currency" as const, align: "right" as const, width: 15 },
        ],
        byStatus: [
            { header: "Status", key: "status", width: 25 },
            { header: "Count", key: "count", format: "number" as const, align: "center" as const, width: 20 },
            { header: "Revenue", key: "revenue", format: "currency" as const, align: "right" as const, width: 25 },
            { header: "Percentage", key: "percentage", format: "percentage" as const, align: "right" as const, width: 20 },
        ],
    },
    products: {
        all: [
            { header: "Product Name", key: "name", width: 28 },
            { header: "SKU", key: "sku", width: 15 },
            { header: "Category", key: "categoryName", width: 18 },
            { header: "Price", key: "price", format: "currency" as const, align: "right" as const, width: 12 },
            { header: "Status", key: "status", width: 10 },
            { header: "Stock", key: "stock", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Sold", key: "sold", format: "number" as const, align: "center" as const, width: 10 },
        ],
        inventory: [
            { header: "Product Name", key: "name", width: 35 },
            { header: "SKU", key: "sku", width: 18 },
            { header: "Stock Status", key: "stockStatus", width: 15 },
            { header: "Quantity", key: "quantity", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Sold", key: "sold", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Value", key: "stockValue", format: "currency" as const, align: "right" as const, width: 15 },
        ],
    },
    customers: {
        all: [
            { header: "Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Status", key: "status", width: 12 },
            { header: "Orders", key: "ordersCount", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Total Spent", key: "totalSpent", format: "currency" as const, align: "right" as const, width: 15 },
            { header: "Joined", key: "createdAt", format: "date" as const, width: 14 },
        ],
        topSpenders: [
            { header: "Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 28 },
            { header: "Orders", key: "ordersCount", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Total Spent", key: "totalSpent", format: "currency" as const, align: "right" as const, width: 18 },
            { header: "Avg Order", key: "avgOrderValue", format: "currency" as const, align: "right" as const, width: 15 },
        ],
    },
    discounts: {
        all: [
            { header: "Code", key: "code", width: 20 },
            { header: "Type", key: "type", width: 15 },
            { header: "Value", key: "discountValue", width: 12 },
            { header: "Uses", key: "usageCount", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Max Uses", key: "usageLimit", width: 12 },
            { header: "Status", key: "status", width: 12 },
            { header: "Expires", key: "endDate", format: "date" as const, width: 14 },
        ],
    },
    users: {
        all: [
            { header: "Name", key: "name", width: 25 },
            { header: "Email", key: "email", width: 30 },
            { header: "Role", key: "role", width: 15 },
            { header: "Status", key: "status", width: 12 },
            { header: "Created", key: "createdAt", format: "date" as const, width: 14 },
        ],
    },
    reviews: {
        all: [
            { header: "Product", key: "productName", width: 25 },
            { header: "Customer", key: "customerName", width: 20 },
            { header: "Rating", key: "rating", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Title", key: "title", width: 25 },
            { header: "Status", key: "status", width: 12 },
            { header: "Date", key: "createdAt", format: "date" as const, width: 14 },
        ],
    },
};
