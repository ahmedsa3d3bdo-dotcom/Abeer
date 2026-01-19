import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { SectionCards } from "./_components/section-cards";
import { RecentOrders } from "./_components/recent-orders";
import { OrdersStatusChart } from "./_components/orders-status-chart";
import { RevenueByPaymentChart } from "./_components/revenue-by-payment-chart";
import { TopProductsTable } from "./_components/top-products-table";
import { RecentActivities } from "./_components/recent-activities";

export default function Page() {
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <SectionCards />
      <ChartAreaInteractive />
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <OrdersStatusChart />
        <RevenueByPaymentChart />
      </div>
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-2">
        <TopProductsTable />
        <RecentActivities />
      </div>
      <RecentOrders />
    </div>
  );
}
