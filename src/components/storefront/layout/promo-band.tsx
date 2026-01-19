"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";

const THRESHOLD = 75; // free shipping threshold

export function PromoBand() {
  const cart = useCartStore((s) => s.cart);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("promo_band_hidden") : null;
    if (v === "1") setHidden(true);
  }, []);

  const remaining = useMemo(() => {
    const subtotal = cart?.subtotal ?? 0;
    return Math.max(0, THRESHOLD - subtotal);
  }, [cart]);

  if (hidden) return null;

  const progress = Math.min(100, Math.round(((THRESHOLD - remaining) / THRESHOLD) * 100));

  return (
    <div className="border-b bg-primary/5" data-promo-band>
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex-1 text-xs sm:text-sm">
          {remaining > 0 ? (
            <span>
              Free shipping over ${THRESHOLD}. You're ${remaining.toFixed(2)} away.
            </span>
          ) : (
            <span>🎉 You unlocked free shipping!</span>
          )}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Dismiss promo"
          onClick={() => {
            setHidden(true);
            try { window.localStorage.setItem("promo_band_hidden", "1"); } catch {}
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
