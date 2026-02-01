"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    TrendingUp,
    Package,
    Users,
    DollarSign,
    ChevronRight,
} from "lucide-react";

const reportCategories = [
    {
        title: "Sales Reports",
        description: "Revenue, orders, and transaction summaries",
        icon: TrendingUp,
        color: "emerald",
        href: "/dashboard/analytics/reports/sales",
        reports: [
            { name: "Daily Sales Summary", type: "pdf" },
            { name: "Weekly Revenue Report", type: "xlsx" },
            { name: "Order Details Export", type: "csv" },
        ],
    },
    {
        title: "Product Reports",
        description: "Inventory, performance, and catalog data",
        icon: Package,
        color: "purple",
        href: "/dashboard/analytics/reports/products",
        reports: [
            { name: "Product Performance", type: "xlsx" },
            { name: "Inventory Valuation", type: "pdf" },
            { name: "Low Stock Report", type: "csv" },
        ],
    },
    {
        title: "Customer Reports",
        description: "Customer lists, behavior, and segments",
        icon: Users,
        color: "blue",
        href: "/dashboard/analytics/reports/customers",
        reports: [
            { name: "Customer List Export", type: "csv" },
            { name: "Customer Lifetime Value", type: "xlsx" },
            { name: "Acquisition Report", type: "pdf" },
        ],
    },
    {
        title: "Financial Reports",
        description: "Profit margins, taxes, and accounting",
        icon: DollarSign,
        color: "amber",
        href: "/dashboard/analytics/reports/financial",
        reports: [
            { name: "Profit & Loss Statement", type: "pdf" },
            { name: "Tax Summary", type: "xlsx" },
            { name: "Discount Impact Analysis", type: "pdf" },
        ],
    },
];

const colorClasses = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function ReportsPage() {
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-semibold">Reports Hub</h2>
                <p className="text-sm text-muted-foreground">
                    Generate and download reports
                </p>
            </div>

            {/* Report Categories Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {reportCategories.map((category) => {
                    const Icon = category.icon;
                    return (
                        <Card key={category.title} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-lg ${colorClasses[category.color as keyof typeof colorClasses]}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{category.title}</CardTitle>
                                            <CardDescription className="mt-0.5">{category.description}</CardDescription>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {category.reports.map((report) => (
                                        <div
                                            key={report.name}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm">{report.name}</span>
                                            </div>
                                            <Badge variant="secondary" className="text-xs uppercase">
                                                {report.type}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                                <Link href={category.href}>
                                    <Button variant="ghost" className="w-full mt-3 justify-between" size="sm">
                                        View All Reports
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
