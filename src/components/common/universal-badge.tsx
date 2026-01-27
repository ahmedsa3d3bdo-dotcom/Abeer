import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UniversalBadgeKind =
  | "status"
  | "type"
  | "discount_kind"
  | "visibility"
  | "scope"
  | "sale"
  | "featured"
  | "active"
  | "priority"
  | "role"
  | "action"
  | "source"
  | "level";

function normalize(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function humanize(raw: unknown) {
  const v = String(raw ?? "").trim();
  if (!v) return "—";
  return v
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SOLID = {
  slate: "bg-slate-600 text-white border-transparent",
  blue: "bg-blue-600 text-white border-transparent",
  emerald: "bg-emerald-600 text-white border-transparent",
  amber: "bg-amber-600 text-white border-transparent",
  rose: "bg-rose-600 text-white border-transparent",
  violet: "bg-violet-600 text-white border-transparent",
} as const;

function styleFor(kind: UniversalBadgeKind, value: string) {
  // normalize common boolean-like values
  const v = normalize(value);

  if (kind === "discount_kind") {
    if (v === "coupon") return SOLID.blue;
    if (v === "scheduled_offer") return SOLID.emerald;
    if (v === "bxgy_generic") return SOLID.amber;
    if (v === "bxgy_bundle") return SOLID.violet;
    if (v === "bundle_offer") return SOLID.slate;
    return SOLID.slate;
  }

  if (kind === "status" || kind === "type") {
    if (kind === "type") {
      if (v === "system") return SOLID.violet;
      if (v === "custom") return SOLID.blue;

      // discount types
      if (v === "percentage") return SOLID.blue;
      if (v === "fixed_amount") return SOLID.violet;
      if (v === "free_shipping") return SOLID.emerald;
      if (v === "bxgy") return SOLID.amber;

      if (v === "string") return SOLID.blue;
      if (v === "json" || v === "object") return SOLID.violet;
      if (v === "number" || v === "int" || v === "integer" || v === "float" || v === "decimal") return SOLID.emerald;
      if (v === "boolean" || v === "bool") return SOLID.amber;

      // notifications/email types (from enums)
      if (v === "system_alert") return SOLID.rose;
      if (v === "low_stock") return SOLID.amber;
      if (v === "promotional") return SOLID.violet;
      if (v === "contact_message") return SOLID.blue;
      if (v === "product_review") return SOLID.violet;
      if (v === "customer_registered" || v === "newsletter_subscribed") return SOLID.emerald;
      if (v.startsWith("order_")) return SOLID.blue;
      if (v.startsWith("shipment_")) return SOLID.violet;
    }

    if (
      v === "paid" ||
      v === "approved" ||
      v === "confirmed" ||
      v === "delivered" ||
      v === "success" ||
      v === "completed" ||
      v === "active" ||
      v === "resolved" ||
      v === "processed" ||
      v === "healthy" ||
      v === "sent" ||
      v === "read" ||
      v === "in_stock"
    ) {
      return SOLID.emerald;
    }

    if (
      v === "pending" ||
      v === "processing" ||
      v === "in_transit" ||
      v === "out_for_delivery" ||
      v === "on_hold" ||
      v === "queued" ||
      v === "running" ||
      v === "requested" ||
      v === "received" ||
      v === "degraded" ||
      v === "low_stock" ||
      v === "unread" ||
      v === "in_progress"
    ) {
      return SOLID.amber;
    }

    if (
      v === "shipped" ||
      v === "open" ||
      v === "enabled" ||
      v === "published" ||
      v === "confirmed" ||
      v === "new"
    ) {
      return SOLID.blue;
    }

    if (
      v === "refunded" ||
      v === "partially_refunded" ||
      v === "returned" ||
      v === "preorder" ||
      v === "draft" ||
      v === "archived"
    ) {
      return SOLID.violet;
    }

    if (
      v === "cancelled" ||
      v === "canceled" ||
      v === "rejected" ||
      v === "failed" ||
      v === "error" ||
      v === "blocked" ||
      v === "spam" ||
      v === "unhealthy" ||
      v === "out_of_stock" ||
      v === "expired" ||
      v === "inactive" ||
      v === "bounced" ||
      v === "unsubscribed" ||
      v === "closed"
    ) {
      return SOLID.rose;
    }
  }

  if (kind === "level") {
    if (v === "error") return SOLID.rose;
    if (v === "warn" || v === "warning") return SOLID.amber;
    if (v === "info") return SOLID.blue;
    return SOLID.slate;
  }

  if (kind === "action") {
    if (v === "create" || v === "created") return SOLID.emerald;
    if (v === "update" || v === "updated") return SOLID.blue;
    if (v === "delete" || v === "deleted") return SOLID.rose;
    if (v === "login") return SOLID.violet;
    if (v === "logout") return SOLID.slate;
    if (v === "password_change") return SOLID.violet;
    if (v === "permission_change") return SOLID.blue;
    if (v === "settings_change") return SOLID.blue;
    if (v === "backup_create") return SOLID.emerald;
    if (v === "backup_restore") return SOLID.amber;
    return SOLID.slate;
  }

  if (kind === "priority") {
    if (v === "high") return SOLID.rose;
    if (v === "normal") return SOLID.blue;
    if (v === "medium") return SOLID.amber;
    if (v === "low") return SOLID.slate;
    return SOLID.slate;
  }

  if (kind === "active") {
    if (v === "true" || v === "yes" || v === "active" || v === "enabled" || v === "on") return SOLID.emerald;
    if (v === "false" || v === "no" || v === "inactive" || v === "disabled" || v === "off") return SOLID.slate;
    return SOLID.slate;
  }

  if (kind === "featured") {
    if (v === "true" || v === "yes" || v === "featured") return SOLID.violet;
    if (v === "false" || v === "no") return SOLID.slate;
    return SOLID.violet;
  }

  if (kind === "sale") {
    if (v === "true" || v === "yes") return SOLID.amber;
    if (v === "sale" || v === "on_sale" || v === "discount" || v === "discounted") return SOLID.amber;
    if (v === "none" || v === "no" || v === "false") return SOLID.slate;
    return SOLID.amber;
  }

  if (kind === "visibility") {
    if (v === "public") return SOLID.emerald;
    if (v === "private") return SOLID.slate;
    if (v === "hidden") return SOLID.rose;
    return SOLID.slate;
  }

  if (kind === "scope") {
    // discount scopes
    if (v === "all") return SOLID.slate;
    if (v === "products") return SOLID.blue;
    if (v === "categories") return SOLID.emerald;
    if (v === "collections") return SOLID.amber;
    if (v === "customer_groups") return SOLID.violet;

    if (v === "global") return SOLID.violet;
    if (v === "local" || v === "store") return SOLID.blue;
    return SOLID.slate;
  }

  if (kind === "role") {
    if (v === "super_admin" || v === "owner") return SOLID.violet;
    if (v === "admin") return SOLID.blue;
    if (v === "manager") return SOLID.emerald;
    if (v === "support") return SOLID.amber;
    if (v === "finance") return SOLID.emerald;
    if (v === "marketing") return SOLID.violet;
    if (v === "staff") return SOLID.amber;
    if (v === "user") return SOLID.slate;
    return SOLID.slate;
  }

  if (kind === "source") {
    if (v === "server") return SOLID.blue;
    if (v === "client") return SOLID.violet;
    if (v === "job") return SOLID.emerald;
    if (v === "csp") return SOLID.amber;
    return SOLID.slate;
  }

  return SOLID.slate;
}

export function UniversalBadge({
  kind,
  value,
  label,
  className,
}: {
  kind: UniversalBadgeKind;
  value: string | number | boolean | null | undefined;
  label?: ReactNode;
  className?: string;
}) {
  const raw = String(value ?? "");
  const styles = styleFor(kind, raw);

  return (
    <Badge
      variant="outline"
      className={cn("capitalize", styles, className)}
    >
      {label ?? humanize(raw)}
    </Badge>
  );
}
