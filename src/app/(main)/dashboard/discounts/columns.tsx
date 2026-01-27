"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";

export type DiscountRow = {
  id: string;
  name: string;
  code?: string | null;
  type: string;
  value: string;
  scope: string;
  status: string;
  isAutomatic: boolean;
  metadata?: any;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: string | Date | null;
  endsAt?: string | Date | null;
  createdAt: string | Date;
};

function getDiscountKindLabel(row: DiscountRow) {
  if (!row.isAutomatic) return "Coupon";
  const md: any = row?.metadata || null;
  if (md?.kind === "offer" && md?.offerKind === "bundle") return "Bundle offer";
  if (md?.kind === "offer") return "Scheduled offer";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_generic") return "BXGY generic";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") return "BXGY bundle";
  return "Automatic";
}

function getDiscountKindValue(row: DiscountRow) {
  if (!row.isAutomatic) return "coupon";
  const md: any = row?.metadata || null;
  if (md?.kind === "offer" && md?.offerKind === "bundle") return "bundle_offer";
  if (md?.kind === "offer") return "scheduled_offer";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_generic") return "bxgy_generic";
  if (md?.kind === "deal" && md?.offerKind === "bxgy_bundle") return "bxgy_bundle";
  return "scheduled_offer";
}

function getDisplayTypeValue(row: DiscountRow) {
  const kind = getDiscountKindValue(row);
  if (kind === "bxgy_generic" || kind === "bxgy_bundle") return "bxgy";
  return row.type;
}

function getDisplayTypeLabel(row: DiscountRow) {
  const kind = getDiscountKindValue(row);
  if (kind === "bxgy_generic" || kind === "bxgy_bundle") return "BXGY";
  return String(row.type || "").replaceAll("_", " ").toUpperCase();
}

function getDisplayValueLabel(row: DiscountRow) {
  const kind = getDiscountKindValue(row);
  const md: any = row?.metadata || null;

  if (kind === "bxgy_generic") {
    const buy = Number(md?.bxgy?.buyQty ?? 0);
    const get = Number(md?.bxgy?.getQty ?? 0);
    if (buy > 0 && get > 0) return `Buy ${buy} Get ${get}`;
    return "BXGY";
  }

  if (kind === "bxgy_bundle") {
    const buyLines = Array.isArray(md?.bxgyBundle?.buy) ? md.bxgyBundle.buy : [];
    const getLines = Array.isArray(md?.bxgyBundle?.get) ? md.bxgyBundle.get : [];
    const buyQty = buyLines.reduce((sum: number, l: any) => sum + Number(l?.quantity ?? 0), 0);
    const getQty = getLines.reduce((sum: number, l: any) => sum + Number(l?.quantity ?? 0), 0);
    if (buyQty > 0 && getQty > 0) return `Buy ${buyQty} Get ${getQty}`;
    return "BXGY bundle";
  }

  return row.type === "percentage" ? `${row.value}%` : `$${row.value}`;
}

export function getDiscountColumns(actions: {
  onView: (row: DiscountRow) => void;
  onEdit: (row: DiscountRow) => void;
  onDelete: (row: DiscountRow) => void;
}): ColumnDef<DiscountRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    },
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.code || "—"}</span>
        </div>
      ),
    },
    {
      id: "kind",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kind" />,
      cell: ({ row }) => <UniversalBadge kind="discount_kind" value={getDiscountKindValue(row.original)} label={getDiscountKindLabel(row.original)} />,
    },
    {
      accessorKey: "type",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Type" />,
      cell: ({ row }) => (
        <UniversalBadge kind="type" value={getDisplayTypeValue(row.original)} label={getDisplayTypeLabel(row.original)} />
      ),
    },
    {
      accessorKey: "value",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Value" />,
      cell: ({ row }) => <span>{getDisplayValueLabel(row.original)}</span>,
    },
    {
      accessorKey: "scope",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Scope" />,
      cell: ({ row }) => <UniversalBadge kind="scope" value={row.original.scope} label={String(row.original.scope || "").replaceAll("_", " ").toUpperCase()} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="status" value={row.original.status} label={String(row.original.status || "").toUpperCase()} />,
    },
    {
      accessorKey: "usageCount",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Usage" />,
      cell: ({ row }) => (
        <span className="text-sm">{row.original.usageCount}{row.original.usageLimit ? ` / ${row.original.usageLimit}` : ""}</span>
      ),
    },
    {
      accessorKey: "startsAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Starts" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.startsAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.startsAt} /></span>
        </div>
      ),
    },
    {
      accessorKey: "endsAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Ends" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.endsAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.endsAt} /></span>
        </div>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.createdAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.createdAt} /></span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => actions.onView(row.original)}>
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => actions.onEdit(row.original)}>
            <Pencil className="mr-1 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => actions.onDelete(row.original)}>
            <Trash2 className="mr-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
