"use client";

import { useState, useEffect } from "react";
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
    Users,
    UserPlus,
    UserCheck,
    Repeat,
    DollarSign,
    TrendingUp,
    TrendingDown,
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

interface CustomersData {
    summary: {
        totalCustomers: number;
        newCustomers: number;
        returningCustomers: number;
        averageLifetimeValue: number;
        repeatPurchaseRate: number;
        previousNewCustomers: number;
    };
    customerGrowth: Array<{ date: string; new: number; returning: number; total: number }>;
    topCustomers: Array<{
        id: string;
        name: string;
        email: string;
        orders: number;
        totalSpent: number;
        lastOrder: string;
    }>;
    customersByValue: Array<{ tier: string; count: number; revenue: number }>;
    purchaseFrequency: Array<{ range: string; count: number }>;
    geographicDistribution: Array<{ region: string; count: number; percentage: number }>;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const TIER_COLORS: Record<string, string> = {
    VIP: "#fbbf24",
    Gold: "#f59e0b",
    Silver: "#9ca3af",
    Bronze: "#c29c73",
    Standard: "#64748b",
};

export default function CustomersAnalyticsPage() {
    const [data, setData] = useState<CustomersData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30d");

    useEffect(() => {
        setLoading(true);
        fetch(`/api/v1/analytics/customers?range=${dateRange}`)
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
        return <CustomersAnalyticsSkeleton />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Failed to load customer data</p>
            </div>
        );
    }

    const newCustomerChange =
        data.summary.previousNewCustomers > 0
            ? ((data.summary.newCustomers - data.summary.previousNewCustomers) / data.summary.previousNewCustomers) * 100
            : 0;

    return (
        <div className="flex flex-col gap-6">
            {/* Header with filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold">Customer Analytics</h2>
                    <p className="text-sm text-muted-foreground">
                        Understand your customers and their behavior
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
                            <div className="p-2 rounded-lg bg-blue-500/10">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.totalCustomers.toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">Total Customers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10">
                                    <UserPlus className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{data.summary.newCustomers}</p>
                                    <p className="text-xs text-muted-foreground">New Customers</p>
                                </div>
                            </div>
                            {newCustomerChange !== 0 && (
                                <Badge variant={newCustomerChange >= 0 ? "default" : "destructive"} className="gap-1 h-5">
                                    {newCustomerChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {Math.abs(newCustomerChange).toFixed(0)}%
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/10">
                                <Repeat className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.repeatPurchaseRate.toFixed(0)}%</p>
                                <p className="text-xs text-muted-foreground">Repeat Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10">
                                <UserCheck className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{data.summary.returningCustomers}</p>
                                <p className="text-xs text-muted-foreground">Returning</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-500/10">
                                <DollarSign className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{fmt(data.summary.averageLifetimeValue)}</p>
                                <p className="text-xs text-muted-foreground">Avg LTV</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Customer Growth Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Customer Growth</CardTitle>
                    <CardDescription>New vs returning customers over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.customerGrowth}>
                                <defs>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorReturning" x1="0" y1="0" x2="0" y2="1">
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
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip
                                    labelFormatter={(label) =>
                                        new Date(label).toLocaleDateString("en-CA", {
                                            weekday: "short",
                                            month: "short",
                                            day: "numeric",
                                        })
                                    }
                                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="new"
                                    name="New"
                                    stroke="#10b981"
                                    fill="url(#colorNew)"
                                    strokeWidth={2}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="returning"
                                    name="Returning"
                                    stroke="#3b82f6"
                                    fill="url(#colorReturning)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="segments">Segments</TabsTrigger>
                    <TabsTrigger value="geography">Geography</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Top Customers */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Top Customers</CardTitle>
                                <CardDescription>Highest value customers by total spend</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>#</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead className="text-right">Orders</TableHead>
                                            <TableHead className="text-right">Total Spent</TableHead>
                                            <TableHead>Last Order</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.topCustomers.map((customer, index) => (
                                            <TableRow key={customer.id}>
                                                <TableCell>
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                                        {index + 1}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{customer.name}</p>
                                                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">{customer.orders}</TableCell>
                                                <TableCell className="text-right font-medium text-emerald-600">
                                                    {fmt(customer.totalSpent)}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {new Date(customer.lastOrder).toLocaleDateString("en-CA", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="segments" className="mt-4">
                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Customer Value Tiers */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Customer Value Tiers</CardTitle>
                                <CardDescription>Customers segmented by spending</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.customersByValue}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="count"
                                                nameKey="tier"
                                                label={({ tier, percent }) => `${tier}: ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {data.customersByValue.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={TIER_COLORS[entry.tier] || COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number) => [value.toLocaleString(), "Customers"]}
                                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Purchase Frequency */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Purchase Frequency</CardTitle>
                                <CardDescription>Distribution of orders per customer</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.purchaseFrequency}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                                            />
                                            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Customers" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="geography" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Geographic Distribution</CardTitle>
                            <CardDescription>Where your customers are located</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.geographicDistribution.map((region, index) => (
                                    <div key={region.region} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="h-3 w-3 rounded-full"
                                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                />
                                                <span className="font-medium">{region.region}</span>
                                            </div>
                                            <span className="text-muted-foreground">
                                                {region.count.toLocaleString()} customers ({region.percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <Progress value={region.percentage} className="h-2" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CustomersAnalyticsSkeleton() {
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
