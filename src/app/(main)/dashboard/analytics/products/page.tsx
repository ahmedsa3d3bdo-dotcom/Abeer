"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import {
    Download,
    Package,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Layers,
    Loader2,
} from "lucide-react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAnalyticsExport, type AnalyticsExportConfig } from "@/hooks/use-analytics-export";
import { exportChartAsPNG } from "@/lib/reports/simple-chart-export";

interface ProductsData {
    summary: {
        totalProducts: number;
        activeProducts: number;
        lowStockProducts: number;
        outOfStockProducts: number;
        totalInventoryValue: number;
    };
    topProducts: Array<{
        id: string;
        name: string;
        sku: string;
        revenue: number;
        units: number;
        views: number;
        conversionRate: number;
    }>;
    bottomProducts: Array<{
        id: string;
        name: string;
        sku: string;
        revenue: number;
        units: number;
    }>;
    categoryPerformance: Array<{
        id: string;
        name: string;
        revenue: number;
        units: number;
        products: number;
    }>;
    lowStockItems: Array<{
        id: string;
        name: string;
        sku: string;
        stock: number;
        reorderPoint: number;
    }>;
    inventoryTurnover: Array<{
        category: string;
        turnover: number;
        avgDaysToSell: number;
    }>;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function ProductsAnalyticsPage() {
    const [data, setData] = useState<ProductsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30d");

    const { exportData, isExporting } = useAnalyticsExport({
        onSuccess: (filename) => toast.success(`Report downloaded: ${filename}`),
        onError: (error) => toast.error(`Export failed: ${error.message}`),
    });

    useEffect(() => {
        setLoading(true);
        fetch(`/api/v1/analytics/products?range=${dateRange}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setData(json.data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [dateRange]);

    const handleExport = async (format: "pdf" | "xlsx") => {
        if (!data) return;

        try {
            const config: AnalyticsExportConfig = {
                id: "products",
                name: "Products Analytics",
                type: "products",
                description: "Analyze product sales, inventory, and category trends",
                formats: ["pdf", "xlsx"],
                fetchData: async () => ({
                    summary: [
                        { label: "Total Products", value: data.summary.totalProducts, format: "number", color: "blue" },
                        { label: "Active Products", value: data.summary.activeProducts, format: "number", color: "emerald" },
                        { label: "Low Stock", value: data.summary.lowStockProducts, format: "number", color: "amber" },
                        { label: "Out of Stock", value: data.summary.outOfStockProducts, format: "number", color: "red" },
                        { label: "Inventory Value", value: data.summary.totalInventoryValue, format: "currency", color: "purple" },
                    ],
                    charts: [],
                tables: [
                    {
                        title: "Top Selling Products",
                        columns: [
                            { header: "Rank", key: "rank", width: 10, align: "center" },
                            { header: "Product", key: "name", width: 30 },
                            { header: "SKU", key: "sku", width: 15 },
                            { header: "Units", key: "units", format: "number", align: "right", width: 12 },
                            { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 18 },
                        ],
                        data: data.topProducts.map((p, i) => ({
                            rank: i + 1,
                            name: p.name,
                            sku: p.sku,
                            units: p.units,
                            revenue: p.revenue,
                        })),
                    },
                    {
                        title: "Category Performance",
                        columns: [
                            { header: "Category", key: "name", width: 30 },
                            { header: "Products", key: "products", format: "number", align: "center", width: 15 },
                            { header: "Units Sold", key: "units", format: "number", align: "right", width: 15 },
                            { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 20 },
                        ],
                        data: data.categoryPerformance,
                    },
                    {
                        title: "Low Stock Items",
                        columns: [
                            { header: "Product", key: "name", width: 35 },
                            { header: "SKU", key: "sku", width: 20 },
                            { header: "Stock", key: "stock", format: "number", align: "right", width: 15 },
                            { header: "Reorder Point", key: "reorderPoint", format: "number", align: "right", width: 15 },
                        ],
                        data: data.lowStockItems,
                    },
                ],
            }),
        };

        await exportData(config, format, dateRange);
    } catch (error) {
        console.error("Export failed:", error);
        toast.error("Failed to export report");
    }
};

    const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

    if (loading) {
        return <ProductsAnalyticsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Failed to load products data</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Product Performance</h2>
                    <p className="text-sm text-muted-foreground">
                        Analyze product sales, inventory, and category trends
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                            <SelectItem value="365d">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExport("pdf")}
                        disabled={isExporting || loading}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.totalProducts}</p>
                                <p className="text-xs text-muted-foreground">Total Products</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.activeProducts}</p>
                                <p className="text-xs text-muted-foreground">Active Products</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.lowStockProducts}</p>
                                <p className="text-xs text-muted-foreground">Low Stock</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-500/10">
                                <TrendingDown className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.outOfStockProducts}</p>
                                <p className="text-xs text-muted-foreground">Out of Stock</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Layers className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{fmt(data.summary.totalInventoryValue)}</p>
                                <p className="text-xs text-muted-foreground">Inventory Value</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Products Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Products ranked by revenue contribution</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead className="text-right">Units</TableHead>
                                <TableHead className="text-right">Revenue</TableHead>
                                <TableHead className="text-right">Share</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.topProducts.map((product, index) => {
                                const totalRevenue = data.topProducts.reduce((s, p) => s + p.revenue, 0);
                                const share = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
                                return (
                                    <TableRow key={`product-row-${product.id}-${index}`}>
                                        <TableCell>
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                                {index + 1}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.sku}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{product.units.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium text-emerald-600">
                                            {fmt(product.revenue)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Progress value={share} className="w-16 h-2" />
                                                <span className="text-xs text-muted-foreground w-10">
                                                    {share.toFixed(1)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Performance and Inventory */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Bottom Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Underperforming Products</CardTitle>
                        <CardDescription>Products with lowest sales</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.bottomProducts.slice(0, 5).map((product, index) => (
                                <div key={`bottom-product-${product.id}-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                    <div>
                                        <p className="font-medium text-sm">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">{product.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium">{product.units} units</p>
                                        <p className="text-xs text-muted-foreground">{fmt(product.revenue)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Product Performance Chart */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Revenue vs Units</CardTitle>
                                <CardDescription>Top 10 products comparison</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        await exportChartAsPNG("products-performance-chart", "product-performance");
                                        toast.success("Chart exported successfully");
                                    } catch (error) {
                                        toast.error("Failed to export chart");
                                    }
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div id="products-performance-chart" className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.topProducts.slice(0, 8)} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                    <XAxis type="number" tick={{ fontSize: 11 }} />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={100}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value) => value.length > 12 ? `${value.slice(0, 12)}...` : value}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            name === "revenue" ? fmt(value) : value,
                                            name.charAt(0).toUpperCase() + name.slice(1),
                                        ]}
                                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                    />
                                    <Bar dataKey="units" fill="#3b82f6" name="Units" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Inventory Section */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Low Stock Alerts */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Low Stock Alerts</CardTitle>
                                <CardDescription>Products below reorder point</CardDescription>
                            </div>
                            <Badge variant="destructive">{data.lowStockItems.length} items</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {data.lowStockItems.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No low stock items 🎉
                                </p>
                            ) : (
                                data.lowStockItems.slice(0, 8).map((item, index) => (
                                    <div
                                        key={`low-stock-${item.id}-${index}`}
                                        className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{item.name}</p>
                                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-amber-600">{item.stock} left</p>
                                            <p className="text-xs text-muted-foreground">
                                                Reorder at {item.reorderPoint}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Inventory Turnover */}
                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Turnover by Category</CardTitle>
                        <CardDescription>How fast inventory sells</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.inventoryTurnover.map((cat) => (
                                <div key={cat.category} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{cat.category}</span>
                                        <span className="text-sm text-muted-foreground">
                                            {cat.avgDaysToSell} days avg
                                        </span>
                                    </div>
                                    <Progress value={Math.min(cat.turnover * 10, 100)} className="h-2" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Section */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Category Revenue Pie */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Revenue by Category</CardTitle>
                                <CardDescription>Category contribution to total revenue</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        await exportChartAsPNG("products-category-pie-chart", "revenue-by-category");
                                        toast.success("Chart exported successfully");
                                    } catch (error) {
                                        toast.error("Failed to export chart");
                                    }
                                }}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div id="products-category-pie-chart" className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.categoryPerformance}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={110}
                                        paddingAngle={2}
                                        dataKey="revenue"
                                        nameKey="name"
                                        label={({ name, percent }) => {
                                            const pct = (percent * 100).toFixed(0);
                                            if (parseFloat(pct) <= 3) return '';
                                            const displayName = name.length > 10 ? name.slice(0, 10) + "..." : name;
                                            return `${displayName}: ${pct}%`;
                                        }}
                                        labelLine={false}
                                    >
                                        {data.categoryPerformance.map((cat, index) => (
                                            <Cell key={`category-${cat.id}-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number) => [fmt(value), "Revenue"]}
                                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Category Performance</CardTitle>
                        <CardDescription>Detailed category breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Products</TableHead>
                                    <TableHead className="text-right">Units</TableHead>
                                    <TableHead className="text-right">Revenue</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.categoryPerformance.map((cat, index) => (
                                    <TableRow key={`category-row-${cat.id}-${index}`}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-3 w-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                {cat.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">{cat.products}</TableCell>
                                        <TableCell className="text-right">{cat.units.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-medium">{fmt(cat.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ProductsAnalyticsSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between">
                <div>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-5">
                            <Skeleton className="h-12 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[300px] w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
