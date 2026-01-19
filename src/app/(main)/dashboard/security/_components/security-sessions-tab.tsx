import { RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

import type { AdminSessionRow } from "../sessions-columns";

export function SecuritySessionsTab(props: {
  loading: boolean;
  q: string;
  setQ: (v: string) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
  includeRevoked: boolean;
  setIncludeRevoked: (v: boolean) => void;
  table: any;
  columns: any;
  total: number;
  pageIndex: number;
  pageSize: number;
  onRefresh: () => void;
  openRevoke: boolean;
  setOpenRevoke: (v: boolean) => void;
  revoking: boolean;
  revokeTarget: AdminSessionRow | null;
  setRevokeTarget: (v: AdminSessionRow | null) => void;
  onRevoke: (sessionId: string) => void;
}) {
  const {
    loading,
    q,
    setQ,
    showAll,
    setShowAll,
    includeRevoked,
    setIncludeRevoked,
    table,
    columns,
    total,
    pageIndex,
    pageSize,
    onRefresh,
    openRevoke,
    setOpenRevoke,
    revokeTarget,
    setRevokeTarget,
    revoking,
    onRevoke,
  } = props;

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <CardTitle className="text-base">Control panel sessions</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onRefresh()} disabled={loading}>
              <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sessions-q">Search</Label>
            <Input id="sessions-q" placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Show all</div>
              <div className="text-xs text-muted-foreground">Include inactive sessions</div>
            </div>
            <Switch checked={showAll} onCheckedChange={(v) => setShowAll(Boolean(v))} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Include revoked</div>
              <div className="text-xs text-muted-foreground">Show revoked sessions</div>
            </div>
            <Switch checked={includeRevoked} onCheckedChange={(v) => setIncludeRevoked(Boolean(v))} />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border">
          <DataTable table={table as any} columns={columns as any} />
        </div>
        <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

        <Dialog open={openRevoke} onOpenChange={(o) => (o ? setOpenRevoke(true) : (setOpenRevoke(false), setRevokeTarget(null)))}>
          <AppDialogContent dir="ltr" title="Revoke session" className="sm:max-w-lg">
            {revokeTarget ? (
              <div className="grid gap-3">
                <div className="text-sm text-muted-foreground">This will sign the admin out on their next heartbeat.</div>
                <div className="rounded-md border p-3 text-sm">
                  <div className="font-medium">{revokeTarget.userName || revokeTarget.userEmail}</div>
                  <div className="text-muted-foreground">{revokeTarget.userEmail}</div>
                  <div className="mt-2 text-muted-foreground">IP: {revokeTarget.ipAddress || "-"}</div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => (setOpenRevoke(false), setRevokeTarget(null))} disabled={revoking}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={() => onRevoke(revokeTarget.id)} disabled={revoking}>
                    Revoke
                  </Button>
                </div>
              </div>
            ) : null}
          </AppDialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
