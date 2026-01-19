"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { toast } from "sonner";
import { Trash2, Star, StarOff, Upload } from "lucide-react";

type ImageItem = {
  id: string;
  url: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt?: string;
};

export function ProductImageGallery({ productId, onDraftChange }: { productId?: string; onDraftChange?: (items: Array<{ id: string; url: string; altText?: string | null; isPrimary?: boolean }>) => void }) {
  const [items, setItems] = React.useState<ImageItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  // Reorder controls removed per request

  React.useEffect(() => {
    if (!productId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function load() {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/products/${productId}/images`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load images");
      const list: ImageItem[] = (data.data?.items || []).map((x: any) => ({
        id: x.id,
        url: x.url,
        altText: x.altText,
        sortOrder: x.sortOrder ?? 0,
        isPrimary: Boolean(x.isPrimary),
        createdAt: x.createdAt,
      }));
      list.sort((a, b) => a.sortOrder - b.sortOrder || (a.createdAt || "").localeCompare(b.createdAt || ""));
      setItems(list);
      // no-op
    } catch (e: any) {
      toast.error(e.message || "Failed to load images");
    } finally {
      setLoading(false);
    }
  }

  async function onFilesSelected(fileList: FileList | File[]) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    try {
      setUploading(true);
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const up = await fetch(`/api/v1/uploads`, { method: "POST", body: fd });
      const upData = await up.json();
      if (!up.ok) throw new Error(upData?.error?.message || "Upload failed");
      const uploaded = (upData.data?.items || []).map((it: any) => ({ url: it.url, altText: null as string | null }));
      if (!uploaded.length) return;
      if (productId) {
        const save = await fetch(`/api/v1/products/${productId}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: uploaded }),
        });
        const saveData = await save.json();
        if (!save.ok) throw new Error(saveData?.error?.message || "Failed to save images");
        toast.success(`Added ${uploaded.length} image${uploaded.length > 1 ? "s" : ""}`);
        void load();
      } else {
        // Draft mode: keep locally
        setItems((prev) => {
          const toAdd = uploaded.map((u: { url: string; altText: string | null }, idx: number) => ({
            id: (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) + "_" + idx,
            url: u.url,
            altText: u.altText,
            sortOrder: (prev.length + idx),
            isPrimary: prev.length === 0 && idx === 0 ? true : false,
          }));
          const next = [...prev, ...toAdd];
          onDraftChange?.(next.map(({ id, url, altText, isPrimary }) => ({ id, url, altText, isPrimary })));
          toast.success(`Added ${toAdd.length} image${toAdd.length > 1 ? "s" : ""}`);
          return next;
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function setPrimary(id: string) {
    if (!productId) {
      setItems((prev) => {
        const next = prev.map((x) => ({ ...x, isPrimary: x.id === id }));
        onDraftChange?.(next.map(({ id, url, altText, isPrimary }) => ({ id, url, altText, isPrimary })));
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`/api/v1/products/${productId}/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to set primary");
      toast.success("Primary image set");
      void load();
    } catch (e: any) {
      toast.error(e.message || "Failed to set primary");
    }
  }

  async function updateAlt(id: string, altText: string) {
    if (!productId) {
      setItems((prev) => {
        const next = prev.map((x) => (x.id === id ? { ...x, altText } : x));
        onDraftChange?.(next.map(({ id, url, altText, isPrimary }) => ({ id, url, altText, isPrimary })));
        return next;
      });
      return;
    }
    try {
      const res = await fetch(`/api/v1/products/${productId}/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to update alt text");
      toast.success("Alt text updated");
    } catch (e: any) {
      toast.error(e.message || "Failed to update alt text");
    }
  }

  async function doRemoveImage(id: string) {
    if (!productId) {
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== id);
        onDraftChange?.(next.map(({ id, url, altText, isPrimary }) => ({ id, url, altText, isPrimary })));
        return next;
      });
      toast.success("Image deleted");
      return;
    }
    try {
      setDeleting(true);
      const res = await fetch(`/api/v1/products/${productId}/images/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to delete image");
      toast.success("Image deleted");
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete image");
    } finally {
      setDeleting(false);
    }
  }

  function removeImage(id: string) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  // Reorder function removed

  // Save order removed

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Images</Label>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => e.currentTarget.files && onFilesSelected(e.currentTarget.files)}
            />
            <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={(e) => {
              const input = (e.currentTarget.previousSibling as HTMLInputElement) || null;
              if (input) input.click();
            }}>
              <Upload className="mr-1 h-4 w-4" /> Upload
            </Button>
          </label>
          {/* Reorder save removed */}
        </div>
      </div>
      <div
        className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!productId) return;
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length) void onFilesSelected(files);
        }}
      >
        Drag and drop images here or use the Upload button above.
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading images...</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No images yet.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((img, i) => (
            <div key={img.id} className="rounded-md border p-2">
              <div className="relative aspect-square overflow-hidden rounded">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.altText || ""} className="h-full w-full object-cover" />
                {img.isPrimary ? (
                  <div className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">Primary</div>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-end gap-2">
                <div className="flex items-center gap-1">
                  <Button type="button" size="icon" variant="outline" className="size-8" onClick={() => void setPrimary(img.id)} title="Set as primary" disabled={!productId}>
                    {img.isPrimary ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="destructive" className="size-8" onClick={() => void removeImage(img.id)} disabled={!productId}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-2">
                <Label className="mb-1 block text-xs">Alt text</Label>
                <Input
                  value={img.altText || ""}
                  onChange={(e) =>
                    setItems((prev) => prev.map((x) => (x.id === img.id ? { ...x, altText: e.target.value } : x)))
                  }
                  onBlur={(e) => void updateAlt(img.id, e.target.value)}
                  placeholder="Describe the image"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => (o ? setDeleteOpen(true) : (setDeleteOpen(false), setDeleteId(null)))}
        loading={deleting}
        title="Delete image"
        description="This will permanently delete this image."
        cancelText="Cancel"
        confirmText="Delete"
        onConfirm={async () => {
          if (!deleteId) return;
          await doRemoveImage(deleteId);
          setDeleteOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
