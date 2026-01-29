import Link from "next/link";
import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { SectionCards } from "./_components/section-cards";
import { RecentOrders } from "./_components/recent-orders";
import { OrdersStatusChart } from "./_components/orders-status-chart";
import { TopProductsTable } from "./_components/top-products-table";
import { RecentActivities } from "./_components/recent-activities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  BarChart3,
  UserCheck,
  Target,
  FileSpreadsheet,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const analyticsQuickLinks = [
  {
    title: "Sales Analytics",
    description: "Revenue trends & order insights",
    icon: TrendingUp,
    href: "/dashboard/analytics/sales",
    color: "emerald",
  },
  {
    title: "Product Analytics",
    description: "Top sellers & inventory",
    icon: BarChart3,
    href: "/dashboard/analytics/products",
    color: "purple",
  },
  {
    title: "Customer Analytics",
    description: "Growth & lifetime value",
    icon: UserCheck,
    href: "/dashboard/analytics/customers",
    color: "blue",
  },
  {
    title: "Marketing",
    description: "Discount performance",
    icon: Target,
    href: "/dashboard/analytics/marketing",
    color: "pink",
  },
  {
    title: "Reports",
    description: "Download & export",
    icon: FileSpreadsheet,
    href: "/dashboard/analytics/reports",
    color: "amber",
  },
];

const colorClasses: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500/20",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-500/20",
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500/20",
  pink: "bg-pink-500/10 text-pink-600 dark:text-pink-400 group-hover:bg-pink-500/20",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20",
};

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your store.
        </p>
      </div>

      {/* KPI Cards */}
      <SectionCards />

      {/* Main Revenue Chart */}
      <ChartAreaInteractive />

      {/* Analytics Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </div>
            <Link href="/dashboard/analytics/sales">
              <Button variant="ghost" size="sm" className="gap-1">
                View All
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CardDescription>Deep dive into your store performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {analyticsQuickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href}>
                  <div className="group flex flex-col gap-2 p-4 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                    <div className={`p-2 rounded-lg w-fit transition-colors ${colorClasses[link.color]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <OrdersStatusChart />
        <TopProductsTable />
      </div>

      {/* Recent Orders and Activities */}
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
        <div className="@4xl/main:col-span-2">
          <RecentOrders />
        </div>
        <RecentActivities />
      </div>
    </div>
  );
}

