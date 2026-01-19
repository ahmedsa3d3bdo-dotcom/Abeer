"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function RevenueByPaymentChart() {
  const [range, setRange] = useState("90d");
  const [items, setItems] = useState<Array<{ paymentMethod: string | null; revenue: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(`/api/v1/dashboard/revenue-by-payment?range=${range}`, { cache: "no-store" });
      const j = await res.json();
      if (res.ok && mounted) setItems(Array.isArray(j.data?.items) ? j.data.items : []);
    })();
    return () => {
      mounted = false;
    };
  }, [range]);

  const data = items.map((i) => ({ key: i.paymentMethod || "unknown", value: Number(i.revenue || 0) }));
  const chartConfig = useMemo(() => {
    const entries = data.map((d, idx) => [d.key, { label: d.key.replaceAll("_", " "), color: `var(--chart-${(idx % 6) + 1})` }]);
    return Object.fromEntries(entries);
  }, [JSON.stringify(data)]);

  return (
    <Card className="@container/card">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Sales by Payment Method</CardTitle>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-32" size="sm">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="90d">Last 3 months</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig as any} className="h-[280px] w-full">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="key" innerRadius={60} outerRadius={90} strokeWidth={2}>
              {data.map((d) => (
                <Cell key={d.key} fill={`var(--color-${d.key})`} />
              ))}
            </Pie>
            <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="key" />} />
            <ChartLegend content={<ChartLegendContent nameKey="key" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
