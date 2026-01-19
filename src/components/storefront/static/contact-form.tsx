"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null); setErr(null);
    if (!isValidEmail(email)) { setErr("Please enter a valid email."); return; }
    if (message.trim().length < 10) { setErr("Message should be at least 10 characters."); return; }
    try {
      setLoading(true);
      const res = await fetch("/api/storefront/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "Failed to send");
      setOk("Thanks! We received your message and will reply shortly.");
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-1">
        <label className="block text-sm font-medium mb-1">Name</label>
        <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Your name" />
      </div>
      <div className="md:col-span-1">
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required className="w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="you@example.com" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input value={subject} onChange={(e)=>setSubject(e.target.value)} className="w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="What can we help with?" />
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea value={message} onChange={(e)=>setMessage(e.target.value)} rows={6} className="w-full rounded-lg border bg-background px-3 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Describe your request" />
      </div>
      <div className="md:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={loading}>{loading? "Sending..." : "Send message"}</Button>
        {ok && <span className="text-sm text-green-600">{ok}</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </form>
  );
}
