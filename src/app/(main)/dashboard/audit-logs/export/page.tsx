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
    FileSearch,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    LogIn,
    Edit3,
    Trash2,
    ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig, ADMIN_EXPORT_COLUMNS } from "@/hooks/use-admin-export";
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

// Available audit log exports
const auditLogExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-audit-logs",
        name: "All Audit Logs Export",
        type: "auditLogs",
        description: "Complete audit trail of all system activities",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Action", "User", "Resource", "Resource ID", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.auditLogs.all,
        icon: FileSearch,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/audit/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/audit",
                params,
                (l: any) => ({
                    action: l.action,
                    userName: l.user?.email || l.userEmail || "System",
                    resource: l.resource || l.entityType || "—",
                    resourceId: l.resourceId || l.entityId || "—",
                    createdAt: l.createdAt,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Logs", value: metrics.totalLogs ?? items.length, format: "number" as const },
                { label: "Create Actions", value: metrics.createCount ?? 0, format: "number" as const },
                { label: "Update Actions", value: metrics.updateCount ?? 0, format: "number" as const },
                { label: "Delete Actions", value: metrics.deleteCount ?? 0, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "login-logs",
        name: "Login Activity",
        type: "auditLogs",
        description: "User login and authentication events",
        formats: ["pdf", "xlsx"],
        fields: ["User", "Action", "IP Address", "Date"],
        columns: [
            { header: "User", key: "userName", width: 25 },
            { header: "Action", key: "action", width: 18 },
            { header: "IP Address", key: "ipAddress", width: 18 },
            { header: "Date", key: "createdAt", format: "date" as const, width: 20 },
        ],
        icon: LogIn,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("action", "login");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/audit",
                params,
                (l: any) => ({
                    userName: l.user?.email || l.userEmail || "System",
                    action: l.action,
                    ipAddress: l.ipAddress || l.metadata?.ip || "—",
                    createdAt: l.createdAt,
                })
            );

            const summary = [
                { label: "Login Events", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "update-logs",
        name: "Update Actions",
        type: "auditLogs",
        description: "All data update and modification events",
        formats: ["pdf", "xlsx"],
        fields: ["User", "Resource", "Resource ID", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.auditLogs.all,
        icon: Edit3,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("action", "update");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/audit",
                params,
                (l: any) => ({
                    action: "Update",
                    userName: l.user?.email || l.userEmail || "System",
                    resource: l.resource || l.entityType || "—",
                    resourceId: l.resourceId || l.entityId || "—",
                    createdAt: l.createdAt,
                })
            );

            const summary = [
                { label: "Update Events", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "delete-logs",
        name: "Delete Actions",
        type: "auditLogs",
        description: "All data deletion events",
        formats: ["pdf", "xlsx"],
        fields: ["User", "Resource", "Resource ID", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.auditLogs.all,
        icon: Trash2,
        iconBg: "bg-rose-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("action", "delete");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/audit",
                params,
                (l: any) => ({
                    action: "Delete",
                    userName: l.user?.email || l.userEmail || "System",
                    resource: l.resource || l.entityType || "—",
                    resourceId: l.resourceId || l.entityId || "—",
                    createdAt: l.createdAt,
                })
            );

            const summary = [
                { label: "Delete Events", value: items.length, format: "number" as const },
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

export default function AuditLogsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof auditLogExports)[0]) => {
        const format = selectedFormats[config.id] || config.formats[0];
        await exportData(config, format);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/audit-logs">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Audit Logs Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate audit trail and compliance reports
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4">
                {auditLogExports.map((config) => {
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
                                                        <Badge key={field} variant="secondary" className="text-xs font-normal">
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
                                                    setSelectedFormats((prev) => ({ ...prev, [config.id]: value as ExportFormat }))
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
                                                    isCurrentlyExporting && progress === 100 && "bg-emerald-600 hover:bg-emerald-600"
                                                )}
                                            >
                                                {isCurrentlyExporting ? (
                                                    progress === 100 ? (
                                                        <><Check className="h-4 w-4 mr-2" />Done!</>
                                                    ) : (
                                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting...</>
                                                    )
                                                ) : (
                                                    <><Download className="h-4 w-4 mr-2" />Export</>
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

            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">About Audit Log Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>PDF</strong> - Professional audit reports for compliance</li>
                        <li>• <strong>XLSX</strong> - Excel spreadsheets for analysis</li>
                        <li>• <strong>CSV</strong> - Raw data for archiving and SIEM systems</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
