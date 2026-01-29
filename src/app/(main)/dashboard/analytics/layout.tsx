"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TrendingUp, BarChart3, UserCheck, Target, FileSpreadsheet } from "lucide-react";

const analyticsNavItems = [
    { title: "Sales", href: "/dashboard/analytics/sales", icon: TrendingUp },
    { title: "Products", href: "/dashboard/analytics/products", icon: BarChart3 },
    { title: "Customers", href: "/dashboard/analytics/customers", icon: UserCheck },
    { title: "Marketing", href: "/dashboard/analytics/marketing", icon: Target },
    { title: "Reports", href: "/dashboard/analytics/reports", icon: FileSpreadsheet },
];

interface AnalyticsLayoutProps {
    children: React.ReactNode;
}

export default function AnalyticsLayout({ children }: AnalyticsLayoutProps) {
    const pathname = usePathname();

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    Gain insights into your store&apos;s performance
                </p>
            </div>

            {/* Sub-navigation Tabs */}
            <nav className="flex items-center gap-1 border-b overflow-x-auto pb-px">
                {analyticsNavItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== "/dashboard/analytics" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg whitespace-nowrap",
                                "hover:bg-muted/50",
                                isActive
                                    ? "border-b-2 border-primary text-primary bg-muted/30"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* Page Content */}
            <div className="flex-1">
                {children}
            </div>
        </div>
    );
}
