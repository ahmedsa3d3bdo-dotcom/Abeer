"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Users as UsersIcon, CheckCircle2, PauseCircle, Calendar, MailCheck, Image as ImageIcon, LogIn, Printer } from "lucide-react";
import { toast } from "sonner";

import { MetricCard } from "@/components/common/metric-card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrint } from "@/components/common/print/print-provider";
import { FormModal } from "@/components/ui/form-modal";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { AppDialogContent } from "@/components/ui/app-dialog";
import { Spinner } from "@/components/ui/spinner";

import { getUserColumns, type UserRow } from "./columns";

type RoleOption = { id: string; name: string; slug: string };

const DEFAULT_LIMIT = 10;

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const { print, isPrinting } = usePrint();
  const [printPreparing, setPrintPreparing] = useState(false);

  // Table data
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<any | null>(null);

  // Query state
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState<string>("all"); // all | active | inactive
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_LIMIT);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isActive: true,
    roles: [] as string[],
  });

  // Reset password dialog state and handler
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMode, setResetMode] = useState<"email" | "set">("email");
  const [newPwd, setNewPwd] = useState("");
  const [newPwdConfirm, setNewPwdConfirm] = useState("");

  async function handleSendReset() {
    if (!resetTarget) return;
    try {
      setSendingReset(true);
      let res: Response;
      if (resetMode === "email") {
        res = await fetch(`/api/v1/users/${resetTarget.id}/reset-password`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to send reset email");
        toast.success(`Reset email sent to ${resetTarget.email}`);
      } else {
        if (!newPwd || newPwd.length < 6) throw new Error("Password must be at least 6 characters");
        if (newPwd !== newPwdConfirm) throw new Error("Passwords do not match");
        res = await fetch(`/api/v1/users/${resetTarget.id}/set-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPwd }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Failed to update password");
        toast.success("Password updated successfully");
      }
      setResetOpen(false);
      setResetTarget(null);
      setResetMode("email");
      setNewPwd("");
      setNewPwdConfirm("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reset email");
    } finally {
      setSendingReset(false);
    }
  }

  const columns = useMemo(
    () =>
      getUserColumns({
        onEdit: (row) => {
          setEditing(row);
          setForm({
            email: row.email,
            password: "",
            firstName: row.firstName || "",
            lastName: row.lastName || "",
            isActive: row.isActive,
            roles: (row.roles || []).map((r) => r.slug),
          });
          setOpen(true);
        },
        onReset: (row) => {
          setResetTarget(row);
          setResetOpen(true);
        },
        onDelete: (row) => {
          setDeleteTarget(row);
          setDeleteOpen(true);
        },
      }),
    [roles],
  );

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/users/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete");
      toast.success("User deleted");
      setDeleteOpen(false);
      setDeleteTarget(null);
      void fetchUsers();
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

  function getListParamsBase(extra: { page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (role) params.set("role", role);
    if (isActive !== "all") params.set("isActive", String(isActive === "active"));
    params.set("sort", "createdAt.desc");
    if (typeof extra.page === "number") params.set("page", String(extra.page));
    if (typeof extra.limit === "number") params.set("limit", String(extra.limit));
    return params;
  }

  async function fetchAllUsersMatchingFilters() {
    const limit = 100;
    let page = 1;
    let all: UserRow[] = [];
    let expectedTotal: number | null = null;

    while (true) {
      const params = getListParamsBase({ page, limit });
      const res = await fetch(`/api/v1/users?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load users");
      const batch: UserRow[] = (data.data?.items || []).map((u: any) => ({ ...u, createdAt: u.createdAt }));
      expectedTotal = expectedTotal ?? Number(data.data?.total || 0);
      all = all.concat(batch);
      if (batch.length < limit) break;
      if (expectedTotal !== null && all.length >= expectedTotal) break;
      page += 1;
      if (page > 200) break;
    }
    return all;
  }

  function renderUsersPrint(rows: UserRow[], title: string) {
    return (
      <div className="p-6">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">Total: {rows.length}</div>
        <div className="mt-4 rounded-md border">
          <div className="grid grid-cols-12 gap-2 border-b p-2 text-xs text-muted-foreground">
            <div className="col-span-5">User</div>
            <div className="col-span-4">Roles</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Created</div>
          </div>
          {rows.map((u) => (
            <div key={u.id} className="grid grid-cols-12 gap-2 border-b p-2 text-sm">
              <div className="col-span-5">
                <div className="font-medium">{u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="col-span-4">{(u.roles || []).map((r) => r.slug).join(", ") || "—"}</div>
              <div className="col-span-1">{u.isActive ? "Active" : "Inactive"}</div>
              <div className="col-span-2">{u.createdAt ? new Date(u.createdAt as any).toLocaleDateString() : "—"}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  async function printSelectedUsers() {
    const selected = (table as any).getSelectedRowModel?.().rows?.map((r: any) => r.original as UserRow) || [];
    if (!selected.length) {
      toast.error("Select at least one user to print");
      return;
    }
    void print(renderUsersPrint(selected, "Users (Selected)"));
  }

  async function printAllUsers() {
    try {
      setPrintPreparing(true);
      const all = await fetchAllUsersMatchingFilters();
      setPrintPreparing(false);
      void print(renderUsersPrint(all, "Users"));
    } catch (e: any) {
      toast.error(e?.message || "Failed to prepare print");
      setPrintPreparing(false);
    }
  }

  // Table pagination state is synced via onPaginationChange above

  useEffect(() => {
    void fetchRoles();
  }, []);

  useEffect(() => {
    void fetchUsers();
    void fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, isActive, pageIndex, pageSize]);

  async function fetchMetrics() {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (isActive !== "all") params.set("isActive", String(isActive === "active"));
      const res = await fetch(`/api/v1/users/metrics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load metrics");
      setMetrics(data.data || null);
    } catch {}
  }

  async function fetchRoles() {
    try {
      const res = await fetch("/api/v1/users/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load roles");
      setRoles(data.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load roles");
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (role) params.set("role", role);
      if (isActive !== "all") params.set("isActive", String(isActive === "active"));
      params.set("page", String(pageIndex + 1));
      params.set("limit", String(pageSize));
      params.set("sort", "createdAt.desc");
      const res = await fetch(`/api/v1/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load users");
      setItems((data.data?.items || []).map((u: any) => ({ ...u, createdAt: u.createdAt })));
      setTotal(data.data?.total || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ email: "", password: "", firstName: "", lastName: "", isActive: true, roles: [] });
  }

  async function onSubmit() {
    try {
      const payload: any = {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        isActive: form.isActive,
        roles: form.roles,
      };
      if (!editing) payload.password = form.password;
      const res = await fetch(editing ? `/api/v1/users/${editing.id}` : "/api/v1/users", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Save failed");
      toast.success(editing ? "User updated" : "User created");
      setOpen(false);
      resetForm();
      void fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    }
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Total users" value={metrics?.totalUsers ?? total} icon={UsersIcon} tone="blue" />
        <MetricCard title="Active" value={Number(metrics?.activeUsers ?? 0)} icon={CheckCircle2} tone="emerald" />
        <MetricCard title="Inactive" value={Number(metrics?.inactiveUsers ?? 0)} icon={PauseCircle} tone="slate" />
        <MetricCard title="New (30d)" value={Number(metrics?.newUsers30d ?? 0)} icon={Calendar} tone="violet" />
        <MetricCard title="Email verified" value={Number(metrics?.emailVerified ?? 0)} icon={MailCheck} tone="emerald" />
        <MetricCard title="With avatar" value={Number(metrics?.withAvatar ?? 0)} icon={ImageIcon} tone="amber" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <MetricCard title="Logged in (30d)" value={Number(metrics?.lastLogin30d ?? 0)} icon={LogIn} tone="blue" />
      </div>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q">Search</Label>
            <Input id="q" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select value={role ?? "all"} onValueChange={(v) => setRole(v === "all" ? undefined : v)}>
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={isActive} onValueChange={(v) => setIsActive(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchUsers()} disabled={loading}>
            <RefreshCcw className="mr-1 h-4 w-4" /> Refresh
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={loading || printPreparing || isPrinting}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void printSelectedUsers()}>Print selected</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void printAllUsers()}>Print all (matching filters)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormModal
            open={open}
            onOpenChange={(o) => (o ? setOpen(true) : (setOpen(false), resetForm()))}
            title={editing ? "Edit User" : "Create User"}
            className="sm:max-w-[520px]"
            submitting={loading}
            submitText={editing ? "Update" : "Create"}
            onSubmit={onSubmit}
            trigger={
              <Button>
                <Plus className="mr-1 h-4 w-4" /> Add User
              </Button>
            }
          >
            <div className="grid gap-3 py-2">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Password{editing ? " (leave blank to keep)" : ""}</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                      placeholder={editing ? "••••••••" : "Strong password"}
                      disabled={!!editing}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label>First Name</Label>
                    <Input value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Last Name</Label>
                    <Input value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((s) => ({ ...s, isActive: Boolean(v) }))}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Roles</Label>
                  <div className="flex flex-wrap gap-3">
                    {roles.map((r) => {
                      const checked = form.roles.includes(r.slug);
                      return (
                        <label key={r.slug} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setForm((s) => ({
                                ...s,
                                roles: v ? [...s.roles, r.slug] : s.roles.filter((x) => x !== r.slug),
                              }))
                            }
                          />
                          <span className="capitalize">{r.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
          </FormModal>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border">
        <DataTable table={table as any} columns={columns as any} />
      </div>
      <DataTablePagination table={table as any} total={total} pageIndex={pageIndex} pageSize={pageSize} />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteTarget(null)))}
        loading={deleting}
        title="Delete user"
        description={deleteTarget ? `This will permanently delete \"${deleteTarget.email}\".` : "This will permanently delete the selected user."}
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={onConfirmDelete}
      />

      {/* Reset Password Dialog */}
      <Dialog
        open={resetOpen}
        onOpenChange={(o) =>
          o
            ? setResetOpen(true)
            : (setResetOpen(false), setResetTarget(null), setResetMode("email"), setNewPwd(""), setNewPwdConfirm(""))
        }
      >
        <AppDialogContent
          title="Reset Password"
          description="Choose a reset method and confirm."
          className="sm:max-w-[520px]"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                disabled={sendingReset}
                onClick={() => (setResetOpen(false), setResetTarget(null), setResetMode("email"), setNewPwd(""), setNewPwdConfirm(""))}
              >
                Cancel
              </Button>
              <Button type="button" onClick={() => void handleSendReset()} disabled={sendingReset}>
                <span className="inline-flex items-center gap-2">
                  {sendingReset ? <Spinner /> : null}
                  {resetMode === "email" ? "Send Email" : "Update Password"}
                </span>
              </Button>
            </div>
          }
        >
          <div className="grid gap-4 text-sm">
            <div className="grid gap-2">
              <Label>Mode</Label>
              <Select value={resetMode} onValueChange={(v) => setResetMode(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Send email to user</SelectItem>
                  <SelectItem value="set">Set a new password now</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {resetMode === "email" ? (
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-xs text-muted-foreground">Send a password reset email to</div>
                <div className="mt-1 font-medium break-words">{resetTarget?.email}</div>
                <div className="mt-2 text-xs text-muted-foreground">They will receive a link to set a new password. The link expires in 1 hour.</div>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label>New Password</Label>
                  <Input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Confirm Password</Label>
                  <Input type="password" value={newPwdConfirm} onChange={(e) => setNewPwdConfirm(e.target.value)} placeholder="Confirm password" />
                </div>
              </div>
            )}
          </div>
        </AppDialogContent>
      </Dialog>
    </div>
  );
}
