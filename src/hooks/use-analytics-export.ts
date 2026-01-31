"use client";

import { useState, useCallback } from "react";
import {
    generateAnalyticsPDFReport,
    generateExcelReport,
    downloadFile,
    getReportFilename,
    type ReportMetadata,
    type SummaryItem,
    type TableColumn,
    type ChartData,
} from "@/lib/reports/report-generator";

export type ExportFormat = "pdf" | "xlsx";

export interface AnalyticsExportConfig {
    id: string;
    name: string;
    type: "sales" | "products" | "customers" | "marketing";
    description: string;
    formats: ExportFormat[];
    fetchData: (dateRange: string) => Promise<{
        summary: SummaryItem[];
        charts: ChartData[];
        tables: Array<{
            title: string;
            columns: TableColumn[];
            data: Record<string, any>[];
        }>;
    }>;
}

interface UseAnalyticsExportOptions {
    onSuccess?: (filename: string) => void;
    onError?: (error: Error) => void;
}

export function useAnalyticsExport(options: UseAnalyticsExportOptions = {}) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentExport, setCurrentExport] = useState<string | null>(null);

    const exportData = useCallback(
        async (
            config: AnalyticsExportConfig,
            format: ExportFormat,
            dateRange: string
        ) => {
            setIsExporting(true);
            setProgress(10);
            setCurrentExport(config.id);

            try {
                // Fetch the data
                setProgress(20);
                const { summary, charts, tables } = await config.fetchData(dateRange);

                setProgress(50);

                // Prepare metadata
                const metadata: ReportMetadata = {
                    title: config.name,
                    subtitle: config.description,
                    generatedAt: new Date(),
                    reportType: config.type as any,
                    dateRange: getDateRangeFromString(dateRange),
                };

                setProgress(70);

                // Generate the report in the selected format
                let blob: Blob;
                const filename = getReportFilename(config.name.replace(/\s+/g, "-"), format);

                if (format === "pdf") {
                    blob = await generateAnalyticsPDFReport(metadata, summary, charts, tables);
                } else {
                    blob = generateExcelReport(
                        metadata,
                        summary,
                        tables.map((t) => ({
                            name: t.title.slice(0, 31),
                            columns: t.columns,
                            data: t.data,
                        }))
                    );
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

function getDateRangeFromString(range: string): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();

    switch (range) {
        case "7d":
            from.setDate(to.getDate() - 7);
            break;
        case "30d":
            from.setDate(to.getDate() - 30);
            break;
        case "90d":
        case "3m":
            from.setDate(to.getDate() - 90);
            break;
        case "365d":
        case "1y":
            from.setFullYear(to.getFullYear() - 1);
            break;
        default:
            from.setDate(to.getDate() - 30);
    }

    return { from, to };
}
