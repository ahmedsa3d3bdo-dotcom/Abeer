"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Download, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Percent, Loader2 } from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAnalyticsExport, type AnalyticsExportConfig } from "@/hooks/use-analytics-export";
import { exportChartAsPNG } from "@/lib/reports/simple-chart-export";

interface SalesData {
    summary: {
        totalRevenue: number;
        totalOrders: number;
        averageOrderValue: number;
        totalProfit: number;
        profitMargin: number;
        conversionRate: number;
        previousRevenue: number;
        previousOrders: number;
    };
    revenueByDay: Array<{ date: string; revenue: number; orders: number; profit: number }>;
    ordersByStatus: Array<{ status: string; count: number; percentage: number }>;
    revenueByPayment: Array<{ method: string; amount: number; count: number }>;
    topProducts: Array<{ 
        id: string; 
        name: string; 
        revenue: number; 
        units: number;
        cost: number;
        profit: number;
        profitMargin: number;
    }>;
    salesByHour: Array<{ hour: number; orders: number; revenue: number }>;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const STATUS_COLORS: Record<string, string> = {
    pending: "#f59e0b",
    processing: "#3b82f6",
    shipped: "#8b5cf6",
    delivered: "#10b981",
    cancelled: "#ef4444",
    refunded: "#6b7280",
};

export default function SalesAnalyticsPage() {
    const [data, setData] = useState<SalesData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30d");

    const { exportData, isExporting } = useAnalyticsExport({
        onSuccess: (filename) => toast.success(`Report downloaded: ${filename}`),
        onError: (error) => toast.error(`Export failed: ${error.message}`),
    });

    useEffect(() => {
        setLoading(true);
        fetch(`/api/v1/analytics/sales?range=${dateRange}`)
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
                id: "sales",
                name: "Sales Analytics",
                type: "sales",
                description: "Track revenue, orders, and payment trends",
                formats: ["pdf", "xlsx"],
                fetchData: async () => ({
                    summary: [
                        { label: "Total Revenue", value: data.summary.totalRevenue, format: "currency", color: "emerald" },
                        { label: "Total Profit", value: data.summary.totalProfit, format: "currency", color: "blue" },
                        { label: "Profit Margin", value: data.summary.profitMargin, format: "percentage", color: "purple" },
                        { label: "Total Orders", value: data.summary.totalOrders, format: "number", color: "amber" },
                        { label: "Average Order Value", value: data.summary.averageOrderValue, format: "currency", color: "indigo" },
                        { label: "Conversion Rate", value: data.summary.conversionRate, format: "percentage", color: "pink" },
                    ],
                    charts: [],
                tables: [
                    {
                        title: "Revenue Trend",
                        columns: [
                            { header: "Date", key: "date", width: 20 },
                            { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 20 },
                            { header: "Orders", key: "orders", format: "number", align: "right", width: 15 },
                            { header: "Profit", key: "profit", format: "currency", align: "right", width: 20 },
                        ],
                        data: data.revenueByDay.map((d) => ({
                            date: new Date(d.date).toLocaleDateString("en-CA"),
                            revenue: d.revenue,
                            orders: d.orders,
                            profit: d.profit,
                        })),
                    },
                    {
                        title: "Top Selling Products",
                        columns: [
                            { header: "Rank", key: "rank", width: 10, align: "center" },
                            { header: "Product", key: "name", width: 25 },
                            { header: "Units", key: "units", format: "number", align: "right", width: 12 },
                            { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 15 },
                            { header: "Cost", key: "cost", format: "currency", align: "right", width: 15 },
                            { header: "Profit", key: "profit", format: "currency", align: "right", width: 15 },
                            { header: "Margin %", key: "profitMargin", format: "percentage", align: "right", width: 12 },
                        ],
                        data: data.topProducts.map((p, i) => ({
                            rank: i + 1,
                            name: p.name,
                            units: p.units,
                            revenue: p.revenue,
                            cost: p.cost,
                            profit: p.profit,
                            profitMargin: p.profitMargin,
                        })),
                    },
                    {
                        title: "Orders by Status",
                        columns: [
                            { header: "Status", key: "status", width: 30 },
                            { header: "Count", key: "count", format: "number", align: "center", width: 20 },
                            { header: "Percentage", key: "percentage", format: "percentage", align: "right", width: 20 },
                        ],
                        data: data.ordersByStatus,
                    },
                    {
                        title: "Revenue by Payment Method",
                        columns: [
                            { header: "Method", key: "method", width: 30 },
                            { header: "Count", key: "count", format: "number", align: "center", width: 20 },
                            { header: "Amount", key: "amount", format: "currency", align: "right", width: 25 },
                        ],
                        data: data.revenueByPayment,
                    },
                    {
                        title: "Sales by Hour",
                        columns: [
                            { header: "Hour", key: "hour", width: 20 },
                            { header: "Orders", key: "orders", format: "number", align: "right", width: 20 },
                            { header: "Revenue", key: "revenue", format: "currency", align: "right", width: 25 },
                        ],
                        data: data.salesByHour.map((h) => ({
                            hour: `${h.hour}:00`,
                            orders: h.orders,
                            revenue: h.revenue,
                        })),
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

    const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

    if (loading) {
        return <SalesAnalyticsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Failed to load sales data</p>
            </div>
        );
    }

    const revenueChange = calculateChange(data.summary.totalRevenue, data.summary.previousRevenue);
    const ordersChange = calculateChange(data.summary.totalOrders, data.summary.previousOrders);

    return (
        <div className="flex flex-col gap-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Sales Performance</h2>
                    <p className="text-sm text-muted-foreground">Track revenue, orders, and payment trends</p>
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
                <KPICard
                    title="Total Revenue"
                    value={fmt(data.summary.totalRevenue)}
                    change={revenueChange}
                    icon={DollarSign}
                    color="emerald"
                />
                <KPICard
                    title="Total Profit"
                    value={fmt(data.summary.totalProfit)}
                    icon={TrendingUp}
                    color="blue"
                />
                <KPICard
                    title="Profit Margin"
                    value={`${data.summary.profitMargin.toFixed(1)}%`}
                    icon={Percent}
                    color="purple"
                />
                <KPICard
                    title="Total Orders"
                    value={data.summary.totalOrders.toLocaleString()}
                    change={ordersChange}
                    icon={ShoppingCart}
                    color="amber"
                />
                <KPICard
                    title="Avg Order Value"
                    value={fmt(data.summary.averageOrderValue)}
                    icon={CreditCard}
                    color="indigo"
                />
            </div>

            {/* Revenue Trend Chart */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Revenue & Orders Trend</CardTitle>
                            <CardDescription>Daily breakdown of sales performance</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await exportChartAsPNG("sales-revenue-chart", "sales-revenue-trend");
                                    toast.success("Chart exported successfully");
                                } catch (error) {
                                    toast.error("Failed to export chart");
                                }
                            }}
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export Chart
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div id="sales-revenue-chart" className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.revenueByDay}>
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
                                    }}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                    formatter={(value: number, name: string) => [
                                        name === "orders" ? value : fmt(value),
                                        name.charAt(0).toUpperCase() + name.slice(1),
                                    ]}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString("en-CA", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric"
                                    })}
                                />
                                <Legend />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    fill="url(#colorRevenue)"
                                    strokeWidth={2}
                                    name="Revenue"
                                />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="profit"
                                    stroke="#3b82f6"
                                    fill="url(#colorProfit)"
                                    strokeWidth={2}
                                    name="Profit"
                                />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={false}
                                    name="Orders"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Orders Section */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Orders by Status */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Orders by Status</CardTitle>
                                <CardDescription>Distribution of order statuses</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                    try {
                                        await exportChartAsPNG("sales-orders-status-chart", "orders-by-status");
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
                        <div id="sales-orders-status-chart" className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.ordersByStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={2}
                                        dataKey="count"
                                        nameKey="status"
                                        label={({ status, percentage }) => {
                                            const pct = percentage.toFixed(0);
                                            return parseFloat(pct) > 3 ? `${status}: ${pct}%` : '';
                                        }}
                                        labelLine={false}
                                    >
                                        {data.ordersByStatus.map((entry, index) => (
                                            <Cell
                                                key={`order-status-${entry.status}-${index}`}
                                                fill={STATUS_COLORS[entry.status] || COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [value.toLocaleString(), name]}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top Selling Products</CardTitle>
                        <CardDescription>Products by revenue and profit margin</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {data.topProducts.slice(0, 5).map((product, index) => (
                                <div key={`top-product-${product.id}-${index}`} className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {product.units} units • {product.profitMargin.toFixed(1)}% margin
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-emerald-600">{fmt(product.revenue)}</p>
                                        <p className="text-xs text-blue-600">{fmt(product.profit)} profit</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Methods */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Revenue by Payment Method</CardTitle>
                            <CardDescription>How customers are paying for orders</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await exportChartAsPNG("sales-payment-chart", "revenue-by-payment-method");
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
                    <div id="sales-payment-chart" className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.revenueByPayment} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis type="number" tickFormatter={(value) => fmt(value)} />
                                <YAxis dataKey="method" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number) => [fmt(value), "Revenue"]}
                                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Bar dataKey="amount" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Sales Timing */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Sales by Hour of Day</CardTitle>
                            <CardDescription>When customers are most active</CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    await exportChartAsPNG("sales-timing-chart", "sales-by-hour");
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
                    <div id="sales-timing-chart" className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.salesByHour}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="hour"
                                    tickFormatter={(hour) => `${hour}:00`}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: number, name: string) => [
                                        name === "revenue" ? fmt(value) : value,
                                        name.charAt(0).toUpperCase() + name.slice(1),
                                    ]}
                                    labelFormatter={(hour) => `${hour}:00 - ${hour}:59`}
                                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Bar dataKey="orders" fill="#10b981" name="Orders" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function KPICard({
    title,
    value,
    change,
    icon: Icon,
    color,
}: {
    title: string;
    value: string;
    change?: number;
    icon: React.ElementType;
    color: "emerald" | "blue" | "purple" | "amber" | "indigo";
}) {
    const colorClasses = {
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    {change !== undefined && (
                        <Badge variant={change >= 0 ? "default" : "destructive"} className="gap-1">
                            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {Math.abs(change).toFixed(1)}%
                        </Badge>
                    )}
                </div>
                <div className="mt-4">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{title}</p>
                </div>
            </CardContent>
        </Card>
    );
}

function SalesAnalyticsSkeleton() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between">
                <div>
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-4 w-60 mt-2" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <Skeleton className="h-10 w-10 rounded-lg" />
                            <Skeleton className="h-8 w-24 mt-4" />
                            <Skeleton className="h-4 w-20 mt-2" />
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
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
