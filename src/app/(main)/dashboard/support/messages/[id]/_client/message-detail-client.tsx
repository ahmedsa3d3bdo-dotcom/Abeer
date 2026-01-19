"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UserOption = { id: string; label: string };

export function MessageDetailClient({ id, email, name, subject, message, users, initialAssigneeUserId, initialStatus, initialPriority }: { id: string; email: string; name?: string | null; subject?: string | null; message: string; users: UserOption[]; initialAssigneeUserId?: string | null; initialStatus?: string | null; initialPriority?: string | null; }) {
  const [assignUserId, setAssignUserId] = useState<string>(initialAssigneeUserId || "");
  const [status, setStatus] = useState<string>(initialStatus || "");
  const [priority, setPriority] = useState<string>(initialPriority || "");
  const [templates, setTemplates] = useState<Array<{ slug: string; name: string }>>([]);
  const [templateSlug, setTemplateSlug] = useState<string>("__none");
  const [customSubject, setCustomSubject] = useState<string>("");
  const [customBody, setCustomBody] = useState<string>("");
  const [preview, setPreview] = useState<{ subject: string; body: string }>({ subject: "", body: "" });

  useEffect(() => {
    let abort = false;
    async function loadTemplates() {
      try {
        const res = await fetch(`/api/v1/emails/templates?limit=100`);
        const data = await res.json();
        if (!abort && res.ok) {
          const items = (data.data?.items || []).map((t: any) => ({ slug: t.slug, name: t.name }));
          setTemplates(items);
        }
      } catch {}
    }
    void loadTemplates();
    return () => {
      abort = true;
    };
  }, []);

  useEffect(() => {
    const defaultSubject = `Re: ${subject || "your inquiry"}`;
    const defaultBody = `Hi ${name || "there"},\n\nThanks for your message.`;
    async function computePreview() {
      if (templateSlug && templateSlug !== "__none") {
        try {
          const res = await fetch(`/api/v1/emails/templates/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: templateSlug, variables: { name, email, subject, message }, subject: customSubject || defaultSubject, body: customBody || defaultBody }),
          });
          const data = await res.json();
          if (res.ok && data?.success) {
            setPreview({ subject: data.data.subject, body: data.data.body });
            return;
          }
        } catch {}
      }
      setPreview({ subject: customSubject || defaultSubject, body: customBody || defaultBody });
    }
    void computePreview();
  }, [templateSlug, customSubject, customBody, name, email, subject, message]);

  async function updateAssign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch(`/api/v1/support/messages/${id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assigneeUserId: assignUserId || null }) });
    window.location.reload();
  }

  async function updateStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await fetch(`/api/v1/support/messages/${id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, priority }) });
    window.location.reload();
  }

  async function sendReply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const tpl = templateSlug === "__none" ? "" : templateSlug;
    const res = await fetch(`/api/v1/support/messages/${id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateSlug: tpl || undefined, subject: customSubject, body: customBody, variables: { name, email, subject, message } }) });
    try {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.error?.message || "Failed to queue reply");
      }
      alert("Reply queued to email logs.");
      formEl.reset();
      setTemplateSlug("__none");
      setCustomSubject("");
      setCustomBody("");
    } catch (err: any) {
      alert(err?.message || "Failed to queue reply");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assign</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateAssign} className="space-y-3">
            <Select value={assignUserId || "__none"} onValueChange={(v) => setAssignUserId(v === "__none" ? "" : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status & Priority</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateStatus} className="space-y-3">
            <Select value={status} onValueChange={(v) => setStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" className="w-full">Update</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reply</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendReply} className="space-y-3">
            <Select value={templateSlug} onValueChange={(v) => setTemplateSlug(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose template (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No template</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.slug} value={t.slug}>{t.name} ({t.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input name="subject" placeholder="Custom subject (optional)" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
            <Textarea name="body" placeholder="Custom body (optional)" rows={6} value={customBody} onChange={(e) => setCustomBody(e.target.value)} />
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="font-semibold">Preview</div>
              <div><span className="text-muted-foreground">Subject:</span> {preview.subject}</div>
              <div className="text-muted-foreground">Body:</div>
              <div className="prose prose-invert max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: preview.body }} />
            </div>
            <Button type="submit" className="w-full">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
