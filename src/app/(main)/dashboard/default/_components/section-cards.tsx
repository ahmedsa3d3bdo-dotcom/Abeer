"use client";

import { useEffect, useMemo, useState } from "react";
import { DollarSign, Wallet, Users, ShoppingCart, Receipt } from "lucide-react";

import { MetricCard } from "@/components/common/metric-card";

export function SectionCards() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any | null>(null);

  const num = useMemo(
    () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/dashboard/overview?range=90d`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error?.message || "Failed to load overview");
        if (mounted) setData(j.data || null);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-5">
      <MetricCard
        title="Total Sales"
        value={num.format(Number(data?.totalSales ?? 0))}
        subtitle="Non-cancelled orders · Last 3 months"
        icon={DollarSign}
        tone="emerald"
      />

      <MetricCard
        title="Net Profit"
        value={num.format(Number(data?.netProfit ?? 0))}
        subtitle="Sales minus product cost · Last 3 months"
        icon={Wallet}
        tone="blue"
      />

      <MetricCard
        title="New Customers"
        value={Number(data?.newCustomers ?? 0).toLocaleString()}
        subtitle="New users created · Last 3 months"
        icon={Users}
        tone="violet"
      />

      <MetricCard
        title="Orders"
        value={Number(data?.ordersCount ?? 0).toLocaleString()}
        subtitle="All order statuses · Last 3 months"
        icon={ShoppingCart}
        tone="amber"
      />

      <MetricCard
        title="Avg Order Value"
        value={num.format(Number(data?.avgOrderValue ?? 0))}
        subtitle="Average of paid orders · Last 3 months"
        icon={Receipt}
        tone="slate"
      />
    </div>
  );
}
