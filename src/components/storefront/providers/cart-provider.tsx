"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const fetchCart = useCartStore((state) => state.fetchCart);

  useEffect(() => {
    // Initialize cart on mount
    void fetchCart();
  }, [fetchCart]);

  return <>{children}</>;
}
