import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { SectionCards } from "./_components/section-cards";
import { RecentOrders } from "./_components/recent-orders";
import { OrdersStatusChart } from "./_components/orders-status-chart";
import { RevenueByPaymentChart } from "./_components/revenue-by-payment-chart";
import { TopProductsTable } from "./_components/top-products-table";
import { RecentActivities } from "./_components/recent-activities";
import { DiscountAnalytics } from "./_components/discount-analytics";
import { DiscountUsageChart } from "./_components/discount-usage-chart";
import { DiscountTypeChart } from "./_components/discount-type-chart";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards />
      <ChartAreaInteractive />
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <OrdersStatusChart />
        <RevenueByPaymentChart />
      </div>

      {/* Discount Analytics Section */}
      <DiscountAnalytics />
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <DiscountUsageChart />
        <DiscountTypeChart />
      </div>

      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <TopProductsTable />
        <RecentActivities />
      </div>
      <RecentOrders />
    </div>
  );
}
