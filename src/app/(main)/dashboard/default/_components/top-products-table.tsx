"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TopProductsTable({ limit = 5 }: { limit?: number }) {
  const [range, setRange] = useState("90d");
  const [items, setItems] = useState<Array<{ productId: string | null; productName: string; units: number; revenue: number }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(`/api/v1/dashboard/top-products?range=${range}&limit=${limit}`, { cache: "no-store" });
      const j = await res.json();
      if (res.ok && mounted) setItems(Array.isArray(j.data?.items) ? j.data.items : []);
    })();
    return () => {
      mounted = false;
    };
  }, [range, limit]);

  const num = useMemo(
    () => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Top Products</CardTitle>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No data
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((p) => (
              <TableRow key={`${p.productId}-${p.productName}`}>
                <TableCell className="max-w-[260px] truncate">{p.productName}</TableCell>
                <TableCell className="text-right">{Number(p.units || 0).toLocaleString()}</TableCell>
                <TableCell className="text-right">{num.format(Number(p.revenue || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
