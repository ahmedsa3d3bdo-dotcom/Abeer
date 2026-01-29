"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import {
    Download,
    Target,
    Percent,
    Tag,
    DollarSign,
    TrendingUp,
    Gift,
    Ticket,
    Calendar,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
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

interface MarketingData {
    summary: {
        totalDiscounts: number;
        activeDiscounts: number;
        totalSavings: number;
        totalUses: number;
        averageDiscountPerOrder: number;
    };
    topDiscounts: Array<{
        id: string;
        name: string;
        type: string;
        uses: number;
        savings: number;
        status: string;
    }>;
    discountUsageOverTime: Array<{ date: string; uses: number; savings: number }>;
    discountsByType: Array<{ type: string; count: number; savings: number }>;
    discountsByStatus: Array<{ status: string; count: number }>;
    recentCampaigns: Array<{
        id: string;
        name: string;
        sent: number;
        opened: number;
        clicked: number;
        date: string;
    }>;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const TYPE_COLORS: Record<string, string> = {
    percentage: "#10b981",
    fixed_amount: "#3b82f6",
    free_shipping: "#f59e0b",
    bxgy: "#8b5cf6",
};
const TYPE_LABELS: Record<string, string> = {
    percentage: "Percentage Off",
    fixed_amount: "Fixed Amount",
    free_shipping: "Free Shipping",
    bxgy: "Buy X Get Y",
};
const TYPE_ICONS: Record<string, React.ElementType> = {
    percentage: Percent,
    fixed_amount: DollarSign,
    free_shipping: Gift,
    bxgy: Tag,
};

export default function MarketingAnalyticsPage() {
    const [data, setData] = useState<MarketingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30d");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/v1/analytics/marketing?range=${dateRange}`)
            .then((res) => res.json())
            .then((json) => {
                if (json.success) {
                    setData(json.data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [dateRange]);

    const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

    if (loading) {
        return <MarketingAnalyticsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Failed to load marketing data</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Marketing & Discounts</h2>
                    <p className="text-sm text-muted-foreground">
                        Track discount performance and campaign effectiveness
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
                    <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Tag className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.totalDiscounts}</p>
                                <p className="text-xs text-muted-foreground">Total Discounts</p>
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
                                <p className="text-2xl font-bold">{data.summary.activeDiscounts}</p>
                                <p className="text-xs text-muted-foreground">Active Now</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <Ticket className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.totalUses.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Uses</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <DollarSign className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{fmt(data.summary.totalSavings)}</p>
                                <p className="text-xs text-muted-foreground">Total Savings</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-pink-500/10">
                                <Percent className="h-5 w-5 text-pink-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{fmt(data.summary.averageDiscountPerOrder)}</p>
                                <p className="text-xs text-muted-foreground">Avg per Order</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Discount Usage Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Discount Usage Over Time</CardTitle>
                    <CardDescription>Track how discounts are being used</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.discountUsageOverTime}>
                                <defs>
                                    <linearGradient id="colorUses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
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
                                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    labelFormatter={(label) =>
                                        new Date(label).toLocaleDateString("en-CA", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }
                                    formatter={(value: number, name: string) => [
                                        name === "savings" ? fmt(value) : value,
                                        name.charAt(0).toUpperCase() + name.slice(1),
                                    ]}
                                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Legend />
                                <Area
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="uses"
                                    name="Uses"
                                    stroke="#8b5cf6"
                                    fill="url(#colorUses)"
                                    strokeWidth={2}
                                />
                                <Area
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="savings"
                                    name="Savings"
                                    stroke="#10b981"
                                    fill="url(#colorSavings)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="discounts" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                    <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                </TabsList>

                <TabsContent value="discounts" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Top Discounts Table */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Top Performing Discounts</CardTitle>
                                <CardDescription>Discounts ranked by usage and savings</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Discount</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Uses</TableHead>
                                            <TableHead className="text-right">Savings</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.topDiscounts.map((discount) => {
                                            const TypeIcon = TYPE_ICONS[discount.type] || Tag;
                                            return (
                                                <TableRow key={discount.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div
                                                                className="p-1.5 rounded"
                                                                style={{ backgroundColor: `${TYPE_COLORS[discount.type] || "#6b7280"}20` }}
                                                            >
                                                                <TypeIcon
                                                                    className="h-4 w-4"
                                                                    style={{ color: TYPE_COLORS[discount.type] || "#6b7280" }}
                                                                />
                                                            </div>
                                                            <span className="font-medium">{discount.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {TYPE_LABELS[discount.type] || discount.type}
                                                    </TableCell>
                                                    <TableCell className="text-right">{discount.uses.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right font-medium text-emerald-600">
                                                        {discount.savings > 0 ? fmt(discount.savings) : "Tracking started"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={discount.status === "active" ? "default" : "secondary"}
                                                            className="capitalize"
                                                        >
                                                            {discount.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Discounts by Type */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Discounts by Type</CardTitle>
                                <CardDescription>Distribution of discount types</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.discountsByType}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="count"
                                                nameKey="type"
                                                label={({ type, percent }) =>
                                                    `${TYPE_LABELS[type] || type}: ${(percent * 100).toFixed(0)}%`
                                                }
                                            >
                                                {data.discountsByType.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={TYPE_COLORS[entry.type] || COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => [value.toLocaleString(), "Discounts"]}
                                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Savings by Type */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Savings by Type</CardTitle>
                                <CardDescription>Total value saved per discount type</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.discountsByType} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis type="number" tickFormatter={(value) => fmt(value)} tick={{ fontSize: 11 }} />
                                            <YAxis
                                                dataKey="type"
                                                type="category"
                                                width={100}
                                                tick={{ fontSize: 11 }}
                                                tickFormatter={(value) => TYPE_LABELS[value] || value}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => [fmt(value), "Savings"]}
                                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                            />
                                            <Bar dataKey="savings" fill="#10b981" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Email Campaigns</CardTitle>
                            <CardDescription>Newsletter and promotional email performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data.recentCampaigns.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                                    <p>No campaigns sent yet</p>
                                    <p className="text-sm mt-1">Start sending newsletters to track performance</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Campaign</TableHead>
                                            <TableHead className="text-right">Sent</TableHead>
                                            <TableHead className="text-right">Opened</TableHead>
                                            <TableHead className="text-right">Open Rate</TableHead>
                                            <TableHead className="text-right">Clicked</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recentCampaigns.map((campaign) => {
                                            const openRate = campaign.sent > 0 ? (campaign.opened / campaign.sent) * 100 : 0;
                                            return (
                                                <TableRow key={campaign.id}>
                                                    <TableCell className="font-medium">{campaign.name}</TableCell>
                                                    <TableCell className="text-right">{campaign.sent.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">{campaign.opened.toLocaleString()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Badge variant={openRate >= 20 ? "default" : "secondary"}>
                                                            {openRate.toFixed(1)}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{campaign.clicked.toLocaleString()}</TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {new Date(campaign.date).toLocaleDateString("en-CA", {
                                                            month: "short",
                                                            day: "numeric",
                                                        })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function MarketingAnalyticsSkeleton() {
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
