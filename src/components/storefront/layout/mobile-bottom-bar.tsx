"use client";

import Link from "next/link";
import { Home, ShoppingBag, Search, ShoppingCart, User } from "lucide-react";
import { useCartStore } from "@/stores/cart.store";
import { usePathname } from "next/navigation";

export function MobileBottomBar() {
  const itemCount = useCartStore((s) => s.itemCount);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden" data-mobile-bottom-bar>
      <nav className="mx-auto flex max-w-7xl items-stretch justify-between px-4 py-2 text-xs" role="navigation" aria-label="Primary">
        <Link href="/" className="flex flex-1 flex-col items-center gap-1 py-1" aria-current={isActive("/") ? "page" : undefined}>
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link href="/shop" className="flex flex-1 flex-col items-center gap-1 py-1" aria-current={isActive("/shop") ? "page" : undefined}>
          <ShoppingBag className="h-5 w-5" />
          <span>Shop</span>
        </Link>
        <Link href="/search" className="flex flex-1 flex-col items-center gap-1 py-1" aria-current={isActive("/search") ? "page" : undefined}>
          <Search className="h-5 w-5" />
          <span>Search</span>
        </Link>
        <Link href="/cart" className="relative flex flex-1 flex-col items-center gap-1 py-1" aria-current={isActive("/cart") ? "page" : undefined}>
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-1 right-4 h-5 w-5 rounded-full bg-primary text-[10px] leading-5 text-primary-foreground text-center">
              {itemCount}
            </span>
          )}
          <span>Cart</span>
        </Link>
        <Link href="/account" className="flex flex-1 flex-col items-center gap-1 py-1" aria-current={isActive("/account") ? "page" : undefined}>
          <User className="h-5 w-5" />
          <span>Account</span>
        </Link>
      </nav>
    </div>
  );
}
