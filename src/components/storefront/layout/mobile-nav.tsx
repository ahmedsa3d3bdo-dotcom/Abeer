"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const navLinks = [
    { href: "/shop", label: "Shop All" },
    { href: "/shop/new", label: "New Arrivals" },
    { href: "/shop/sale", label: "Sale" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[300px] sm:w-[400px] p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="px-5 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Menu</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
             
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
          </SheetHeader>

          <nav className="flex flex-col gap-2 px-5 py-5 overflow-y-auto">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className="rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted hover:text-primary"
              >
                {link.label}
              </Link>
            ))}

            <div className="border-t pt-4 mt-3">
              <Link
                href="/account"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-base font-medium transition-colors hover:bg-muted hover:text-primary block"
              >
                My Account
              </Link>
              <Link
                href="/account/orders"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary block mt-1"
              >
                Orders
              </Link>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary block mt-1"
              >
                Wishlist
              </Link>
              <Link
                href="/account/profile"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary block mt-1"
              >
                Profile
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary block mt-1"
              >
                Cart
              </Link>
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
