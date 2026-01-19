"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LocalDateTime } from "@/components/common/local-datetime";

export function RecentActivities({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<Array<{ id: string; action: string; resource: string; userEmail: string | null; createdAt: string }>>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await fetch(`/api/v1/dashboard/recent-activities?limit=${limit}`, { cache: "no-store" });
      const j = await res.json();
      if (res.ok && mounted) setItems(Array.isArray(j.data?.items) ? j.data.items : []);
    })();
    return () => {
      mounted = false;
    };
  }, [limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No activity
                </TableCell>
              </TableRow>
            ) : null}
            {items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{a.action.replaceAll("_", " ")}</Badge>
                </TableCell>
                <TableCell className="capitalize">{a.resource.replaceAll("_", " ")}</TableCell>
                <TableCell className="truncate max-w-[240px]">{a.userEmail || "-"}</TableCell>
                <TableCell className="text-right"><LocalDateTime value={a.createdAt} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
