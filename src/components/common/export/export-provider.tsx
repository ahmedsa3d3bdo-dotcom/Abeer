"use client";

import { useState, useCallback, createContext, useContext, useMemo } from "react";
import {
    generatePDFReport,
    generateExcelReport,
    generateCSVReport,
    downloadFile,
    getReportFilename,
    type ReportMetadata,
    type SummaryItem,
    type TableColumn,
    BRAND_CONFIG,
} from "@/lib/reports/report-generator";
import { toast } from "sonner";

export type ExportFormat = "pdf" | "xlsx" | "csv";

export interface ExportColumn {
    header: string;
    key: string;
    width?: number;
    align?: "left" | "center" | "right";
    format?: "currency" | "number" | "percentage" | "date" | "text";
}

export interface ExportConfig {
    title: string;
    subtitle?: string;
    type: "orders" | "products" | "customers" | "discounts" | "reviews" | "users" | "refunds" | "returns" | "shipping" | "support" | "generic";
    columns: ExportColumn[];
    data: Record<string, any>[];
    summary?: SummaryItem[];
}

interface ExportContextValue {
    exportData: (config: ExportConfig, format: ExportFormat) => Promise<void>;
    isExporting: boolean;
    progress: number;
}

const ExportContext = createContext<ExportContextValue | null>(null);

export function ExportProvider({ children }: { children: React.ReactNode }) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    const exportData = useCallback(async (config: ExportConfig, format: ExportFormat) => {
        setIsExporting(true);
        setProgress(10);

        try {
            const metadata: ReportMetadata = {
                title: config.title,
                subtitle: config.subtitle,
                generatedAt: new Date(),
                reportType: config.type as any || "sales",
            };

            setProgress(30);

            const summary = config.summary || [];
            const tables = [
                {
                    title: config.title,
                    columns: config.columns as TableColumn[],
                    data: config.data,
                },
            ];

            setProgress(50);

            let blob: Blob;
            const filename = getReportFilename(config.title.replace(/\s+/g, "-"), format);

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
                blob = generateCSVReport(config.columns as TableColumn[], config.data);
            }

            setProgress(90);

            downloadFile(blob, filename);

            setProgress(100);
            toast.success(`${config.title} exported as ${format.toUpperCase()}`);

            setTimeout(() => {
                setIsExporting(false);
                setProgress(0);
            }, 500);
        } catch (error: any) {
            console.error("Export error:", error);
            toast.error(`Failed to export: ${error.message || "Unknown error"}`);
            setIsExporting(false);
            setProgress(0);
        }
    }, []);

    const value = useMemo<ExportContextValue>(
        () => ({ exportData, isExporting, progress }),
        [exportData, isExporting, progress]
    );

    return (
        <ExportContext.Provider value={value}>
            {children}
        </ExportContext.Provider>
    );
}

export function useExport() {
    const ctx = useContext(ExportContext);
    if (!ctx) throw new Error("Missing ExportProvider");
    return ctx;
}

// Predefined column configurations for common data types
export const EXPORT_COLUMNS = {
    orders: [
        { header: "Order #", key: "orderNumber", width: 18 },
        { header: "Date", key: "createdAt", format: "date" as const, width: 16 },
        { header: "Customer", key: "customerName", width: 22 },
        { header: "Email", key: "customerEmail", width: 25 },
        { header: "Status", key: "status", width: 12 },
        { header: "Payment", key: "paymentStatus", width: 12 },
        { header: "Total", key: "totalAmount", format: "currency" as const, align: "right" as const, width: 15 },
    ],
    products: [
        { header: "Product Name", key: "name", width: 28 },
        { header: "SKU", key: "sku", width: 15 },
        { header: "Category", key: "categoryName", width: 18 },
        { header: "Price", key: "price", format: "currency" as const, align: "right" as const, width: 12 },
        { header: "Status", key: "status", width: 10 },
        { header: "Stock", key: "stock", format: "number" as const, align: "center" as const, width: 10 },
        { header: "Sold", key: "soldCount", format: "number" as const, align: "center" as const, width: 10 },
    ],
    customers: [
        { header: "Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Phone", key: "phone", width: 15 },
        { header: "Orders", key: "ordersCount", format: "number" as const, align: "center" as const, width: 10 },
        { header: "Total Spent", key: "totalSpent", format: "currency" as const, align: "right" as const, width: 15 },
        { header: "Joined", key: "createdAt", format: "date" as const, width: 14 },
    ],
    discounts: [
        { header: "Code", key: "code", width: 20 },
        { header: "Type", key: "type", width: 15 },
        { header: "Value", key: "value", width: 12 },
        { header: "Uses", key: "usageCount", format: "number" as const, align: "center" as const, width: 10 },
        { header: "Status", key: "status", width: 12 },
        { header: "Expires", key: "endDate", format: "date" as const, width: 14 },
    ],
    users: [
        { header: "Name", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Role", key: "role", width: 15 },
        { header: "Status", key: "status", width: 12 },
        { header: "Created", key: "createdAt", format: "date" as const, width: 14 },
    ],
    reviews: [
        { header: "Product", key: "productName", width: 25 },
        { header: "Customer", key: "customerName", width: 20 },
        { header: "Rating", key: "rating", format: "number" as const, align: "center" as const, width: 10 },
        { header: "Title", key: "title", width: 25 },
        { header: "Status", key: "status", width: 12 },
        { header: "Date", key: "createdAt", format: "date" as const, width: 14 },
    ],
    refunds: [
        { header: "Order #", key: "orderNumber", width: 15 },
        { header: "Customer", key: "customerName", width: 22 },
        { header: "Amount", key: "amount", format: "currency" as const, align: "right" as const, width: 15 },
        { header: "Reason", key: "reason", width: 25 },
        { header: "Status", key: "status", width: 12 },
        { header: "Date", key: "createdAt", format: "date" as const, width: 14 },
    ],
    returns: [
        { header: "Order #", key: "orderNumber", width: 15 },
        { header: "Product", key: "productName", width: 25 },
        { header: "Customer", key: "customerName", width: 20 },
        { header: "Reason", key: "reason", width: 20 },
        { header: "Status", key: "status", width: 12 },
        { header: "Date", key: "createdAt", format: "date" as const, width: 14 },
    ],
    shipping: [
        { header: "Order #", key: "orderNumber", width: 15 },
        { header: "Carrier", key: "carrier", width: 15 },
        { header: "Tracking #", key: "trackingNumber", width: 22 },
        { header: "Status", key: "status", width: 15 },
        { header: "Cost", key: "cost", format: "currency" as const, align: "right" as const, width: 12 },
        { header: "Shipped", key: "shippedAt", format: "date" as const, width: 14 },
    ],
    support: [
        { header: "Ticket #", key: "ticketNumber", width: 15 },
        { header: "Customer", key: "customerName", width: 20 },
        { header: "Subject", key: "subject", width: 28 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "Created", key: "createdAt", format: "date" as const, width: 14 },
    ],
};
