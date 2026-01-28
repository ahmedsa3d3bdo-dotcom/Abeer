"use client";

import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { TrendingUp, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface UsageDataPoint {
    date: string;
    totalAmount: number;
    usageCount: number;
}

export function DiscountUsageChart() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<UsageDataPoint[]>([]);
    const [range, setRange] = useState<string>("30d");
    const [error, setError] = useState<string | null>(null);

    const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/v1/dashboard/discount-analytics?range=${range}`, { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error?.message || "Failed to load");
                if (mounted) {
                    const usageData = json.data?.usageOverTime || [];
                    // Format dates for display
                    const formattedData = usageData.map((d: UsageDataPoint) => ({
                        ...d,
                        dateLabel: new Date(d.date).toLocaleDateString("en-CA", {
                            month: "short",
                            day: "numeric",
                        }),
                    }));
                    setData(formattedData);
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || "Failed to load");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [range]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Discount Usage Trend
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Discount Usage Trend
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    {error}
                </CardContent>
            </Card>
        );
    }

    const totalSavings = data.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalUsage = data.reduce((sum, d) => sum + d.usageCount, 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Discount Usage Trend
                    </CardTitle>
                    <CardDescription>
                        Daily discount savings and usage count
                    </CardDescription>
                </div>
                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                {data.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        No discount usage data for this period
                    </div>
                ) : (
                    <>
                        <div className="mb-4 flex items-center gap-6">
                            <div>
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {fmt(totalSavings)}
                                </div>
                                <div className="text-xs text-muted-foreground">Total savings</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{totalUsage}</div>
                                <div className="text-xs text-muted-foreground">Total uses</div>
                            </div>
                        </div>

                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="discountGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis
                                    dataKey="dateLabel"
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    className="text-muted-foreground"
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `$${value}`}
                                    className="text-muted-foreground"
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const dataPoint = payload[0].payload;
                                            return (
                                                <div className="rounded-lg border bg-background p-3 shadow-lg">
                                                    <div className="text-sm font-medium">{dataPoint.dateLabel}</div>
                                                    <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                                                        Savings: {fmt(dataPoint.totalAmount)}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Uses: {dataPoint.usageCount}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalAmount"
                                    stroke="hsl(var(--primary))"
                                    strokeWidth={2}
                                    fill="url(#discountGradient)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
