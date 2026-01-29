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
    Star,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    CheckCircle2,
    Clock,
    ThumbsUp,
    ThumbsDown,
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

// Available review exports
const reviewExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-reviews",
        name: "All Reviews Export",
        type: "reviews",
        description: "Complete list of all product reviews",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Product", "Customer", "Rating", "Title", "Status", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.reviews.all,
        icon: Star,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/reviews/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/reviews",
                params,
                (r: any) => ({
                    productName: r.productName || r.product?.name || "—",
                    customerName: r.userName || r.user?.name || r.user?.email || "—",
                    rating: r.rating,
                    title: r.title || "—",
                    status: r.status || (r.isApproved ? "Approved" : "Pending"),
                    createdAt: r.createdAt,
                })
            );

            const metrics = metricsData.data || {};
            const avgRating = items.length > 0
                ? (items.reduce((acc, r) => acc + r.rating, 0) / items.length).toFixed(1)
                : 0;

            const summary = [
                { label: "Total Reviews", value: metrics.totalReviews ?? items.length, format: "number" as const },
                { label: "Approved", value: metrics.approvedReviews ?? 0, format: "number" as const },
                { label: "Pending", value: metrics.pendingReviews ?? 0, format: "number" as const },
                { label: "Average Rating", value: Number(avgRating), format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "approved-reviews",
        name: "Approved Reviews",
        type: "reviews",
        description: "All approved and published reviews",
        formats: ["pdf", "xlsx"],
        fields: ["Product", "Customer", "Rating", "Title", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.reviews.all,
        icon: CheckCircle2,
        iconBg: "bg-emerald-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("status", "approved");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/reviews",
                params,
                (r: any) => ({
                    productName: r.productName || r.product?.name || "—",
                    customerName: r.userName || r.user?.name || r.user?.email || "—",
                    rating: r.rating,
                    title: r.title || "—",
                    status: "Approved",
                    createdAt: r.createdAt,
                })
            );

            const avgRating = items.length > 0
                ? (items.reduce((acc, r) => acc + r.rating, 0) / items.length).toFixed(1)
                : 0;

            const summary = [
                { label: "Approved Reviews", value: items.length, format: "number" as const },
                { label: "Average Rating", value: Number(avgRating), format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "pending-reviews",
        name: "Pending Reviews",
        type: "reviews",
        description: "Reviews awaiting moderation",
        formats: ["pdf", "xlsx"],
        fields: ["Product", "Customer", "Rating", "Title", "Submitted"],
        columns: ADMIN_EXPORT_COLUMNS.reviews.all,
        icon: Clock,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("status", "pending");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/reviews",
                params,
                (r: any) => ({
                    productName: r.productName || r.product?.name || "—",
                    customerName: r.userName || r.user?.name || r.user?.email || "—",
                    rating: r.rating,
                    title: r.title || "—",
                    status: "Pending",
                    createdAt: r.createdAt,
                })
            );

            const summary = [
                { label: "Pending Reviews", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "high-rated",
        name: "High-Rated Reviews (4-5 Stars)",
        type: "reviews",
        description: "Positive reviews with 4 or 5 star ratings",
        formats: ["pdf", "xlsx"],
        fields: ["Product", "Customer", "Rating", "Title", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.reviews.all,
        icon: ThumbsUp,
        iconBg: "bg-green-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/reviews",
                params,
                (r: any) => ({
                    productName: r.productName || r.product?.name || "—",
                    customerName: r.userName || r.user?.name || r.user?.email || "—",
                    rating: r.rating,
                    title: r.title || "—",
                    status: r.status || (r.isApproved ? "Approved" : "Pending"),
                    createdAt: r.createdAt,
                })
            );

            // Filter to 4-5 star ratings
            const items = allItems.filter((r) => r.rating >= 4);

            const summary = [
                { label: "High-Rated Reviews", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "low-rated",
        name: "Low-Rated Reviews (1-2 Stars)",
        type: "reviews",
        description: "Critical reviews requiring attention",
        formats: ["pdf", "xlsx"],
        fields: ["Product", "Customer", "Rating", "Title", "Date"],
        columns: ADMIN_EXPORT_COLUMNS.reviews.all,
        icon: ThumbsDown,
        iconBg: "bg-rose-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const allItems = await fetchAllPages(
                "/api/v1/reviews",
                params,
                (r: any) => ({
                    productName: r.productName || r.product?.name || "—",
                    customerName: r.userName || r.user?.name || r.user?.email || "—",
                    rating: r.rating,
                    title: r.title || "—",
                    status: r.status || (r.isApproved ? "Approved" : "Pending"),
                    createdAt: r.createdAt,
                })
            );

            // Filter to 1-2 star ratings
            const items = allItems.filter((r) => r.rating <= 2);

            const summary = [
                { label: "Low-Rated Reviews", value: items.length, format: "number" as const },
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

export default function ReviewsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof reviewExports)[0]) => {
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
                    <Link href="/dashboard/reviews">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Reviews Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate product review reports
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {reviewExports.map((config) => {
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
                    <CardTitle className="text-sm font-medium">About Review Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional review reports with summary
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
