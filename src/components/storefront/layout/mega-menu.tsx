"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MegaMenu({ open, onClose }: MegaMenuProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront/categories", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && res.ok && data?.success) {
          const cats = (data.data?.categories || []).slice(0, 12);
          setCategories(cats);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Focus trap within the megamenu when open
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusableSelectors = [
      'a[href]:not([tabindex="-1"])',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const getFocusables = () => Array.from(panel.querySelectorAll<HTMLElement>(focusableSelectors));

    // Initial focus to first link
    const focusables = getFocusables();
    if (focusables.length) {
      focusables[0].focus();
    } else {
      panel.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = getFocusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleKeyDown);
    return () => panel.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const cols = useMemo(() => {
    const perCol = Math.ceil(categories.length / 3) || 1;
    return [0, 1, 2].map((i) => categories.slice(i * perCol, (i + 1) * perCol));
  }, [categories]);

  return (
    <>
      {/* Backdrop to keep menu open and mute the page */}
      <div
        className={`fixed inset-0 z-40 transition ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        style={{ background: open ? "rgba(0,0,0,0.15)" : "transparent" }}
        onClick={onClose}
      />

      <div
        className={`fixed inset-x-0 top-16 z-50 transition-opacity duration-200 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        aria-hidden={!open}
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            ref={panelRef}
            className="rounded-lg border bg-background/98 shadow-xl backdrop-blur"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            onMouseLeave={onClose}
          >
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-4">
              {/* Columns 1-3: categories (text only) */}
              {cols.map((col, idx) => (
                <div
                  key={idx}
                  className={`space-y-2 ${idx < 3 ? "" : "hidden lg:block"}`}
                  style={{
                    transition: "opacity 300ms ease, transform 300ms ease",
                    transitionDelay: `${idx * 75}ms`,
                    opacity: open ? 1 : 0,
                    transform: open ? "translateY(0)" : "translateY(8px)",
                  }}
                >
                  {col.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/shop?categorySlug=${encodeURIComponent(c.slug)}`}
                      className="flex items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted"
                      onClick={onClose}
                    >
                      <span className="relative size-6 shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image
                          src={c.image || "/placeholder-product.svg"}
                          alt={c.name}
                          fill
                          className="object-cover"
                          sizes="24px"
                        />
                      </span>
                      {c.name}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Column 4: Quick Links */}
              <div
                className="space-y-2"
                style={{
                  transition: "opacity 300ms ease, transform 300ms ease",
                  transitionDelay: `${3 * 75}ms`,
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(8px)",
                }}
              >
                <div className="text-xs font-semibold text-muted-foreground px-2">Quick links</div>
                <Link href="/shop/sale" className="block rounded px-2 py-2 text-sm hover:bg-muted" onClick={onClose}>
                  Sale
                </Link>
                <Link href="/shop/new" className="block rounded px-2 py-2 text-sm hover:bg-muted" onClick={onClose}>
                  New Arrivals
                </Link>
                <Link href="/shop?sortBy=popular" className="block rounded px-2 py-2 text-sm hover:bg-muted" onClick={onClose}>
                  Featured & Popular
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
