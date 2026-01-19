"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, RefreshCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { LocalDateTime } from "@/components/common/local-datetime";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getBackupColumns, type BackupRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function BackupsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BackupRow[]>([]);
  const [total, setTotal] = useState(0);

  const [autoOpen, setAutoOpen] = useState(false);

  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: "daily" as "daily" | "weekly",
    weekday: 0,
    time: "02:00",
    timeZone: "Canada/Ontario",
    keepLast: 10,
    maxAgeDays: 30,
    lastRunAt: null as string | null,
    lastBackupId: null as string | null,
  });

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [restoreAfterUpload, setRestoreAfterUpload] = useState(true);
  const [uploadName, setUploadName] = useState(() => "Backup");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"restore" | "delete" | "runAutoNow" | "runRetention" | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<BackupRow | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const columns = useMemo(
    () =>
      getBackupColumns({
        actions: {
          onDownload: (row) => {
            window.open(`/api/v1/backups/${row.id}/download`, "_blank");
          },
          onRestore: async (row) => {
            setConfirmTarget(row);
            setConfirmAction("restore");
            setConfirmOpen(true);
          },
          onDelete: async (row) => {
            setConfirmTarget(row);
            setConfirmAction("delete");
            setConfirmOpen(true);
          },
        },
      }),
    [],
  );

  async function onConfirmAction() {
    if (!confirmAction) return;
    try {
      setConfirmLoading(true);

      if (confirmAction === "restore") {
        if (!confirmTarget) return;
        const res = await fetch(`/api/v1/backups/${confirmTarget.id}/restore`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Restore failed");
        toast.success("Restore completed");
        void fetchBackups();
        void fetchSchedule();
      }

      if (confirmAction === "delete") {
        if (!confirmTarget) return;
        const res = await fetch(`/api/v1/backups/${confirmTarget.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Failed to delete backup");
        toast.success("Backup deleted");
        void fetchBackups();
        void fetchSchedule();
      }

      if (confirmAction === "runAutoNow") {
        const res = await fetch(`/api/v1/backups/schedule/run`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Failed to run automatic backup");
        if (data?.data?.skipped) {
          toast.message(`Skipped: ${String(data.data.reason || "")}`);
        } else {
          toast.success("Automatic backup completed");
        }
        void fetchBackups();
        void fetchSchedule();
      }

      if (confirmAction === "runRetention") {
        const res = await fetch(`/api/v1/backups/retention`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keepLast: 5 }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || "Retention cleanup failed");
        toast.success(`Retention cleanup removed ${Number(data.data?.deleted ?? 0)} backups`);
        void fetchBackups();
      }

      setConfirmOpen(false);
      setConfirmAction(null);
      setConfirmTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setConfirmLoading(false);
    }
  }

  const table = useDataTableInstance({
    data: items,
    columns,
    manualPagination: true,
    defaultPageIndex: pageIndex,
    defaultPageSize: pageSize,
    pageCount: Math.max(1, Math.ceil(total / Math.max(1, pageSize))),
    getRowId: (row) => row.id,
    onPaginationChange: ({ pageIndex: pi, pageSize: ps }) => {
      setPageIndex(pi);
      setPageSize(ps);
    },
  });

  useEffect(() => {
    void fetchBackups();
  }, [pageIndex, pageSize]);

  useEffect(() => {
    void fetchSchedule();
  }, []);

  async function fetchSchedule() {
    try {
      setScheduleLoading(true);
      const res = await fetch(`/api/v1/backups/schedule`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load schedule");
      setSchedule((s) => ({ ...s, ...(data.data || {}) }));
    } catch (e: any) {
      toast.error(e.message || "Failed to load schedule");
    } finally {
      setScheduleLoading(false);
    }
  }

  async function saveSchedule() {
    try {
      setScheduleSaving(true);
      const res = await fetch(`/api/v1/backups/schedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: schedule.enabled,
          frequency: schedule.frequency,
          weekday: schedule.weekday,
          time: schedule.time,
          timeZone: schedule.timeZone,
          keepLast: schedule.keepLast,
          maxAgeDays: schedule.maxAgeDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to save schedule");
      toast.success("Schedule saved");
      setSchedule((s) => ({ ...s, ...(data.data || {}) }));
    } catch (e: any) {
      toast.error(e.message || "Failed to save schedule");
    } finally {
      setScheduleSaving(false);
    }
  }

  async function runAutoNow() {
    setConfirmTarget(null);
    setConfirmAction("runAutoNow");
    setConfirmOpen(true);
  }

  async function fetchBackups() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/backups?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load backups");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load backups");
    } finally {
      setLoading(false);
    }
  }

  async function createBackup() {
    try {
      const res = await fetch(`/api/v1/backups`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create backup");
      toast.success("Backup created");
      void fetchBackups();
    } catch (e: any) {
      toast.error(e.message || "Failed to create backup");
    }
  }

  async function runRetention() {
    setConfirmTarget(null);
    setConfirmAction("runRetention");
    setConfirmOpen(true);
  }

  async function submitUpload() {
    if (!uploadFile) {
      toast.error("Please select a backup file");
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.set("file", uploadFile);
      if (uploadName.trim()) fd.set("name", uploadName.trim());
      const res = await fetch(`/api/v1/backups/upload?restore=${restoreAfterUpload ? "true" : "false"}`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
      toast.success(restoreAfterUpload ? "Uploaded and restored" : "Uploaded");
      setUploadOpen(false);
      setUploadFile(null);
      setRestoreAfterUpload(true);
      setUploadName("Backup");
      void fetchBackups();
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchBackups()} disabled={loading}>
            <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => void createBackup()} disabled={loading}>
            <Plus className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Create backup
          </Button>
          <Button variant="outline" onClick={() => setUploadOpen(true)} disabled={loading}>
            <Upload className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Upload backup
          </Button>
          <Button variant="secondary" onClick={() => void runRetention()} disabled={loading}>
            Retention cleanup
          </Button>
        </div>
      </div>

      <Collapsible open={autoOpen} onOpenChange={setAutoOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="py-4 cursor-pointer">
              <div className="flex items-center justify-between gap-3">
                <CardTitle>Automatic backups</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${autoOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="autoBackupEnabled"
                  checked={schedule.enabled}
                  onCheckedChange={(v) => setSchedule((s) => ({ ...s, enabled: Boolean(v) }))}
                  disabled={scheduleLoading || scheduleSaving}
                />
                <Label htmlFor="autoBackupEnabled">Enable automatic backups</Label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Select
                    value={schedule.frequency}
                    onValueChange={(v) => setSchedule((s) => ({ ...s, frequency: (v as any) || "daily" }))}
                    disabled={scheduleLoading || scheduleSaving}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Daily" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Time</Label>
                  <Input
                    value={schedule.time}
                    onChange={(e) => setSchedule((s) => ({ ...s, time: e.target.value }))}
                    placeholder="02:00"
                    dir="ltr"
                    disabled={scheduleLoading || scheduleSaving}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Time zone</Label>
                  <Input
                    value={schedule.timeZone}
                    onChange={(e) => setSchedule((s) => ({ ...s, timeZone: e.target.value }))}
                    placeholder="Africa/Cairo"
                    dir="ltr"
                    disabled={scheduleLoading || scheduleSaving}
                  />
                </div>
              </div>

              {schedule.frequency === "weekly" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Weekday</Label>
                    <Select
                      value={String(schedule.weekday)}
                      onValueChange={(v) => setSchedule((s) => ({ ...s, weekday: Number(v) }))}
                      disabled={scheduleLoading || scheduleSaving}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 text-sm text-muted-foreground self-end">
                    {schedule.lastRunAt ? (
                      <>
                        Last run: <LocalDateTime value={schedule.lastRunAt} />
                      </>
                    ) : (
                      "Never run"
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {schedule.lastRunAt ? (
                    <>
                      Last run: <LocalDateTime value={schedule.lastRunAt} />
                    </>
                  ) : (
                    "Never run"
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Keep last</Label>
                  <Input
                    type="number"
                    value={String(schedule.keepLast)}
                    onChange={(e) => setSchedule((s) => ({ ...s, keepLast: Number(e.target.value || 0) }))}
                    dir="ltr"
                    disabled={scheduleLoading || scheduleSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Max age (days)</Label>
                  <Input
                    type="number"
                    value={String(schedule.maxAgeDays)}
                    onChange={(e) => setSchedule((s) => ({ ...s, maxAgeDays: Number(e.target.value || 0) }))}
                    dir="ltr"
                    disabled={scheduleLoading || scheduleSaving}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="outline" onClick={() => void fetchSchedule()} disabled={scheduleLoading || scheduleSaving}>
                    Refresh
                  </Button>
                  <Button onClick={() => void saveSchedule()} disabled={scheduleLoading || scheduleSaving}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => void runAutoNow()} disabled={scheduleLoading || scheduleSaving}>
                    Run now
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <AppDialogContent
          dir="ltr"
          title="Upload backup"
          className="sm:max-w-xl"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={() => void submitUpload()} disabled={uploading}>
                {restoreAfterUpload ? "Upload & restore" : "Upload"}
              </Button>
            </div>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="Backup" />
            </div>
            <div className="grid gap-2">
              <Label>File</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="restoreAfterUpload" checked={restoreAfterUpload} onCheckedChange={(v) => setRestoreAfterUpload(Boolean(v))} />
              <Label htmlFor="restoreAfterUpload">Restore after upload</Label>
            </div>
          </div>
        </AppDialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={(o) => {
          setConfirmOpen(o);
          if (!o) {
            setConfirmAction(null);
            setConfirmTarget(null);
          }
        }}
        dir="ltr"
        loading={confirmLoading}
        title={confirmAction === "delete" ? "Delete" : confirmAction === "restore" ? "Confirm" : "Confirm"}
        description={
          confirmAction === "delete"
            ? `Delete backup ${confirmTarget?.name || ""}?`
            : confirmAction === "restore"
              ? `Restore backup ${confirmTarget?.name || ""}?`
              : confirmAction === "runRetention"
                ? "Run retention cleanup now?"
                : "Run automatic backup now?"
        }
        cancelText="Cancel"
        confirmText={confirmAction === "delete" ? "Delete" : "Confirm"}
        onConfirm={onConfirmAction}
      />
    </div>
  );
}
