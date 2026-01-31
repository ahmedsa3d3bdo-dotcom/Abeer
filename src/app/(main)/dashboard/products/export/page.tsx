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
    Package,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    AlertTriangle,
    Ban,
    Star,
    Barcode,
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

// Available product exports
const productExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-products",
        name: "Full Product Catalog",
        type: "products",
        description: "Complete list of all products with pricing and stock information",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Product Name", "SKU", "Category", "Price", "Status", "Stock", "Sold"],
        columns: ADMIN_EXPORT_COLUMNS.products.all,
        icon: Package,
        iconBg: "bg-blue-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const metricsRes = await fetch(`/api/v1/products/metrics`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/products",
                params,
                (p: any) => ({
                    name: p.name,
                    sku: p.sku || "—",
                    categoryName: (p.categoryNames || []).join(", ") || "—",
                    price: Number(p.price || 0),
                    status: p.status,
                    stock: p.quantity ?? 0,
                    sold: p.sold ?? 0,
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Products", value: metrics.totalProducts ?? items.length, format: "number" as const },
                { label: "Active Products", value: metrics.activeProducts ?? 0, format: "number" as const },
                { label: "Out of Stock", value: metrics.outOfStockProducts ?? 0, format: "number" as const },
                { label: "Average Price", value: Number(metrics.avgPrice ?? 0), format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "inventory-report",
        name: "Inventory Report",
        type: "products",
        description: "Stock levels and inventory valuation",
        formats: ["pdf", "xlsx"],
        fields: ["Product Name", "SKU", "Stock Status", "Quantity", "Sold", "Stock Value"],
        columns: ADMIN_EXPORT_COLUMNS.products.inventory,
        icon: Barcode,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/products",
                params,
                (p: any) => {
                    const price = Number(p.price || 0);
                    const quantity = p.quantity ?? 0;
                    return {
                        name: p.name,
                        sku: p.sku || "—",
                        stockStatus: p.stockStatus || "unknown",
                        quantity: quantity,
                        sold: p.sold ?? 0,
                        stockValue: price * quantity,
                    };
                }
            );

            const totalUnits = items.reduce((acc, p) => acc + p.quantity, 0);
            const totalValue = items.reduce((acc, p) => acc + p.stockValue, 0);

            const summary = [
                { label: "Total Products", value: items.length, format: "number" as const },
                { label: "Total Units", value: totalUnits, format: "number" as const },
                { label: "Total Inventory Value", value: totalValue, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "low-stock",
        name: "Low Stock Alert",
        type: "products",
        description: "Products with low inventory requiring restocking",
        formats: ["pdf", "xlsx"],
        fields: ["Product Name", "SKU", "Current Stock", "Status"],
        columns: [
            { header: "Product Name", key: "name", width: 40 },
            { header: "SKU", key: "sku", width: 22 },
            { header: "Current Stock", key: "quantity", format: "number" as const, align: "center" as const, width: 20 },
            { header: "Status", key: "stockStatus", width: 18 },
        ],
        icon: AlertTriangle,
        iconBg: "bg-amber-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("stockStatus", "low_stock");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/products",
                params,
                (p: any) => ({
                    name: p.name,
                    sku: p.sku || "—",
                    quantity: p.quantity ?? 0,
                    stockStatus: p.stockStatus || "low_stock",
                })
            );

            const summary = [
                { label: "Low Stock Products", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "out-of-stock",
        name: "Out of Stock Products",
        type: "products",
        description: "Products that need immediate restocking",
        formats: ["pdf", "xlsx"],
        fields: ["Product Name", "SKU", "Category", "Price"],
        columns: [
            { header: "Product Name", key: "name", width: 35 },
            { header: "SKU", key: "sku", width: 18 },
            { header: "Category", key: "categoryName", width: 22 },
            { header: "Price", key: "price", format: "currency" as const, align: "right" as const, width: 15 },
        ],
        icon: Ban,
        iconBg: "bg-rose-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("stockStatus", "out_of_stock");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/products",
                params,
                (p: any) => ({
                    name: p.name,
                    sku: p.sku || "—",
                    categoryName: (p.categoryNames || []).join(", ") || "—",
                    price: Number(p.price || 0),
                })
            );

            const summary = [
                { label: "Out of Stock", value: items.length, format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "featured-products",
        name: "Featured Products",
        type: "products",
        description: "Products marked as featured for promotions",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Product Name", "SKU", "Price", "Status", "Stock"],
        columns: ADMIN_EXPORT_COLUMNS.products.all,
        icon: Star,
        iconBg: "bg-yellow-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("isFeatured", "true");
            params.set("sort", "createdAt.desc");

            const items = await fetchAllPages(
                "/api/v1/products",
                params,
                (p: any) => ({
                    name: p.name,
                    sku: p.sku || "—",
                    categoryName: (p.categoryNames || []).join(", ") || "—",
                    price: Number(p.price || 0),
                    status: p.status,
                    stock: p.quantity ?? 0,
                    sold: p.sold ?? 0,
                })
            );

            const summary = [
                { label: "Featured Products", value: items.length, format: "number" as const },
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

export default function ProductsExportPage() {
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof productExports)[0]) => {
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
                    <Link href="/dashboard/products">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Products Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate product catalogs and inventory reports
                        </p>
                    </div>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {productExports.map((config) => {
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
                    <CardTitle className="text-sm font-medium">About Product Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional branded catalog with logo and summary
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets for inventory management
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
