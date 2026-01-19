"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X, ArrowUp, ArrowDown, History, Flame } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "use-debounce";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 250);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<{ products: any[]; categories: any[]; popularQueries: string[] } | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  const inCategorySlug = useMemo(() => {
    const m = pathname.match(/^\/shop\/(.+)/);
    if (m && !m[1].includes("/")) return m[1];
    return undefined;
  }, [pathname]);

  const inCategoryId = useMemo(() => {
    const id = searchParams.get("categoryId");
    return id || undefined;
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("recent-searches") || "[]";
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) setRecent(arr.slice(0, 8));
    } catch {}
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const q = debouncedQuery.trim();
      if (!focused) return;
      if (!q) {
        // Load just categories and popular queries when empty
        try {
          const res = await fetch(`/api/storefront/search/suggestions?limit=6${inCategoryId ? `&categoryId=${encodeURIComponent(inCategoryId)}` : ""}`, { signal: controller.signal });
          const data = await res.json();
          if (data?.success) setSuggestions(data.data);
          setOpen(true);
          setActiveIndex(0);
        } catch {}
        return;
      }
      try {
        const res = await fetch(`/api/storefront/search/suggestions?q=${encodeURIComponent(q)}&limit=6${inCategoryId ? `&categoryId=${encodeURIComponent(inCategoryId)}` : ""}`, { signal: controller.signal });
        const data = await res.json();
        if (data?.success) setSuggestions(data.data);
        setOpen(true);
        setActiveIndex(0);
      } catch {}
    };
    run();
    return () => controller.abort();
  }, [debouncedQuery, inCategoryId, focused]);

  // Close on outside click
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!formRef.current) return;
      if (!formRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  // Close on route change for extra safety
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items: Array<{ type: "product" | "category" | "recent" | "popular" | "see_all"; value: any }>= useMemo(() => {
    const list: any[] = [];
    if (debouncedQuery.trim().length === 0) {
      // recent and popular when empty
      recent.forEach((r) => list.push({ type: "recent", value: r }));
      (suggestions?.popularQueries || []).forEach((p) => list.push({ type: "popular", value: p }));
      (suggestions?.categories || []).forEach((c) => list.push({ type: "category", value: c }));
    } else {
      (suggestions?.products || []).forEach((p) => list.push({ type: "product", value: p }));
      (suggestions?.categories || []).forEach((c) => list.push({ type: "category", value: c }));
      list.push({ type: "see_all", value: debouncedQuery.trim() });
    }
    return list;
  }, [debouncedQuery, suggestions, recent]);

  const highlight = (text: string, q: string) => {
    if (!q) return text;
    try {
      const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
      const parts = text.split(re);
      return (
        <>
          {parts.map((p, i) => (
            i % 2 === 1 ? (
              <mark key={i} className="bg-transparent text-primary font-semibold">{p}</mark>
            ) : (
              <span key={i}>{p}</span>
            )
          ))}
        </>
      );
    } catch {
      return text;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    saveRecent(q);
    // Prefer category context if present
    const to = inCategoryId
      ? `/shop?categoryId=${encodeURIComponent(inCategoryId)}&q=${encodeURIComponent(q)}`
      : `/shop?q=${encodeURIComponent(q)}`;
    trackAnalytics("submit", { q });
    router.push(to);
    setOpen(false);
    onClose?.();
  };

  const handleClear = () => {
    setQuery("");
    setOpen(false);
  };

  const saveRecent = (q: string) => {
    try {
      const raw = localStorage.getItem("recent-searches") || "[]";
      const arr: string[] = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const next = [q, ...arr.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
      localStorage.setItem("recent-searches", JSON.stringify(next));
      setRecent(next);
    } catch {}
  };

  const trackAnalytics = async (event: string, payload: any) => {
    try {
      await fetch("/api/storefront/analytics/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, ...payload, ts: Date.now() }),
        keepalive: true,
      });
    } catch {}
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(items[activeIndex]);
    } else if (e.key === "Tab") {
      if (items[activeIndex]) {
        const it = items[activeIndex];
        if (it.type === "product" || it.type === "category" || it.type === "popular" || it.type === "recent") {
          e.preventDefault();
          setQuery(it.type === "product" ? it.value.name : it.type === "category" ? it.value.name : String(it.value));
        }
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const select = (it: { type: string; value: any }) => {
    if (it.type === "product") {
      trackAnalytics("click_product", { q: query.trim(), id: it.value.id });
      router.push(`/product/${it.value.slug}`);
      setOpen(false);
      onClose?.();
      return;
    }
    if (it.type === "category") {
      const q = query.trim();
      trackAnalytics("click_category", { q, id: it.value.id });
      router.push(
        q
          ? `/shop?categoryId=${encodeURIComponent(it.value.id)}&q=${encodeURIComponent(q)}`
          : `/shop?categoryId=${encodeURIComponent(it.value.id)}`
      );
      setOpen(false);
      onClose?.();
      return;
    }
    const q = (it.type === "popular" || it.type === "recent" || it.type === "see_all") ? String(it.value) : query.trim();
    if (q) {
      saveRecent(q);
      trackAnalytics("click_search", { q });
      const to = inCategoryId
        ? `/shop?categoryId=${encodeURIComponent(inCategoryId)}&q=${encodeURIComponent(q)}`
        : `/shop?q=${encodeURIComponent(q)}`;
      router.push(to);
      setOpen(false);
      onClose?.();
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search for products..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={(e) => {
          setFocused(false);
          const next = (e.relatedTarget as Node) || document.activeElement;
          if (next && formRef.current?.contains(next)) {
            return; // keep open when moving focus within the suggestions inside the form
          }
          setOpen(false);
        }}
        className="h-11 pl-9 pr-10 rounded-full bg-muted/60 border border-muted/60 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="search-suggestions"
      />
      {query && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 h-full -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Clear search</span>
        </Button>
      )}

      {open && (
        <div
          id="search-suggestions"
          ref={listRef}
          className="absolute left-0 right-0 z-50 mt-2 rounded-xl border bg-popover text-popover-foreground shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* Mobile header with Close action */}
          <div className="md:hidden flex items-center justify-between px-3 py-2 border-b bg-popover/80 backdrop-blur">
            <span className="text-sm font-medium">Suggestions</span>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>

          <div className="max-h-96 overflow-auto">
            {items.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground">Start typing to search</div>
            )}
            {items.map((it, idx) => {
              const isActive = idx === activeIndex;
              if (it.type === "product") {
                const p = it.value;
                return (
                  <button
                    key={`p-${p.id}`}
                    type="button"
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm ${isActive ? "bg-accent" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => select(it)}
                    role="option"
                    aria-selected={isActive}
                  >
                    <img src={p.primaryImage} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1">
                      <div className="font-medium line-clamp-1">{highlight(p.name, debouncedQuery)}</div>
                      <div className="text-xs text-muted-foreground">
                        ${'{'}typeof p.price === "number" ? p.price.toFixed(2) : String(p.price){'}'}
                      </div>
                    </div>
                  </button>
                );
              }
              if (it.type === "category") {
                const c = it.value;
                return (
                  <button
                    key={`c-${c.id}`}
                    type="button"
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm ${isActive ? "bg-accent" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => select(it)}
                    role="option"
                    aria-selected={isActive}
                  >
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs font-semibold">#</div>
                    <div className="flex-1">
                      <div className="font-medium">{highlight(c.name, debouncedQuery)}</div>
                      <div className="text-xs text-muted-foreground">Category</div>
                    </div>
                  </button>
                );
              }
              if (it.type === "recent" || it.type === "popular") {
                const label = String(it.value);
                return (
                  <button
                    key={`${it.type}-${label}`}
                    type="button"
                    className={`w-full px-4 py-3 flex items-center gap-3 text-left text-sm ${isActive ? "bg-accent" : ""}`}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => select(it)}
                    role="option"
                    aria-selected={isActive}
                  >
                    {it.type === "recent" ? <History className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                    <div className="flex-1">{label}</div>
                  </button>
                );
              }
              // see all
              const q = String(it.value);
              return (
                <button
                  key={`see-${q}`}
                  type="button"
                  className={`w-full px-4 py-3 text-left text-sm font-medium ${isActive ? "bg-accent" : ""}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => select(it)}
                  role="option"
                  aria-selected={isActive}
                >
                  See all results for “{q}”
                </button>
              );
            })}
          </div>
        </div>
      )}
    </form>
  );
}
