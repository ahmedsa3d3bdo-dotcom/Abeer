"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { getSettingColumns, type SettingRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SettingRow[]>([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [isPublic, setIsPublic] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SettingRow | null>(null);
  const [form, setForm] = useState({ key: "", value: "", type: "string", description: "", isPublic: false });
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<SettingRow | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo(
    () =>
      getSettingColumns({
        actions: {
          onEdit: (row) => {
            setEditing(row);
            setForm({ key: row.key, value: row.value, type: row.type, description: row.description || "", isPublic: row.isPublic });
            setOpen(true);
          },
          onDelete: async (row) => {
            setDeleting(row);
            setDeleteOpen(true);
          },
        },
      }),
    [],
  );

  async function onConfirmDelete() {
    if (!deleting) return;
    try {
      setDeletingLoading(true);
      const res = await fetch(`/api/v1/settings/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong");
      toast.success("Setting deleted");
      setDeleteOpen(false);
      setDeleting(null);
      void fetchSettings();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setDeletingLoading(false);
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
    void fetchSettings();
  }, [q, isPublic, pageIndex, pageSize]);

  async function fetchSettings() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (isPublic !== "all") params.set("isPublic", String(isPublic === "public"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/settings?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong");
      setItems((data.data?.items || []).map((r: any) => ({ ...r })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ key: "", value: "", type: "string", description: "", isPublic: false });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        key: form.key,
        value: form.value,
        type: form.type || "string",
        description: form.description || null,
        isPublic: form.isPublic,
      };
      const res = await fetch(editing ? `/api/v1/settings/${editing.id}` : "/api/v1/settings", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Something went wrong");
      toast.success(editing ? "Setting updated" : "Setting created");
      setOpen(false);
      resetForm();
      void fetchSettings();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search settings..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Visibility</Label>
            <Select value={isPublic} onValueChange={(v) => setIsPublic(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchSettings()} disabled={loading}>
            <RefreshCcw className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Refresh
          </Button>

          <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}>
            <DialogTrigger asChild>
              <Button onClick={() => setOpen(true)}>
                <Plus className="ltr:mr-1 rtl:ml-1 h-4 w-4" /> Add setting
              </Button>
            </DialogTrigger>
            <AppDialogContent
              dir="ltr"
              title={editing ? "Edit setting" : "Create setting"}
              className="sm:max-w-[640px]"
              footer={
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => (setOpen(false), resetForm())}>
                    Cancel
                  </Button>
                  <Button onClick={() => void onSubmit()} disabled={loading || (form.type === "json" && !!jsonError)}>
                    {editing ? "Update" : "Create"}
                  </Button>
                </div>
              }
            >
              <div className="grid gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Key</Label>
                    <Input value={form.key} onChange={(e) => setForm((s) => ({ ...s, key: e.target.value }))} disabled={!!editing} dir="ltr" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Type</Label>
                    <Input value={form.type} onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))} dir="ltr" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Value</Label>
                  {form.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="value-bool"
                        type="checkbox"
                        className="h-4 w-4"
                        checked={form.value === "true"}
                        onChange={(e) => setForm((s) => ({ ...s, value: e.target.checked ? "true" : "false" }))}
                      />
                      <Label htmlFor="value-bool">{form.value === "true" ? "True" : "False"}</Label>
                    </div>
                  ) : form.type === "number" ? (
                    <Input
                      type="number"
                      value={form.value}
                      onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))}
                      dir="ltr"
                    />
                  ) : form.type === "json" ? (
                    <div className="flex flex-col gap-1">
                      <textarea
                        className="min-h-[120px] w-full rounded-md border bg-background p-2 text-sm"
                        value={form.value}
                        dir="ltr"
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((s) => ({ ...s, value: v }));
                          try {
                            if (v.trim().length) JSON.parse(v);
                            setJsonError(null);
                          } catch (err: any) {
                            setJsonError(err.message || "Invalid JSON");
                          }
                        }}
                      />
                      {jsonError ? <span className="text-xs text-red-500">{jsonError}</span> : null}
                    </div>
                  ) : (
                    <Input value={form.value} onChange={(e) => setForm((s) => ({ ...s, value: e.target.value }))} />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2">
                  <input id="isPublic" type="checkbox" className="h-4 w-4" checked={form.isPublic} onChange={(e) => setForm((s) => ({ ...s, isPublic: e.target.checked }))} />
                  <Label htmlFor="isPublic">Public</Label>
                </div>
              </div>
            </AppDialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleting(null);
        }}
        dir="ltr"
        loading={deletingLoading}
        title="Delete"
        description={`Delete setting ${deleting?.key || ""}?`}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
