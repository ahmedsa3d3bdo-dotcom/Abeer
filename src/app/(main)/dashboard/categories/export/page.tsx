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
    FolderTree,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    CheckCircle2,
    Layers,
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

// Available category exports
const categoryExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-categories",
        name: "All Categories Export",
        type: "categories",
        description: "Complete list of all product categories",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Name", "Slug", "Parent", "Products", "Status", "Created"],
        columns: ADMIN_EXPORT_COLUMNS.categories.all,
        icon: FolderTree,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/categories/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/categories",
                params,
                (c: any) => ({
                    name: c.name,
                    slug: c.slug,
                    parentName: c.parent?.name || "—",
                    productCount: c.productCount ?? 0,
                    status: c.isActive ? "Active" : "Inactive",
                    createdAt: c.createdAt,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Categories", value: metrics.totalCategories ?? items.length, format: "number" as const },
                { label: "Active", value: metrics.activeCategories ?? 0, format: "number" as const },
                { label: "Root Categories", value: metrics.rootCategories ?? 0, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "active-categories",
        name: "Active Categories",
        type: "categories",
        description: "All currently active categories",
        formats: ["pdf", "xlsx"],
        fields: ["Name", "Slug", "Parent", "Products"],
        columns: ADMIN_EXPORT_COLUMNS.categories.all,
        icon: CheckCircle2,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("isActive", "true");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/categories",
                params,
                (c: any) => ({
                    name: c.name,
                    slug: c.slug,
                    parentName: c.parent?.name || "—",
                    productCount: c.productCount ?? 0,
                    status: "Active",
                    createdAt: c.createdAt,
                })
            );

            const summary = [
                { label: "Active Categories", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "category-hierarchy",
        name: "Category Hierarchy",
        type: "categories",
        description: "Categories with their parent relationships",
        formats: ["pdf", "xlsx"],
        fields: ["Name", "Parent", "Level", "Products"],
        columns: [
            { header: "Name", key: "name", width: 30 },
            { header: "Parent", key: "parentName", width: 25 },
            { header: "Level", key: "level", format: "number" as const, align: "center" as const, width: 10 },
            { header: "Products", key: "productCount", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Status", key: "status", width: 12 },
        ],
        icon: Layers,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/categories",
                params,
                (c: any) => ({
                    name: c.name,
                    parentName: c.parent?.name || "—",
                    level: c.parent ? 2 : 1,
                    productCount: c.productCount ?? 0,
                    status: c.isActive ? "Active" : "Inactive",
                })
            );

            // Sort by level and name
            const items = allItems.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

            const rootCount = items.filter((c) => c.level === 1).length;
            const childCount = items.filter((c) => c.level > 1).length;

            const summary = [
                { label: "Root Categories", value: rootCount, format: "number" as const },
                { label: "Sub-Categories", value: childCount, format: "number" as const },
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

export default function CategoriesExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof categoryExports)[0]) => {
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
                    <Link href="/dashboard/categories">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Categories Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate category reports and data exports
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {categoryExports.map((config) => {
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

            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">About Category Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• <strong>PDF</strong> - Professional category reports</li>
                        <li>• <strong>XLSX</strong> - Excel spreadsheets for analysis</li>
                        <li>• <strong>CSV</strong> - Raw data for importing into other systems</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
