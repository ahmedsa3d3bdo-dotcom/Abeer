"use client";

import { ColumnDef } from "@tanstack/react-table";
import { UniversalBadge } from "@/components/common/universal-badge";
import { Button } from "@/components/ui/button";
import { LocalDate, LocalTime } from "@/components/common/local-datetime";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Trash2, Download, RotateCcw } from "lucide-react";

export type BackupRow = {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  status: string;
  type: string;
  createdAt: string | Date;
};

export function getBackupColumns(params: {
  actions: { onDelete: (row: BackupRow) => void; onDownload: (row: BackupRow) => void; onRestore: (row: BackupRow) => void };
}): ColumnDef<BackupRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Backup" />,
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          <span className="text-muted-foreground text-xs">{row.original.fileName}</span>
        </div>
      ),
    },
    {
      accessorKey: "fileSize",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Size" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {(row.original.fileSize / 1024).toFixed(1)} KB
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const raw = String(row.original.status || "");
        const label = raw === "completed" ? "Completed" : raw || "-";
        return <UniversalBadge kind="status" value={row.original.status} label={label.toUpperCase()} />;
      },
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
          <Button variant="outline" size="sm" onClick={() => params.actions.onDownload(row.original)}>
            <Download className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Download
          </Button>
          <Button variant="secondary" size="sm" onClick={() => params.actions.onRestore(row.original)} disabled={row.original.status !== "completed"}>
            <RotateCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Restore
          </Button>
          <Button variant="destructive" size="sm" onClick={() => params.actions.onDelete(row.original)}>
            <Trash2 className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Delete
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
