"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

import { getTemplateColumns, type TemplateRow } from "./columns";

const DEFAULT_LIMIT = 10;

export default function TemplatesPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TemplateRow[]>([]);
  const [total, setTotal] = useState(0);

  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", subject: "", body: "", variables: "{}", isActive: true });

  const columns = useMemo(
    () =>
      getTemplateColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({ name: row.name, slug: row.slug, subject: row.subject, body: (row as any).body || "", variables: JSON.stringify((row as any).variables || {}, null, 2), isActive: row.isActive });
          setOpen(true);
        },
        onDelete: (row) => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
      }),
    [],
  );

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/emails/templates/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete template");
      toast.success("Template deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
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
    void fetchTemplates();
  }, [pageIndex, pageSize]);

  async function fetchTemplates() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      if (search) params.set("search", search);
      const res = await fetch(`/api/v1/emails/templates?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load templates");
      setItems((data.data?.items || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug, subject: r.subject, isActive: r.isActive, updatedAt: r.updatedAt })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  function onOpenCreate() {
    setEditing(null);
    setForm({ name: "", slug: "", subject: "", body: "", variables: "{}", isActive: true });
    setOpen(true);
  }

  async function save() {
    try {
      let variables: any = {};
      try {
        variables = form.variables ? JSON.parse(form.variables) : {};
      } catch {
        toast.error("Variables must be valid JSON");
        return;
      }
      setSaving(true);
      const payload = { name: form.name, slug: form.slug, subject: form.subject, body: form.body, variables, isActive: form.isActive };
      const url = editing ? `/api/v1/emails/templates/${editing.id}` : `/api/v1/emails/templates`;
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success("Saved");
      setOpen(false);
      void fetchTemplates();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    const to = prompt("Send test to (email)");
    if (!to) return;
    try {
      const res = await fetch(`/api/v1/emails/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject: form.subject || "Test", html: form.body || undefined, text: !form.body ? "Test" : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Send failed");
      toast.success("Test email sent");
    } catch (e: any) {
      toast.error(e.message || "Send failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchTemplates()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={() => onOpenCreate()} disabled={loading}>
            <Plus className="mr-1 h-4 w-4" /> New Template
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && fetchTemplates()} className="w-56" />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <FormModal
        open={open}
        onOpenChange={(o) => (o ? setOpen(true) : setOpen(false))}
        title={editing ? "Edit Template" : "New Template"}
        className="sm:max-w-3xl"
        submitting={saving}
        onSubmit={save}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Button variant="secondary" onClick={() => void sendTest()} disabled={saving}>
                Send Test
              </Button>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" type="button" disabled={saving} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={saving} onClick={() => void save()}>
                Save
              </Button>
            </div>
          </div>
        }
      >
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Body (HTML allowed)</Label>
            <Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="min-h-48" />
          </div>
          <div>
            <Label>Variables (JSON)</Label>
            <Textarea
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
              className="min-h-32 font-mono text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: Boolean(v) })} /> Active
          </label>
        </div>
      </FormModal>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete template"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.name}\".` : "This will permanently delete the selected template."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
