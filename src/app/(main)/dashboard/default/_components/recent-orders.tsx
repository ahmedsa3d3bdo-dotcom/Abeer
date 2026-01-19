"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalDate } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";

type OrderRow = {
  id: string;
  orderNumber: string;
  customerEmail: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: string | number;
  currency: string;
  createdAt: string;
};

export function RecentOrders({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const num = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/dashboard/recent-orders?limit=${limit}`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok) throw new Error(j?.error?.message || "Failed to load recent orders");
        if (mounted) setItems(Array.isArray(j.data?.items) ? j.data.items : []);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No recent orders
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((o) => {
              const total = typeof o.totalAmount === "string" ? parseFloat(o.totalAmount) : o.totalAmount;
              return (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">#{o.orderNumber}</TableCell>
                  <TableCell className="truncate max-w-[220px]">{o.customerEmail || "-"}</TableCell>
                  <TableCell>
                    <StatusBadge type="order" status={o.status} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="payment" status={o.paymentStatus} />
                  </TableCell>
                  <TableCell className="text-right">{num.format(Number(total || 0))}</TableCell>
                  <TableCell className="text-right"><LocalDate value={o.createdAt} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
