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
    Percent,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    CheckCircle2,
    Clock,
    Tag,
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

// Available discount exports
const discountExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-discounts",
        name: "All Discounts Export",
        type: "discounts",
        description: "Complete list of all discount codes and promotions",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Code", "Type", "Value", "Uses", "Max Uses", "Status", "Expires"],
        columns: ADMIN_EXPORT_COLUMNS.discounts.all,
        icon: Percent,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/discounts/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/discounts",
                params,
                (d: any) => ({
                    code: d.code,
                    type: d.type,
                    discountValue: d.type === "percentage" ? `${d.value}%` : d.value,
                    usageCount: d.usageCount ?? 0,
                    usageLimit: d.maxUses ?? "Unlimited",
                    status: d.isActive ? "Active" : "Inactive",
                    endDate: d.endDate,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Discounts", value: metrics.totalDiscounts ?? items.length, format: "number" as const },
                { label: "Active Discounts", value: metrics.activeDiscounts ?? 0, format: "number" as const },
                { label: "Total Usage", value: metrics.totalUsage ?? 0, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "active-discounts",
        name: "Active Discounts",
        type: "discounts",
        description: "Currently active discount codes",
        formats: ["pdf", "xlsx"],
        fields: ["Code", "Type", "Value", "Uses", "Max Uses", "Expires"],
        columns: ADMIN_EXPORT_COLUMNS.discounts.all,
        icon: CheckCircle2,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("isActive", "true");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/discounts",
                params,
                (d: any) => ({
                    code: d.code,
                    type: d.type,
                    discountValue: d.type === "percentage" ? `${d.value}%` : d.value,
                    usageCount: d.usageCount ?? 0,
                    usageLimit: d.maxUses ?? "Unlimited",
                    status: "Active",
                    endDate: d.endDate,
                })
            );

            const summary = [
                { label: "Active Discounts", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "expired-discounts",
        name: "Expired Discounts",
        type: "discounts",
        description: "Discounts that have expired or reached their usage limit",
        formats: ["pdf", "xlsx"],
        fields: ["Code", "Type", "Value", "Uses", "Expired"],
        columns: [
            { header: "Code", key: "code", width: 22 },
            { header: "Type", key: "type", width: 15 },
            { header: "Value", key: "discountValue", width: 12 },
            { header: "Total Uses", key: "usageCount", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Expired", key: "endDate", format: "date" as const, width: 14 },
        ],
        icon: Clock,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/discounts",
                params,
                (d: any) => ({
                    code: d.code,
                    type: d.type,
                    discountValue: d.type === "percentage" ? `${d.value}%` : d.value,
                    usageCount: d.usageCount ?? 0,
                    endDate: d.endDate,
                    isExpired: d.endDate ? new Date(d.endDate) < new Date() : false,
                    reachedLimit: d.maxUses ? d.usageCount >= d.maxUses : false,
                })
            );

            // Filter to expired only
            const items = allItems.filter((d) => d.isExpired || d.reachedLimit);

            const summary = [
                { label: "Expired Discounts", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "coupon-usage",
        name: "Coupon Usage Report",
        type: "discounts",
        description: "Top performing discount codes by usage",
        formats: ["pdf", "xlsx"],
        fields: ["Code", "Type", "Uses", "Revenue Impact"],
        columns: [
            { header: "Code", key: "code", width: 25 },
            { header: "Type", key: "type", width: 15 },
            { header: "Value", key: "discountValue", width: 12 },
            { header: "Total Uses", key: "usageCount", format: "number" as const, align: "center" as const, width: 15 },
            { header: "Status", key: "status", width: 12 },
        ],
        icon: Tag,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/discounts",
                params,
                (d: any) => ({
                    code: d.code,
                    type: d.type,
                    discountValue: d.type === "percentage" ? `${d.value}%` : d.value,
                    usageCount: d.usageCount ?? 0,
                    status: d.isActive ? "Active" : "Inactive",
                })
            );

            // Sort by usage count descending
            const items = allItems
                .filter((d) => d.usageCount > 0)
                .sort((a, b) => b.usageCount - a.usageCount);

            const totalUsage = items.reduce((acc, d) => acc + d.usageCount, 0);

            const summary = [
                { label: "Active Coupons", value: items.length, format: "number" as const },
                { label: "Total Uses", value: totalUsage, format: "number" as const },
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

export default function DiscountsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof discountExports)[0]) => {
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
                    <Link href="/dashboard/discounts">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Discounts Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate discount and coupon reports
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {discountExports.map((config) => {
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
                    <CardTitle className="text-sm font-medium">About Discount Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional discount reports with summary
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for analysis
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data for importing into other systems
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
