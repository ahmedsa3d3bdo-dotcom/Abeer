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
    Bell,
    Inbox,
    CheckCircle2,
    Archive,
    Users,
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

// Available notification exports
const notificationExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-notifications",
        name: "All Notifications",
        type: "notifications",
        description: "Complete export of all notifications across all users",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Title", "Type", "Status", "User", "Created"],
        columns: [
            { header: "Title", key: "title", width: 30 },
            { header: "Type", key: "type", width: 18 },
            { header: "Status", key: "status", width: 12 },
            { header: "User", key: "userEmail", width: 28 },
            { header: "Created", key: "createdAt", format: "date" as const, width: 18 },
        ],
        icon: Bell,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("scope", "all");
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/notifications/metrics?scope=all`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/notifications",
                params,
                (n: any) => ({
                    title: n.title || "—",
                    type: n.type || "—",
                    status: n.status || "unread",
                    userEmail: n.userEmail || "—",
                    createdAt: n.createdAt,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Notifications", value: metrics.total ?? items.length, format: "number" as const },
                { label: "Unread", value: metrics.unread ?? 0, format: "number" as const },
                { label: "Read", value: metrics.read ?? 0, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "unread-notifications",
        name: "Unread Notifications",
        type: "notifications",
        description: "All unread notifications requiring attention",
        formats: ["pdf", "xlsx"],
        fields: ["Title", "Type", "User", "Created"],
        columns: [
            { header: "Title", key: "title", width: 35 },
            { header: "Type", key: "type", width: 18 },
            { header: "User", key: "userEmail", width: 28 },
            { header: "Created", key: "createdAt", format: "date" as const, width: 18 },
        ],
        icon: Inbox,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("scope", "all");
            params.set("status", "unread");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/notifications",
                params,
                (n: any) => ({
                    title: n.title || "—",
                    type: n.type || "—",
                    userEmail: n.userEmail || "—",
                    createdAt: n.createdAt,
                })
            );

            const summary = [
                { label: "Unread Notifications", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "read-notifications",
        name: "Read Notifications",
        type: "notifications",
        description: "Notifications that have been marked as read",
        formats: ["pdf", "xlsx"],
        fields: ["Title", "Type", "User", "Created"],
        columns: [
            { header: "Title", key: "title", width: 35 },
            { header: "Type", key: "type", width: 18 },
            { header: "User", key: "userEmail", width: 28 },
            { header: "Created", key: "createdAt", format: "date" as const, width: 18 },
        ],
        icon: CheckCircle2,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("scope", "all");
            params.set("status", "read");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/notifications",
                params,
                (n: any) => ({
                    title: n.title || "—",
                    type: n.type || "—",
                    userEmail: n.userEmail || "—",
                    createdAt: n.createdAt,
                })
            );

            const summary = [
                { label: "Read Notifications", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "archived-notifications",
        name: "Archived Notifications",
        type: "notifications",
        description: "Notifications that have been archived by users",
        formats: ["pdf", "xlsx"],
        fields: ["Title", "Type", "User", "Created"],
        columns: [
            { header: "Title", key: "title", width: 35 },
            { header: "Type", key: "type", width: 18 },
            { header: "User", key: "userEmail", width: 28 },
            { header: "Created", key: "createdAt", format: "date" as const, width: 18 },
        ],
        icon: Archive,
        iconBg: "bg-slate-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("scope", "all");
            params.set("status", "archived");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/notifications",
                params,
                (n: any) => ({
                    title: n.title || "—",
                    type: n.type || "—",
                    userEmail: n.userEmail || "—",
                    createdAt: n.createdAt,
                })
            );

            const summary = [
                { label: "Archived Notifications", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "notifications-by-type",
        name: "Notifications by Type",
        type: "notifications",
        description: "Summary of notifications grouped by notification type",
        formats: ["pdf", "xlsx"],
        fields: ["Type", "Total", "Unread", "Read", "Archived"],
        columns: [
            { header: "Type", key: "type", width: 25 },
            { header: "Total", key: "total", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Unread", key: "unread", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Read", key: "read", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Archived", key: "archived", format: "number" as const, align: "center" as const, width: 12 },
        ],
        icon: Users,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("scope", "all");
            params.set("sort", "createdAt.desc");

            const allNotifications = await fetchAllPages(
                "/api/v1/notifications",
                params,
                (n: any) => ({
                    type: n.type || "unknown",
                    status: n.status || "unread",
                })
            );

            // Group by type
            const typeMap = new Map<string, { total: number; unread: number; read: number; archived: number }>();

            for (const notif of allNotifications) {
                const existing = typeMap.get(notif.type) || { total: 0, unread: 0, read: 0, archived: 0 };
                existing.total++;
                if (notif.status === "unread") existing.unread++;
                else if (notif.status === "read") existing.read++;
                else if (notif.status === "archived") existing.archived++;
                typeMap.set(notif.type, existing);
            }

            const items = Array.from(typeMap.entries())
                .map(([type, counts]) => ({ type, ...counts }))
                .sort((a, b) => b.total - a.total);

            const summary = [
                { label: "Notification Types", value: items.length, format: "number" as const },
                { label: "Total Notifications", value: allNotifications.length, format: "number" as const },
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

export default function NotificationsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof notificationExports)[0]) => {
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
                    <Link href="/dashboard/notifications">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Notifications Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate notification reports and analytics
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {notificationExports.map((config) => {
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
                                                <SelectTrigger className="w-24">
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
                    <CardTitle className="text-sm font-medium">About Notification Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional notification reports with summary
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for analysis
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data for external systems
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
