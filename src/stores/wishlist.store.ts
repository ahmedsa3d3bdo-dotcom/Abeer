import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProductCard } from "@/types/storefront";

interface WishlistState {
  items: ProductCard[];
  isLoading: boolean;
  
  // Actions
  addItem: (product: ProductCard) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  toggleItem: (product: ProductCard) => void;
  setItems: (items: ProductCard[]) => void;
  getItems: () => ProductCard[];
  syncFromServer: () => Promise<void>;
  mergeToServer: () => Promise<void>;
}

// Compute the per-user storage key based on the last authenticated identity
function getWishlistStorageKey(): string {
  try {
    const authKey = localStorage.getItem("last-auth-user") || "guest";
    return `wishlist-user:${authKey}`;
  } catch {
    return "wishlist-user:guest";
  }
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      addItem: (product) => {
        const { items } = get();
        
        // Don't add if already in wishlist
        if (items.some((item) => item.id === product.id)) {
          return;
        }

        set({ items: [...items, product] });
      },

      removeItem: (productId) => {
        const { items } = get();
        set({ items: items.filter((item) => item.id !== productId) });
      },

      isInWishlist: (productId) => {
        const { items } = get();
        return items.some((item) => item.id === productId);
      },

      toggleItem: (product) => {
        const { items, addItem, removeItem, setItems } = get();
        const isInList = items.some((item) => item.id === product.id);
        (async () => {
          try {
            const res = await fetch("/api/storefront/wishlist/items", {
              method: isInList ? "DELETE" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product.id }),
            });
            if (res.ok) {
              const data = await res.json();
              const mapped = Array.isArray(data?.data) ? data.data.map((x: any) => x.product) : [];
              setItems(mapped);
              return;
            }
          } catch {}
          if (isInList) {
            removeItem(product.id);
          } else {
            addItem(product);
          }
        })();
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      setItems: (items) => set({ items }),
      getItems: () => get().items,
      syncFromServer: async () => {
        try {
          const res = await fetch("/api/storefront/wishlist", { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          const mapped = Array.isArray(data?.data) ? data.data.map((x: any) => x.product) : [];
          set({ items: mapped });
        } catch {}
      },
      mergeToServer: async () => {
        try {
          const ids = get().items.map((p) => p.id);
          const res = await fetch("/api/storefront/wishlist/merge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: ids }),
          });
          if (!res.ok) return;
          const data = await res.json();
          const mapped = Array.isArray(data?.data) ? data.data.map((x: any) => x.product) : [];
          set({ items: mapped });
        } catch {}
      },
    }),
    {
      name: "wishlist-storage",
      // Persist wishlist per-user by mapping the storage key dynamically
      storage: createJSONStorage(() => ({
        getItem: (_key: string) => {
          try {
            return localStorage.getItem(getWishlistStorageKey());
          } catch {
            return null;
          }
        },
        setItem: (_key: string, value: string) => {
          try {
            localStorage.setItem(getWishlistStorageKey(), value);
          } catch {}
        },
        removeItem: (_key: string) => {
          try {
            localStorage.removeItem(getWishlistStorageKey());
          } catch {}
        },
      }) as any),
    }
  )
);
