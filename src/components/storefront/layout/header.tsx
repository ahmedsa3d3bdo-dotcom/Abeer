
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart, Menu, X, Search, User, Heart, ChevronDown, Bell, Megaphone, AlertTriangle, PackageCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchBar } from "./search-bar";
import { MobileNav } from "./mobile-nav";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { Input } from "@/components/ui/input";
import { CartDrawer } from "../cart/cart-drawer";
import { MegaMenu } from "./mega-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { siteConfig } from "@/config/site";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { AbeerShopLogo } from "./abeershop-logo";

export function StorefrontHeader() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; image?: string; roles?: any[] } | null>(null);
  const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifItems, setNotifItems] = useState<Array<{ id: string; title: string; message: string; createdAt: string; actionUrl?: string | null; type?: string }>>([]);
  const cart = useCartStore((state) => state.cart);
  const fetchCart = useCartStore((state) => state.fetchCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const itemCount = useCartStore((state) =>
    state.cart?.items.reduce((sum, it) => sum + it.quantity, 0) ?? 0
  );
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = useWishlistStore((state) => state.items.length);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const setWishlistItems = useWishlistStore((state) => state.setItems);
  const getWishlistItems = useWishlistStore((state) => state.getItems);
  const mergeToServer = useWishlistStore((state) => state.mergeToServer);
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/storefront/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const items = json?.data?.items;
        if (!alive || !Array.isArray(items)) return;
        const map: Record<string, string> = {};
        for (const it of items) {
          if (it?.key && typeof it?.value === "string") map[String(it.key)] = it.value;
        }
        setPublicSettings(map);
      })
      .catch(() => {
        if (!alive) return;
        setPublicSettings(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const firstName = useMemo(() => {
    const n = (user?.name || "").trim();
    if (n && !n.includes("@")) return n.split(/\s+/)[0];
    const e = (user?.email || "").trim();
    if (e) return e.split("@")[0];
    return "Account";
  }, [user?.name, user?.email]);

  const displayLabel = useMemo(() => {
    const n = (user?.name || "").trim();
    if (n && !n.includes("@")) return n;
    const e = (user?.email || "").trim();
    if (e) return e.split("@")[0];
    return "Account";
  }, [user?.name, user?.email]);

  const hasControlPanel = useMemo(() => {
    const perms = (session as any)?.user?.permissions;
    if (!Array.isArray(perms) || perms.length === 0) return false;

    const hasPermission = (permission: string) => {
      const parts = String(permission).split(".");
      const base = parts.slice(0, -1).join(".");
      const action = parts[parts.length - 1];
      const has = (p: string) => perms.includes(p);
      return (
        has(permission) ||
        (base ? has(`${base}.manage`) : false) ||
        (action === "view" && base ? has(`${base}.create`) || has(`${base}.update`) || has(`${base}.delete`) : false)
      );
    };

    if (hasPermission("dashboard.view")) return true;

    const sectionViewPerms = [
      "products.view",
      "categories.view",
      "orders.view",
      "refunds.view",
      "returns.view",
      "customers.view",
      "reviews.view",
      "discounts.view",
      "shipping.view",
      "users.view",
      "roles.view",
      "permissions.view",
      "settings.view",
      "security.view",
      "audit.view",
      "system.logs.view",
      "system.metrics.view",
      "backups.view",
      "health.view",
      "support.view",
      "newsletter.view",
      "notifications.view",
      "emails.view",
    ];

    return sectionViewPerms.some((p) => hasPermission(p));
  }, [session?.user?.permissions]);

  // Fetch notifications preview
  useEffect(() => {
    let aborted = false;
    const fetchPreview = async () => {
      try {
        if (!user) { setUnreadCount(0); setNotifItems([]); return; }
        const res = await fetch(`/api/storefront/notifications?status=unread&page=1&limit=5`, { cache: "no-store" });
        const data = await res.json();
        if (aborted) return;
        if (res.ok && data?.success) {
          setUnreadCount(Number(data.data?.total || 0));
          const items = Array.isArray(data.data?.items) ? data.data.items : [];
          setNotifItems(items.map((n: any) => ({ id: n.id, title: n.title, message: n.message, createdAt: n.createdAt, actionUrl: n.actionUrl, type: n.type })));
        }
      } catch { }
    };
    fetchPreview();
    const onVis = () => { if (document.visibilityState === "visible") fetchPreview(); };
    document.addEventListener("visibilitychange", onVis);
    const t = setInterval(fetchPreview, 60000);
    return () => { aborted = true; document.removeEventListener("visibilitychange", onVis); clearInterval(t); };
  }, [user?.email, user?.name]);

  // Realtime notifications via SSE
  useEffect(() => {
    if (!user) return;
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/storefront/notifications/stream");
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (!data || !data.kind) return;
          if (data.kind === "created") {
            setUnreadCount((c) => c + 1);
            setNotifItems((arr) => [{
              id: data.payload?.id,
              title: data.payload?.title,
              message: data.payload?.message,
              createdAt: data.payload?.createdAt,
              actionUrl: data.payload?.actionUrl,
              type: data.payload?.type,
            }, ...arr].slice(0, 10));
            toast(data.payload?.title || "New notification", { description: data.payload?.message || "" });
          } else if (data.kind === "read") {
            setUnreadCount((c) => Math.max(0, c - 1));
          } else if (data.kind === "markAll") {
            setUnreadCount(0);
          } else if (data.kind === "archived") {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
        } catch { }
      };
    } catch { }
    return () => {
      try { es?.close(); } catch { }
    };
  }, [user?.email, user?.name]);

  // Persist wishlist snapshot on change, keyed by current session identity
  useEffect(() => {
    const key = (session as any)?.user?.id || (session as any)?.user?.email || "guest";
    try {
      if (wishlistItems && wishlistItems.length > 0) {
        localStorage.setItem(`wishlist-user:${key}`, JSON.stringify(wishlistItems));
      }
    } catch { }
  }, [wishlistItems, session?.user?.id, session?.user?.email]);

  // Ensure server truth for wishlist on mount/session change (no-op for guests)
  useEffect(() => {
    if ((session as any)?.user?.id) {
      void useWishlistStore.getState().syncFromServer();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    // Determine current auth key (id or email)
    const key = (session as any)?.user?.id || (session as any)?.user?.email || "guest";
    try {
      const prev = localStorage.getItem("last-auth-user") || "";
      const isGuestToUser = !prev || prev === "guest";

      // Persist previous user's wishlist snapshot
      if (prev && prev !== key) {
        try {
          const prevItems = getWishlistItems();
          localStorage.setItem(`wishlist-user:${prev}`, JSON.stringify(prevItems));
        } catch { }
      }

      if (!session) {
        // Logged out -> clear client state and load guest wishlist
        clearCart();
        try {
          const raw = localStorage.getItem(`wishlist-user:guest`);
          const guestItems = raw ? JSON.parse(raw) : [];
          setWishlistItems(Array.isArray(guestItems) ? guestItems : []);
        } catch {
          setWishlistItems([]);
        }
        localStorage.removeItem("cart-storage");
        localStorage.removeItem("wishlist-storage");
        // Clear server cart cookies (do not delete DB for users)
        fetch("/api/storefront/cart/clear?mode=cookies", { method: "POST" }).catch(() => { });
      } else if (prev && prev !== key) {
        // Switching between two authenticated users -> hard clear
        if (!isGuestToUser) {
          clearCart();
          localStorage.removeItem("cart-storage");
          localStorage.removeItem("wishlist-storage");
          fetch("/api/storefront/cart/clear?mode=cookies", { method: "POST" }).catch(() => { });
        }
        // Load target user's wishlist
        try {
          const raw = localStorage.getItem(`wishlist-user:${key}`);
          const items = raw ? JSON.parse(raw) : [];
          setWishlistItems(Array.isArray(items) ? items : []);
        } catch {
          setWishlistItems([]);
        }
      } else if (session && isGuestToUser) {
        // First login from guest -> merge guest wishlist into user snapshot
        try {
          const current = getWishlistItems();
          if (current && current.length) {
            localStorage.setItem(`wishlist-user:${key}`, JSON.stringify(current));
          }
        } catch { }
        // Persist guest wishlist to server DB once after login
        (async () => {
          try {
            await mergeToServer();
          } catch { }
        })();
        // DO NOT clear cart cookies here; allow backend GET to merge guest cart into user
      }

      localStorage.setItem("last-auth-user", key);
    } catch { }

    if (!session) {
      setUser(null);
    } else {
      setUser({
        name: (session as any)?.user?.name ?? undefined,
        email: (session as any)?.user?.email ?? undefined,
        image: (session as any)?.user?.image ?? undefined,
        roles: Array.isArray((session as any)?.user?.roles) ? (session as any).user.roles : [],
      });
      (async () => {
        try {
          const res = await fetch("/api/storefront/account/profile", { cache: "no-store" });
          if (res.ok) {
            const p = await res.json();
            const fn = p?.data?.firstName || "";
            const ln = p?.data?.lastName || "";
            const full = `${fn} ${ln}`.trim();
            if (full) {
              setUser((prev) => ({ ...(prev || {}), name: full } as any));
            }
          }
        } catch { }
      })();
      // Ensure wishlist hydrates for this user even on first login in a session
      try {
        const raw = localStorage.getItem(`wishlist-user:${(session as any)?.user?.id || (session as any)?.user?.email || "guest"}`);
        if (raw) {
          const items = JSON.parse(raw);
          if (Array.isArray(items) && items.length) {
            setWishlistItems(items);
          }
        }
      } catch { }
    }

    // Always refresh cart from server after resolving session (or lack thereof)
    void fetchCart();
  }, [session?.user?.id, session?.user?.email, clearCart, clearWishlist, fetchCart]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          {/* Mobile Menu Button */}
          {/* Mobile Menu Button & Logo Group */}
          <div className="flex items-center gap-0.5 lg:gap-8">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>

            <Link href="/" className="flex items-center">
              <AbeerShopLogo size="sm" />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-5 text-sm font-medium ml-2 sm:ml-4">
            {/* Shop with chevron and active underline when megamenu open */}
            <div className="relative group" onMouseEnter={() => setMegaOpen(true)}>
              <Link
                href="/shop"
                className={`inline-flex items-center gap-1 transition-colors ${megaOpen ? "text-primary" : "hover:text-foreground/80"}`}
                onFocus={() => setMegaOpen(true)}
              >
                <span>Shop</span>
                <ChevronDown className="h-4 w-4" />
              </Link>
              <span
                aria-hidden
                className={`pointer-events-none absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300 ${megaOpen ? "w-full" : "w-0 group-hover:w-full"
                  }`}
              />
            </div>

            {/* On Sale */}
            <div className="relative group">
              <Link href="/shop/sale" className="transition-colors hover:text-foreground/80">
                On Sale
              </Link>
              <span aria-hidden className="pointer-events-none absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </div>

            {/* New Arrivals */}
            <div className="relative group">
              <Link href="/shop/new" className="transition-colors hover:text-foreground/80">
                New Arrivals
              </Link>
              <span aria-hidden className="pointer-events-none absolute -bottom-1 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </div>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-[560px] mx-6">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Search Button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
                <span className="sr-only">Wishlist ({wishlistCount} items)</span>
              </Button>
            </Link>

            {/* Cart (navigate to cart page) */}
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
              >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
                <span className="sr-only">Shopping cart ({itemCount} items)</span>
              </Button>
            </Link>

            {/* Notifications */}
            {user && (
              <DropdownMenu
                open={notifOpen}
                onOpenChange={(o) => {
                setNotifOpen(o); if (o) { /* refresh on open */ fetch(`/api/storefront/notifications?status=unread&page=1&limit=5`, { cache: "no-store" })
                  .then(r => r.json()).then((data) => {
                    if (data?.success) {
                      setUnreadCount(Number(data.data?.total || 0));
                      const items = Array.isArray(data.data?.items) ? data.data.items : [];
                      setNotifItems(items.map((n: any) => ({ id: n.id, title: n.title, message: n.message, createdAt: n.createdAt, actionUrl: n.actionUrl, type: n.type })));
                    }
                  }).catch(() => { });
                }
              }}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    <span className="sr-only">Notifications</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="w-80 rounded-lg p-0 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                    <span className="text-sm font-medium">Notifications</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/storefront/notifications/mark-all", { method: "POST" });
                          if (res.ok) { setUnreadCount(0); toast.success("All notifications marked as read"); }
                        } catch { }
                        setNotifOpen(false);
                      }}
                    >
                      Mark all as read
                    </Button>
                  </div>
                  <div className="max-h-96 overflow-auto">
                    {notifItems.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-muted-foreground">You're all caught up</div>
                    ) : (
                      notifItems.map((n) => (
                        <button
                          key={n.id}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                          onClick={async () => {
                            try { await fetch(`/api/storefront/notifications/${n.id}/read`, { method: "POST" }); setUnreadCount((c) => Math.max(0, c - 1)); toast.success("Marked as read"); } catch { }
                            setNotifOpen(false);
                            if (n.actionUrl) window.location.href = n.actionUrl;
                          }}
                        >
                          <div className="text-sm font-medium line-clamp-1">{n.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t p-2">
                    <Link href="/account/notifications">
                      <Button variant="ghost" className="w-full" onClick={() => setNotifOpen(false)}>
                        View all notifications
                      </Button>
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Account (last) */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative px-2 sm:px-3">
                    {user?.image ? (
                      <Avatar className="h-6 w-6 sm:mr-2">
                        <AvatarImage src={user.image} alt={displayLabel} />
                        <AvatarFallback>{getInitials(firstName)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-6 w-6 sm:mr-2">
                        <AvatarFallback>{getInitials(firstName)}</AvatarFallback>
                      </Avatar>
                    )}
                    <span className="max-w-[120px] truncate hidden sm:inline">{firstName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={6} className="min-w-56 rounded-lg">
                  <DropdownMenuLabel>
                    {displayLabel}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/notifications">Notifications</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/account/orders">Orders</Link>
                  </DropdownMenuItem>
                  {hasControlPanel && (
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/default">Control Panel</Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      try {
                        clearCart();
                        // Persist current user's wishlist snapshot before logout
                        const key = (session as any)?.user?.id || (session as any)?.user?.email || "guest";
                        try {
                          const current = getWishlistItems();
                          localStorage.setItem(`wishlist-user:${key}`, JSON.stringify(current));
                        } catch { }
                        localStorage.removeItem("last-auth-user");
                        localStorage.removeItem("cart-storage");
                        localStorage.removeItem("wishlist-storage");
                      } catch { }
                      // Best-effort server-side clear and cookie reset
                      fetch("/api/storefront/cart/clear?mode=cookies", { method: "POST" }).finally(() => {
                        signOut({ callbackUrl: "/" });
                      });
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href={siteConfig.routes.login}>
                <Button variant="ghost" size="icon" className="relative">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="lg:hidden border-t p-4">
            <SearchBar onClose={() => setSearchOpen(false)} />
          </div>
        )}
      </header >

      {/* Desktop Mega Menu */}
      < MegaMenu open={megaOpen} onClose={() => setMegaOpen(false)
      } />

      {/* Mobile Navigation Drawer */}
      <MobileNav open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Cart Drawer */}
      <CartDrawer />
    </>
  );
}
