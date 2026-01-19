"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Pencil, Trash2 } from "lucide-react";

export type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  price: string;
  compareAtPrice?: string | null;
  onSale?: boolean;
  status: string;
  stockStatus: string;
  isFeatured: boolean;
  averageRating?: string;
  reviewCount?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  primaryImageUrl?: string | null;
  categoryNames?: string[];
  quantity?: number;
  sold?: number;
};

export function getProductColumns(actions: { onEdit: (row: ProductRow) => void; onDelete: (row: ProductRow) => void }): ColumnDef<ProductRow>[] {
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
          <span className="text-muted-foreground text-xs">SKU: {row.original.sku || "—"}</span>
        </div>
      ),
    },
    {
      accessorKey: "categoryNames",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Category" />,
      cell: ({ row }) => {
        const cats = row.original.categoryNames || [];
        return <span className="text-sm">{cats.length ? cats.join(", ") : "—"}</span>;
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
      cell: ({ row }) => <span>${row.original.price}</span>,
    },
    {
      accessorKey: "onSale",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sale" />,
      cell: ({ row }) => <UniversalBadge kind="sale" value={row.original.onSale} label={row.original.onSale ? "SALE" : "NO"} />,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="status" value={row.original.status} label={String(row.original.status || "").toUpperCase()} />,
    },
    {
      accessorKey: "stockStatus",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UniversalBadge kind="status" value={row.original.stockStatus} label={String(row.original.stockStatus || "").toUpperCase()} />
          {(() => {
            const q: any = (row.original as any).quantity;
            const qty = q == null ? null : Number(q);
            const s: any = (row.original as any).sold;
            const sold = s == null ? null : Number(s);
            return (
              <div className="flex flex-col leading-tight">
                <span className="text-xs text-muted-foreground">Qty: {qty == null || Number.isNaN(qty) ? "—" : qty}</span>
                <span className="text-xs text-muted-foreground">Sold: {sold == null || Number.isNaN(sold) ? "—" : sold}</span>
              </div>
            );
          })()}
        </div>
      ),
    },
    {
      accessorKey: "isFeatured",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Featured" />,
      cell: ({ row }) => <UniversalBadge kind="featured" value={row.original.isFeatured} label={row.original.isFeatured ? "YES" : "NO"} />,
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
      accessorKey: "updatedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Updated" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm"><LocalDate value={row.original.updatedAt} /></span>
          <span className="text-muted-foreground text-xs"><LocalTime value={row.original.updatedAt} /></span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
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
