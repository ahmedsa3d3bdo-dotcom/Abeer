import { Table } from "@tanstack/react-table";
import { ChevronRight, ChevronsRight, ChevronLeft, ChevronsLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  total?: number;
  pageIndex?: number;
  pageSize?: number;
}

export function DataTablePagination<TData>({ table, total, pageIndex: pageIndexProp, pageSize: pageSizeProp }: DataTablePaginationProps<TData>) {
  const state = table.getState().pagination;
  const pageIndex = typeof pageIndexProp === "number" ? pageIndexProp : state.pageIndex;
  const pageSize = typeof pageSizeProp === "number" ? pageSizeProp : state.pageSize;
  const currentCount = table.getRowModel().rows.length;
  const totalNum = total != null ? Number(total as any) : undefined;
  const computedPageCount = totalNum != null && pageSize > 0 ? Math.max(1, Math.ceil(totalNum / pageSize)) : table.getPageCount();
  const start = totalNum != null ? (totalNum > 0 ? pageIndex * pageSize + 1 : 0) : currentCount > 0 ? pageIndex * pageSize + 1 : 0;
  const end = totalNum != null ? (totalNum > 0 ? Math.min(totalNum, (pageIndex + 1) * pageSize) : 0) : pageIndex * pageSize + currentCount;
  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {totalNum != null ? (
          <span>
            Showing {start.toLocaleString()}–{end.toLocaleString()} of {totalNum.toLocaleString()}
          </span>
        ) : (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </span>
        )}
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Rows per page
          </Label>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              const n = Number(value);
              table.setPageSize(n);
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {pageIndex + 1} of {computedPageCount}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={pageIndex <= 0}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={pageIndex <= 0}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.setPageIndex(Math.min(computedPageCount - 1, pageIndex + 1))}
            disabled={pageIndex >= computedPageCount - 1}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(computedPageCount - 1)}
            disabled={pageIndex >= computedPageCount - 1}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
