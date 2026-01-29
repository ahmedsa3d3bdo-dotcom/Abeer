"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
    Download,
    FileText,
    ShoppingCart,
    CalendarIcon,
    Loader2,
    Check,
    FileSpreadsheet,
    FileCode,
    Users,
    TrendingUp,
    CreditCard,
    Package,
    ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAdminExport, type ExportFormat, type AdminExportConfig, ADMIN_EXPORT_COLUMNS } from "@/hooks/use-admin-export";
import { toast } from "sonner";
import Link from "next/link";

// Helper function to fetch all pages of data
async function fetchAllPages<T>(
    baseUrl: string,
    params: URLSearchParams,
    mapFn: (item: any) => T,
    maxPages = 20 // Safety limit
): Promise<T[]> {
    const allItems: T[] = [];
    let page = 1;
    let hasMore = true;

    // Use a reasonable page size
    params.set("limit", "100");

    while (hasMore && page <= maxPages) {
        params.set("page", String(page));
        const res = await fetch(`${baseUrl}?${params.toString()}`);
        const data = await res.json();

        const items = data.data?.items || [];
        const total = data.data?.total || 0;

        allItems.push(...items.map(mapFn));

        // Check if there are more pages
        hasMore = allItems.length < total && items.length > 0;
        page++;
    }

    return allItems;
}

