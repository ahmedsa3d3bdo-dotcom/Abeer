"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Tag, Ticket, Gift, TrendingDown, TrendingUp, Percent, Package, Loader2 } from "lucide-react";

interface DiscountAnalyticsData {
    summary: {
        totalDiscountAmount: number;
        ordersWithDiscount: number;
        totalOrders: number;
        discountRate: number;
        avgDiscountPerOrder: number;
        discountAsPercentOfRevenue: number;
    };
    activeDiscounts: {
        total: number;
        coupons: number;
        promotions: number;
    };
    typeBreakdown: Array<{
        type: string;
        offerKind: string;
        label: string;
        totalAmount: number;
        usageCount: number;
        avgAmount: number;
    }>;
    topDiscounts: Array<{
        id: string;
        name: string;
        code: string | null;
        type: string;
        typeLabel: string;
        value: number;
        isAutomatic: boolean;
        totalSavings: number;
        usageCount: number;
        avgDiscountPerOrder: number;
    }>;
}

const typeColors: Record<string, string> = {
    "Coupons": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Scheduled Offers": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "Bundle Offers": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
    "Buy X Get Y": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "BXGY Bundle": "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

const typeIcons: Record<string, typeof Tag> = {
    "Coupons": Ticket,
    "Scheduled Offers": Percent,
    "Bundle Offers": Package,
    "Buy X Get Y": Gift,
    "BXGY Bundle": Gift,
};

export function DiscountAnalytics() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DiscountAnalyticsData | null>(null);
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
                if (mounted) setData(json.data || null);
            } catch (e: any) {
                if (mounted) setError(e?.message || "Failed to load discount analytics");
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
                        <Tag className="h-5 w-5" />
                        Discount Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        );
    }

    if (error || !data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Discount Analytics
                    </CardTitle>
                </CardHeader>
                <CardContent className="py-8 text-center text-muted-foreground">
                    {error || "No data available"}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Discount Analytics
                </CardTitle>
                <CardDescription>
                    Discount performance over the last 30 days
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Total Discounts Given</div>
                        <div className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                            {fmt(data.summary.totalDiscountAmount)}
                        </div>
                    </div>
                    <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Discount Rate</div>
                        <div className="mt-1 text-2xl font-bold">
                            {data.summary.discountRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {data.summary.ordersWithDiscount} of {data.summary.totalOrders} orders
                        </div>
                    </div>
                    <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">Avg. Discount/Order</div>
                        <div className="mt-1 text-2xl font-bold">
                            {fmt(data.summary.avgDiscountPerOrder)}
                        </div>
                    </div>
                    <div className="rounded-lg border p-4">
                        <div className="text-xs text-muted-foreground">% of Revenue</div>
                        <div className="mt-1 text-2xl font-bold">
                            {data.summary.discountAsPercentOfRevenue}%
                        </div>
                        <div className="text-xs text-muted-foreground">in discounts</div>
                    </div>
                </div>

                {/* Active Discounts */}
                <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                    <div className="flex-1">
                        <div className="text-sm font-medium">Active Discounts</div>
                        <div className="text-xs text-muted-foreground">Currently running promotions</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-center">
                            <div className="text-lg font-bold">{data.activeDiscounts.coupons}</div>
                            <div className="text-xs text-muted-foreground">Coupons</div>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                            <div className="text-lg font-bold">{data.activeDiscounts.promotions}</div>
                            <div className="text-xs text-muted-foreground">Promotions</div>
                        </div>
                        <Separator orientation="vertical" className="h-8" />
                        <div className="text-center">
                            <div className="text-lg font-bold text-primary">{data.activeDiscounts.total}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                        </div>
                    </div>
                </div>

                {/* Breakdown by Type */}
                {data.typeBreakdown.length > 0 && (
                    <div>
                        <h4 className="mb-3 text-sm font-semibold">Savings by Type</h4>
                        <div className="space-y-2">
                            {data.typeBreakdown.map((type, idx) => {
                                const Icon = typeIcons[type.label] || Tag;
                                const color = typeColors[type.label] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                                const totalAll = data.typeBreakdown.reduce((sum, t) => sum + t.totalAmount, 0);
                                const percentage = totalAll > 0 ? (type.totalAmount / totalAll) * 100 : 0;

                                return (
                                    <div key={idx} className="flex items-center gap-3">
                                        <Badge className={`${color} gap-1`}>
                                            <Icon className="h-3 w-3" />
                                            {type.label}
                                        </Badge>
                                        <div className="flex-1">
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-primary transition-all"
                                                    style={{ width: `${Math.min(100, percentage)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium w-24 text-right">
                                            {fmt(type.totalAmount)}
                                        </div>
                                        <div className="text-xs text-muted-foreground w-16 text-right">
                                            {type.usageCount} uses
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <Separator />

                {/* Top Performing Discounts */}
                {data.topDiscounts.length > 0 && (
                    <div>
                        <h4 className="mb-3 text-sm font-semibold">Top Performing Discounts</h4>
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="p-3 text-left font-medium">Discount</th>
                                        <th className="p-3 text-left font-medium">Type</th>
                                        <th className="p-3 text-right font-medium">Uses</th>
                                        <th className="p-3 text-right font-medium">Total Savings</th>
                                        <th className="p-3 text-right font-medium">Avg/Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topDiscounts.slice(0, 5).map((discount) => (
                                        <tr key={discount.id} className="border-b last:border-b-0">
                                            <td className="p-3">
                                                <div className="font-medium">{discount.name}</div>
                                                {discount.code && (
                                                    <div className="text-xs text-muted-foreground">Code: {discount.code}</div>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <Badge variant="outline" className="text-xs">
                                                    {discount.typeLabel}
                                                </Badge>
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                {discount.usageCount}
                                            </td>
                                            <td className="p-3 text-right font-medium text-green-600 dark:text-green-400">
                                                {fmt(discount.totalSavings)}
                                            </td>
                                            <td className="p-3 text-right text-muted-foreground">
                                                {fmt(discount.avgDiscountPerOrder)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
