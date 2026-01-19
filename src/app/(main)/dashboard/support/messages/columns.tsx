"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Checkbox } from "@/components/ui/checkbox";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

export type ContactMessageRow = {
  id: string;
  name: string | null;
  email: string;
  subject: string | null;
  status: string;
  priority: string;
  createdAt: string | Date;
  respondedAt: string | Date | null;
};

export function getContactMessageColumns(): ColumnDef<ContactMessageRow>[] {
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
      accessorKey: "subject",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Subject" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link href={`/dashboard/support/messages/${row.original.id}`} className="font-medium hover:underline">
            {row.original.subject || "(no subject)"}
          </Link>
          <span className="text-muted-foreground text-xs">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: "from",
      header: () => <div>From</div>,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.original.name || "—"}</span>
          <span className="text-muted-foreground text-xs">{row.original.email}</span>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <UniversalBadge kind="status" value={row.original.status} />,
    },
    {
      accessorKey: "priority",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => <UniversalBadge kind="priority" value={row.original.priority} />,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created" />,
      cell: ({ row }) => (
        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-sm">
            <LocalDate value={row.original.createdAt} />
          </span>
          <span className="text-muted-foreground text-xs">
            <LocalTime value={row.original.createdAt} />
          </span>
        </div>
      ),
    },
    {
      accessorKey: "respondedAt",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Responded" />,
      cell: ({ row }) =>
        row.original.respondedAt ? (
          <div className="flex flex-col leading-tight">
            <span className="text-muted-foreground text-sm">
              <LocalDate value={row.original.respondedAt} />
            </span>
            <span className="text-muted-foreground text-xs">
              <LocalTime value={row.original.respondedAt} />
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];
}