// Available order exports
const orderExports: Array<AdminExportConfig & { icon: any; iconBg: string }> = [
    {
        id: "all-orders",
        name: "All Orders Export",
        type: "orders",
        description: "Complete list of all orders with customer and payment details",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Order #", "Date", "Customer", "Status", "Payment", "Total"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: ShoppingCart,
        iconBg: "bg-blue-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            // Fetch metrics separately (doesn't need pagination)
            const metricsParams = new URLSearchParams();
            if (dateRange?.from) metricsParams.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) metricsParams.set("dateTo", dateRange.to.toISOString().split("T")[0]);
            const metricsRes = await fetch(`/api/v1/orders/metrics?${metricsParams.toString()}`);
            const metricsData = await metricsRes.json();

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const metrics = metricsData.data || {};
            const summary = [
                { label: "Total Orders", value: metrics.totalOrders ?? items.length, format: "number" as const },
                { label: "Total Revenue", value: Number(metrics.revenueTotal ?? 0), format: "currency" as const },
                { label: "Avg Order Value", value: Number(metrics.avgOrderValue ?? 0), format: "currency" as const },
                { label: "Paid Orders", value: Number(metrics.paidOrders ?? 0), format: "number" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "pending-orders",
        name: "Pending Orders",
        type: "orders",
        description: "Orders awaiting processing or shipment",
        formats: ["pdf", "xlsx"],
        fields: ["Order #", "Date", "Customer", "Payment Status", "Total"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: Package,
        iconBg: "bg-amber-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("status", "pending");
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const totalValue = items.reduce((acc, o) => acc + o.totalAmount, 0);
            const summary = [
                { label: "Pending Orders", value: items.length, format: "number" as const },
                { label: "Total Value", value: totalValue, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "paid-orders",
        name: "Paid Orders",
        type: "orders",
        description: "Successfully paid orders for accounting",
        formats: ["pdf", "xlsx", "csv"],
        fields: ["Order #", "Date", "Customer", "Total", "Payment Method"],
        columns: ADMIN_EXPORT_COLUMNS.orders.all,
        icon: CreditCard,
        iconBg: "bg-emerald-500/10",
        fetchData: async (dateRange) => {
            const params = new URLSearchParams();
            params.set("paymentStatus", "paid");
            params.set("sort", "createdAt.desc");
            if (dateRange?.from) params.set("dateFrom", dateRange.from.toISOString().split("T")[0]);
            if (dateRange?.to) params.set("dateTo", dateRange.to.toISOString().split("T")[0]);

            const items = await fetchAllPages(
                "/api/v1/orders",
                params,
                (o: any) => ({
                    orderNumber: o.orderNumber,
                    createdAt: o.createdAt,
                    customerName: `${o.customerFirstName || ""} ${o.customerLastName || ""}`.trim() || o.customerEmail || "—",
                    customerEmail: o.customerEmail || "—",
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                })
            );

            const totalRevenue = items.reduce((acc, o) => acc + o.totalAmount, 0);
            const avgOrder = items.length > 0 ? totalRevenue / items.length : 0;

            const summary = [
                { label: "Paid Orders", value: items.length, format: "number" as const },
                { label: "Total Revenue", value: totalRevenue, format: "currency" as const },
                { label: "Avg Order Value", value: avgOrder, format: "currency" as const },
            ];

            return { items, summary };
        },
    },
    {
        id: "orders-by-customer",
        name: "Orders by Customer",
        type: "orders",
        description: "Order summary grouped by customer",
        formats: ["xlsx", "csv"],
        fields: ["Customer", "Email", "Order Count", "Total Spent", "Last Order"],
        columns: [
            { header: "Customer", key: "name", width: 25 },
            { header: "Email", key: "email", width: 28 },
            { header: "Orders", key: "orderCount", format: "number" as const, align: "center" as const, width: 12 },
            { header: "Total Spent", key: "totalSpent", format: "currency" as const, align: "right" as const, width: 18 },
            { header: "Last Order", key: "lastOrderDate", format: "date" as const, width: 15 },
        ],
        icon: Users,
        iconBg: "bg-violet-500/10",
        fetchData: async () => {
            const params = new URLSearchParams();
            params.set("sort", "totalSpent.desc");

            const items = await fetchAllPages(
                "/api/v1/customers",
                params,
                (c: any) => ({
                    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email,
                    email: c.email,
                    orderCount: c.ordersCount || 0,
                    totalSpent: Number(c.totalSpent || 0),
                    lastOrderDate: c.lastOrderAt,
                })
            );

            const filteredItems = items.filter((c) => c.orderCount > 0);
            const totalCustomers = filteredItems.length;
            const totalOrders = filteredItems.reduce((acc, c) => acc + c.orderCount, 0);
            const totalRevenue = filteredItems.reduce((acc, c) => acc + c.totalSpent, 0);

            const summary = [
                { label: "Customers with Orders", value: totalCustomers, format: "number" as const },
                { label: "Total Orders", value: totalOrders, format: "number" as const },
                { label: "Total Revenue", value: totalRevenue, format: "currency" as const },
            ];

            return { items: filteredItems, summary };
        },
    },
];

const formatIcons: Record<string, any> = {
    pdf: FileText,
    xlsx: FileSpreadsheet,
    csv: FileCode,
};

export default function OrdersExportPage() {
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date(),
    });
    const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({});

    const { exportData, isExporting, progress, currentExport } = useAdminExport({
        onSuccess: (filename) => {
            toast.success(`Report downloaded: ${filename}`);
        },
        onError: (error) => {
            toast.error(`Failed to generate report: ${error.message}`);
        },
    });

    const handleExport = async (config: (typeof orderExports)[0]) => {
        const format = selectedFormats[config.id] || config.formats[0];
        await exportData(config, format, dateRange);
    };

    const getSelectedFormat = (exportId: string, defaultFormats: ExportFormat[]): ExportFormat => {
        return selectedFormats[exportId] || defaultFormats[0];
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/orders">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h2 className="text-lg font-semibold">Orders Export</h2>
                        <p className="text-sm text-muted-foreground">
                            Generate professional order reports and data exports
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="range"
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => {
                                    if (range?.from && range?.to) {
                                        setDateRange({ from: range.from, to: range.to });
                                    }
                                }}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Export Options Grid */}
            <div className="grid gap-4">
                {orderExports.map((config) => {
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
                    <CardTitle className="text-sm font-medium">About Order Exports</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-muted-foreground space-y-1">
                        <li>
                            • <strong>PDF</strong> - Professional branded reports with logo and summary cards
                        </li>
                        <li>
                            • <strong>XLSX</strong> - Excel spreadsheets with formatted tables and styling
                        </li>
                        <li>
                            • <strong>CSV</strong> - Raw data exports for custom analysis and integrations
                        </li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
