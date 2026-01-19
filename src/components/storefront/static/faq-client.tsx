"use client";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type FaqItem = { id: string; q: string; a: string; category: string };

const DEFAULT_ITEMS: FaqItem[] = [
  { id: "ship-1", category: "Shipping", q: "When will my order ship?", a: "Orders ship within 1–2 business days. A tracking email is sent once dispatched." },
  { id: "ship-2", category: "Shipping", q: "Do you offer international shipping?", a: "Yes, to most countries. Duties/taxes are calculated at checkout for a smooth delivery." },
  { id: "returns-1", category: "Returns", q: "What is your return window?", a: "30 days from delivery on unworn items with tags attached." },
  { id: "returns-2", category: "Returns", q: "Are exchanges free?", a: "Size/color exchanges are free for domestic orders." },
  { id: "orders-1", category: "Orders", q: "Can I edit or cancel my order?", a: "We can help if it hasn't shipped yet. Contact us ASAP with your order number." },
  { id: "payments-1", category: "Payments", q: "Which payment methods are accepted?", a: "Major cards, PayPal, and local methods where available." },
  { id: "account-1", category: "Account", q: "How do I reset my password?", a: "Use the Forgot Password link on the sign-in page to receive a reset email." },
];

const CATEGORIES = ["All", "Orders", "Shipping", "Returns", "Payments", "Account"] as const;

export default function FaqClient({ items = DEFAULT_ITEMS }: { items?: FaqItem[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) =>
      (cat === "All" || it.category === cat) &&
      (!q || it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q))
    );
  }, [items, query, cat]);

  return (
    <div className="rounded-xl border ring-1 ring-border bg-card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="sm:w-80">
          <Input placeholder="Search FAQs" value={query} onChange={(e)=>setQuery(e.target.value)} />
        </div>
        <Tabs value={cat} onValueChange={(v)=>setCat(v as any)} className="w-full">
          <TabsList className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>{c}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="mt-4">
        <Accordion type="single" collapsible className="w-full">
          {filtered.map((it) => (
            <AccordionItem key={it.id} value={it.id}>
              <AccordionTrigger>{it.q}</AccordionTrigger>
              <AccordionContent>{it.a}</AccordionContent>
            </AccordionItem>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No results. Try a different keyword or category.</div>
          )}
        </Accordion>
      </div>
    </div>
  );
}
