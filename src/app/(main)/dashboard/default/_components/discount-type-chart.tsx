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
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import { PieChart as PieIcon, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TypeBreakdownData {
    type: string;
    offerKind: string;
    label: string;
    totalAmount: number;
    usageCount: number;
    avgAmount: number;
}

const COLORS = [
    "hsl(217, 91%, 60%)",   // Blue - Coupons
    "hsl(142, 71%, 45%)",   // Green - Scheduled Offers
    "hsl(263, 70%, 50%)",   // Purple - BXGY Generic
    "hsl(330, 81%, 60%)",   // Pink - BXGY Bundle
    "hsl(224, 76%, 48%)",   // Indigo - Bundle Offers
    "hsl(43, 96%, 56%)",    // Amber
];

export function DiscountTypeChart() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TypeBreakdownData[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fmt = (value: number) => formatCurrency(value, { currency: "CAD", locale: "en-CA" });

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoading(true);
                const res = await fetch("/api/v1/dashboard/discount-analytics?range=30d", { cache: "no-store" });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error?.message || "Failed to load");
                if (mounted) {
                    setData(json.data?.typeBreakdown || []);
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || "Failed to load");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PieIcon className="h-5 w-5" />
                        Savings by Type
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
                        <PieIcon className="h-5 w-5" />
                        Savings by Type
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    {error}
                </CardContent>
            </Card>
        );
    }

    const chartData = data
        .filter((d) => d.totalAmount > 0)
        .map((d, idx) => ({
            name: d.label,
            value: d.totalAmount,
            usageCount: d.usageCount,
            fill: COLORS[idx % COLORS.length],
        }));

    const totalSavings = chartData.reduce((sum, d) => sum + d.value, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PieIcon className="h-5 w-5" />
                    Savings by Type
                </CardTitle>
                <CardDescription>
                    Distribution of discounts by promotion type
                </CardDescription>
            </CardHeader>
            <CardContent>
                {chartData.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        No discount data for this period
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) =>
                                    `${name} ${(percent * 100).toFixed(0)}%`
                                }
                                labelLine={false}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const dataPoint = payload[0].payload;
                                        const percentage = ((dataPoint.value / totalSavings) * 100).toFixed(1);
                                        return (
                                            <div className="rounded-lg border bg-background p-3 shadow-lg">
                                                <div className="text-sm font-medium">{dataPoint.name}</div>
                                                <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                                                    {fmt(dataPoint.value)} ({percentage}%)
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {dataPoint.usageCount} uses
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value) => (
                                    <span className="text-xs text-muted-foreground">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
}
