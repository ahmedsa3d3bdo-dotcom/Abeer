"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = "payment" | "order" | "shipment";

type Props = {
  type: StatusType;
  status: string;
  className?: string;
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: "bg-emerald-600 text-white border-transparent",
  pending: "bg-amber-500 text-white border-transparent",
  failed: "bg-red-600 text-white border-transparent",
  refunded: "bg-slate-600 text-white border-transparent",
  partially_refunded: "bg-violet-600 text-white border-transparent",
};

const ORDER_STYLES: Record<string, string> = {
  pending: "bg-amber-500 text-white border-transparent",
  processing: "bg-blue-600 text-white border-transparent",
  confirmed: "bg-indigo-600 text-white border-transparent",
  shipped: "bg-cyan-600 text-white border-transparent",
  delivered: "bg-emerald-600 text-white border-transparent",
  cancelled: "bg-red-600 text-white border-transparent",
  refunded: "bg-violet-600 text-white border-transparent",
};

const SHIPMENT_STYLES: Record<string, string> = {
  pending: "bg-amber-500 text-white border-transparent",
  processing: "bg-blue-600 text-white border-transparent",
  in_transit: "bg-cyan-600 text-white border-transparent",
  out_for_delivery: "bg-indigo-600 text-white border-transparent",
  delivered: "bg-emerald-600 text-white border-transparent",
  failed: "bg-red-600 text-white border-transparent",
  returned: "bg-slate-600 text-white border-transparent",
  preparing: "bg-blue-600 text-white border-transparent",
};

function humanizeStatus(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

export function StatusBadge({ type, status, className }: Props) {
  const key = String(status || "").toLowerCase();

  const styles =
    type === "payment"
      ? PAYMENT_STYLES[key]
      : type === "shipment"
      ? SHIPMENT_STYLES[key]
      : ORDER_STYLES[key];

  const label = humanizeStatus(key);

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        styles || "bg-muted text-foreground border-border",
        className
      )}
    >
      {label || "—"}
    </Badge>
  );
}
