"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OrdersStatusChart() {
  const [range, setRange] = useState("90d");
  const [items, setItems] = useState<Array<{ status: string; paymentStatus: string; count: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(`/api/v1/dashboard/orders-status?range=${range}`, { cache: "no-store" });
      const j = await res.json();
      if (res.ok && mounted) setItems(Array.isArray(j.data?.items) ? j.data.items : []);
    })();
    return () => {
      mounted = false;
    };
  }, [range]);

  // reshape to stacked series by status with paymentStatus stacks
  const paymentKeys = Array.from(new Set(items.map((i) => i.paymentStatus || "unknown")));
  const dataByStatus = Array.from(
    items.reduce((map, i) => {
      const key = i.status || "unknown";
      if (!map.has(key)) map.set(key, { status: key });
      (map.get(key) as any)[i.paymentStatus || "unknown"] = i.count;
      return map;
    }, new Map<string, any>()),
  ).map(([_, v]) => v);

  const chartConfig = Object.fromEntries(
    paymentKeys.map((k, idx) => [k, { label: k.replaceAll("_", " "), color: `var(--chart-${(idx % 5) + 1})` }]),
  );

  return (
    <Card className="@container/card">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Orders by Status</CardTitle>
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
          <BarChart data={dataByStatus}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis allowDecimals={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            {paymentKeys.map((k, idx) => (
              <Bar key={k} dataKey={k} stackId="a" fill={`var(--color-${k})`} />
            ))}
            <Legend />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
