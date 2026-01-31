"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    Users,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    UserPlus,
    Crown,
    UserCheck,
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

// Available customer exports
const customerExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-customers",
        name: "All Customers Export",
        type: "customers",
        description: "Complete customer list with order history and spending",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Name", "Email", "Status", "Orders", "Total Spent", "Joined"],
        columns: ADMIN_EXPORT_COLUMNS.customers.all,
        icon: Users,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/customers/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/customers",
                params,
                (c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    status: c.isActive ? "Active" : "Inactive",
                    ordersCount: c.ordersCount ?? 0,
                    totalSpent: Number(c.totalSpent || 0),
                    createdAt: c.createdAt,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Customers", value: metrics.totalCustomers ?? items.length, format: "number" as const },
                { label: "Active Customers", value: metrics.activeCustomers ?? 0, format: "number" as const },
                { label: "Total Sales", value: Number(metrics.totalSpent ?? 0), format: "currency" as const },
                { label: "Avg Order Value", value: Number(metrics.avgOrderValue ?? 0), format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "top-spenders",
        name: "Top Spenders Report",
        type: "customers",
        description: "VIP customers sorted by total spending",
        formats: ["pdf", "xlsx"],
        fields: ["Name", "Email", "Orders", "Total Spent", "Avg Order"],
        columns: ADMIN_EXPORT_COLUMNS.customers.topSpenders,
        icon: Crown,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");
            params.set("limit", "100"); // Top 100 spenders

            const res = await fetch(`/api/v1/customers?${params.toString()}`);
            const data = await res.json();

            const items = (data.data?.items || [])
                .filter((c: any) => Number(c.totalSpent || 0) > 0)
                .map((c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    ordersCount: c.ordersCount ?? 0,
                    totalSpent: Number(c.totalSpent || 0),
                    avgOrderValue: Number(c.avgOrderValue || 0),
                }));

            const totalRevenue = items.reduce((acc: number, c: any) => acc + c.totalSpent, 0);

            const summary = [
                { label: "Top Spenders", value: items.length, format: "number" as const },
                { label: "Combined Revenue", value: totalRevenue, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "new-customers",
        name: "New Customers (30 Days)",
        type: "customers",
        description: "Recently registered customers",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Name", "Email", "Status", "Orders", "Joined"],
        columns: [
            { header: "Name", key: "name", width: 28 },
            { header: "Email", key: "email", width: 32 },
            { header: "Status", key: "status", width: 12 },
            { header: "Orders", key: "ordersCount", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Joined", key: "createdAt", format: "date" as const, width: 18 },
        ],
        icon: UserPlus,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/customers",
                params,
                (c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    status: c.isActive ? "Active" : "Inactive",
                    ordersCount: c.ordersCount ?? 0,
                    createdAt: c.createdAt,
                })
            );

            // Filter to last 30 days
            const items = allItems.filter((c) => new Date(c.createdAt) >= thirtyDaysAgo);
            const withOrders = items.filter((c) => c.ordersCount > 0).length;

            const summary = [
                { label: "New Customers", value: items.length, format: "number" as const },
                { label: "Made Purchase", value: withOrders, format: "number" as const },
                { label: "Conversion Rate", value: items.length > 0 ? (withOrders / items.length) * 100 : 0, format: "percentage" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "active-customers",
        name: "Active Customers",
        type: "customers",
        description: "All customers with active status",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Name", "Email", "Orders", "Total Spent", "Joined"],
        columns: ADMIN_EXPORT_COLUMNS.customers.all,
        icon: UserCheck,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("isActive", "true");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/customers",
                params,
                (c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    status: "Active",
                    ordersCount: c.ordersCount ?? 0,
                    totalSpent: Number(c.totalSpent || 0),
                    createdAt: c.createdAt,
                })
            );

            const totalSpent = items.reduce((acc, c) => acc + c.totalSpent, 0);
            const totalOrders = items.reduce((acc, c) => acc + c.ordersCount, 0);

            const summary = [
                { label: "Active Customers", value: items.length, format: "number" as const },
                { label: "Total Orders", value: totalOrders, format: "number" as const },
                { label: "Total Sales", value: totalSpent, format: "currency" as const },
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

export default function CustomersExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof customerExports)[0]) => {
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
                    <Link href="/dashboard/customers">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Customers Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate customer reports and data exports
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {customerExports.map((config) => {
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
                                            {/* Format selector */}
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

                                    {/* Progress bar when exporting */}
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
                    <CardTitle className="text-sm font-medium">About Customer Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional customer reports with summary cards
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for CRM and analysis
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data for importing into marketing tools
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
