"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    AlertTriangle,
    XCircle,
    Bug,
    Server,
    ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig } from "@/hooks/use-admin-export";
import { toast } from "sonner";
import Link from "next/link";

// Helper function to fetch all pages of data
async function fetchAllPages<T>(
    baseUrl: string,
    params: URLSearchParams,
    mapFn: (item: any) => T,
    maxPages = 20
): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    params.set("limit", "100");

    while (hasMore && page <= maxPages) {
        params.set("page", String(page));
        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();

        const items = data.data?.items || [];
        const total = data.data?.total || 0;

        allItems.push(...items.map(mapFn));

        hasMore = allItems.length < total && items.length > 0;
        page++;
    }

    return allItems;
}

// Available system log exports
const systemLogExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-logs",
        name: "All System Logs",
        type: "systemLogs",
        description: "Complete export of all system logs with full details",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Timestamp", "Level", "Source", "Message", "User", "IP"],
        columns: [
            { header: "Timestamp", key: "createdAt", format: "date" as const, width: 20 },
            { header: "Level", key: "level", width: 10 },
            { header: "Source", key: "source", width: 12 },
            { header: "Message", key: "message", width: 40 },
            { header: "User", key: "userEmail", width: 25 },
            { header: "IP", key: "ipAddress", width: 15 },
        ],
        icon: FileText,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/system/logs",
                params,
                (log: any) => ({
                    createdAt: log.createdAt,
                    level: log.level || "info",
                    source: log.source || "server",
                    message: (log.message || "").slice(0, 200),
                    userEmail: log.userEmail || "—",
                    ipAddress: log.ipAddress || "—",
                })
            );

            const errorCount = items.filter(i => i.level === "error").length;
            const warnCount = items.filter(i => i.level === "warn" || i.level === "warning").length;

            const summary = [
                { label: "Total Logs", value: items.length, format: "number" as const },
                { label: "Errors", value: errorCount, format: "number" as const },
                { label: "Warnings", value: warnCount, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "error-logs",
        name: "Error Logs Only",
        type: "systemLogs",
        description: "All error-level logs for debugging and troubleshooting",
        formats: ["pdf", "xlsx"],
        fields: ["Timestamp", "Source", "Message", "Stack", "User"],
        columns: [
            { header: "Timestamp", key: "createdAt", format: "date" as const, width: 20 },
            { header: "Source", key: "source", width: 12 },
            { header: "Message", key: "message", width: 35 },
            { header: "Stack", key: "stack", width: 40 },
            { header: "User", key: "userEmail", width: 20 },
        ],
        icon: XCircle,
        iconBg: "bg-rose-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("level", "error");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/system/logs",
                params,
                (log: any) => ({
                    createdAt: log.createdAt,
                    source: log.source || "server",
                    message: (log.message || "").slice(0, 200),
                    stack: (log.stack || "").slice(0, 300),
                    userEmail: log.userEmail || "—",
                })
            );

            const summary = [
                { label: "Error Logs", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "warning-logs",
        name: "Warning Logs",
        type: "systemLogs",
        description: "All warning-level logs that may require attention",
        formats: ["pdf", "xlsx"],
        fields: ["Timestamp", "Source", "Message", "User"],
        columns: [
            { header: "Timestamp", key: "createdAt", format: "date" as const, width: 20 },
            { header: "Source", key: "source", width: 12 },
            { header: "Message", key: "message", width: 45 },
            { header: "User", key: "userEmail", width: 25 },
        ],
        icon: AlertTriangle,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("level", "warn");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/system/logs",
                params,
                (log: any) => ({
                    createdAt: log.createdAt,
                    source: log.source || "server",
                    message: (log.message || "").slice(0, 250),
                    userEmail: log.userEmail || "—",
                })
            );

            const summary = [
                { label: "Warning Logs", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "debug-logs",
        name: "Debug Logs",
        type: "systemLogs",
        description: "Detailed debug information for development",
        formats: ["xlsx", "csv"],
        fields: ["Timestamp", "Source", "Path", "Message", "Metadata"],
        columns: [
            { header: "Timestamp", key: "createdAt", format: "date" as const, width: 20 },
            { header: "Source", key: "source", width: 12 },
            { header: "Path", key: "path", width: 25 },
            { header: "Message", key: "message", width: 35 },
            { header: "Request ID", key: "requestId", width: 22 },
        ],
        icon: Bug,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("level", "debug");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/system/logs",
                params,
                (log: any) => ({
                    createdAt: log.createdAt,
                    source: log.source || "server",
                    path: log.path || "—",
                    message: (log.message || "").slice(0, 200),
                    requestId: log.requestId || "—",
                })
            );

            const summary = [
                { label: "Debug Logs", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "logs-by-source",
        name: "Logs by Source",
        type: "systemLogs",
        description: "System logs grouped and filtered by source",
        formats: ["pdf", "xlsx"],
        fields: ["Source", "Error Count", "Warning Count", "Info Count"],
        columns: [
            { header: "Source", key: "source", width: 25 },
            { header: "Errors", key: "errorCount", format: "number" as const, align: "center" as const, width: 15 },
            { header: "Warnings", key: "warnCount", format: "number" as const, align: "center" as const, width: 15 },
            { header: "Info", key: "infoCount", format: "number" as const, align: "center" as const, width: 15 },
            { header: "Total", key: "total", format: "number" as const, align: "center" as const, width: 15 },
        ],
        icon: Server,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allLogs = await fetchAllPages(
                "/api/v1/system/logs",
                params,
                (log: any) => ({
                    source: log.source || "unknown",
                    level: log.level || "info",
                })
            );

            // Group by source
            const sourceMap = new Map<string, { errorCount: number; warnCount: number; infoCount: number; total: number }>();

            for (const log of allLogs) {
                const existing = sourceMap.get(log.source) || { errorCount: 0, warnCount: 0, infoCount: 0, total: 0 };
                if (log.level === "error") existing.errorCount++;
                else if (log.level === "warn" || log.level === "warning") existing.warnCount++;
                else existing.infoCount++;
                existing.total++;
                sourceMap.set(log.source, existing);
            }

            const items = Array.from(sourceMap.entries())
                .map(([source, counts]) => ({ source, ...counts }))
                .sort((a, b) => b.total - a.total);

            const summary = [
                { label: "Unique Sources", value: items.length, format: "number" as const },
                { label: "Total Logs", value: allLogs.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
];

const formatIcons: Record<string, any> = {
    pdf: FileText,
    xlsx: FileSpreadsheet,
    csv: FileCode,
};

export default function SystemLogsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof systemLogExports)[0]) => {
        const format = selectedFormats[config.id] || config.formats[0];
        await exportData(config, format);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/system/logs">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">System Logs Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate system log reports for debugging and monitoring
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {systemLogExports.map((config) => {
                    const isCurrentlyExporting = isExporting && currentExport === config.id;
                    const selectedFormat = getSelectedFormat(config.id, config.formats);
                    const Icon = config.icon;

                    return (
                        <Card key={config.id} className={cn(isCurrentlyExporting && "ring-2 ring-primary/20")}>
                            <CardContent className="p-5">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-2.5 rounded-lg", config.iconBg)}>
                                                <Icon className="h-5 w-5 text-foreground/80" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{config.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-0.5">
                                                    {config.description}
                                                </p>
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {config.fields.map((field) => (
                                                        <Badge
                                                            key={field}
                                                            variant="secondary"
                                                            className="text-xs font-normal"
                                                        >
                                                            {field}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                                            <Select
                                                value={selectedFormat}
                                                onValueChange={(value) =>
                                                    setSelectedFormats((prev) => ({
                                                        ...prev,
                                                        [config.id]: value as ExportFormat,
                                                    }))
                                                }
                                                disabled={isCurrentlyExporting}
                                            >
                                                <SelectTrigger className="w-[100px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {config.formats.map((fmt) => {
                                                        const FormatIcon = formatIcons[fmt] || FileText;
                                                        return (
                                                            <SelectItem key={fmt} value={fmt}>
                                                                <div className="flex items-center gap-2">
                                                                    <FormatIcon className="h-3.5 w-3.5" />
                                                                    {fmt.toUpperCase()}
                                                                </div>
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                size="sm"
                                                onClick={() => handleExport(config)}
                                                disabled={isExporting}
                                                className={cn(
                                                    "min-w-[120px]",
                                                    isCurrentlyExporting &&
                                                    progress === 100 &&
                                                    "bg-emerald-600 hover:bg-emerald-600"
                                                )}
                                            >
                                                {isCurrentlyExporting ? (
                                                    progress === 100 ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-2" />
                                                            Done!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                            Exporting...
                                                        </>
                                                    )
                                                ) : (
                                                    <>
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Export
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    {isCurrentlyExporting && progress < 100 && (
                                        <div className="space-y-1">
                                            <Progress value={progress} className="h-1.5" />
                                            <p className="text-xs text-muted-foreground text-right">{progress}%</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Info Card */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">About System Log Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional log reports with summary statistics
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for filtering and analysis
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data for log aggregation tools
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
