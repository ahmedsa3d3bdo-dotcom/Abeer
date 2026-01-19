"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MapPin, User, ShoppingBag, ArrowRight, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { useWishlistStore } from "@/stores/wishlist.store";
import { useCartStore } from "@/stores/cart.store";
import { useSession } from "next-auth/react";
import { LocalDate } from "@/components/common/local-datetime";
import { StatusBadge } from "@/components/common/status-badge";

export default function AccountDashboardPage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState<string>("");
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    savedAddresses: 0,
    wishlistItems: 0,
  });

  const [recentOrders, setRecentOrders] = useState<
    Array<{
      id: string;
      orderNumber: string;
      date: string;
      status: string;
      total: number;
      items: Array<{ name: string; quantity: number; price: number }>;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ordersRes, pendingRes, addrRes, profileRes] = await Promise.all([
          fetch("/api/storefront/orders?page=1&limit=3", { cache: "no-store" }),
          fetch("/api/storefront/orders?status=pending&page=1&limit=1", { cache: "no-store" }),
          fetch("/api/storefront/account/shipping-address", { cache: "no-store" }),
          fetch("/api/storefront/account/profile", { cache: "no-store" }),
        ]);

        const ordersJson = await ordersRes.json();
        const ordersPayload = ordersJson?.data || { items: [], total: 0 };
        const itemsArr = Array.isArray(ordersPayload.items) ? ordersPayload.items : [];
        const recent = itemsArr.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          date: o.date,
          status: o.status,
          total: Number(o.total || 0),
          items: Array.isArray(o.items)
            ? o.items.map((it: any) => ({ name: it.name, quantity: it.quantity, price: Number(it.price || 0) }))
            : [],
        }));

        const pendingJson = await pendingRes.json();
        const pendingTotal = Number((pendingJson?.data?.total as any) || 0);

        let hasAddress = false;
        try {
          if (addrRes.ok) {
            const addrJson = await addrRes.json();
            hasAddress = Boolean(addrJson?.data);
          }
        } catch {}

        let nameFromProfile = "";
        try {
          if (profileRes.ok) {
            const p = await profileRes.json();
            const fn = p?.data?.firstName || "";
            const ln = p?.data?.lastName || "";
            const full = `${fn} ${ln}`.trim();
            if (full) nameFromProfile = full;
          }
        } catch {}

        if (!cancelled) {
          setStats({
            totalOrders: Number(ordersPayload.total || 0),
            pendingOrders: pendingTotal,
            savedAddresses: hasAddress ? 1 : 0,
            wishlistItems: 0,
          });

          setRecentOrders(recent);

          const fallback = ((session as any)?.user?.email || (session as any)?.user?.name || "") as string;
          setDisplayName(nameFromProfile || fallback);
        }
      } catch {
        if (!cancelled) {
          setStats({ totalOrders: 0, pendingOrders: 0, savedAddresses: 0, wishlistItems: 0 });
          setRecentOrders([]);
          const fallback = ((session as any)?.user?.email || (session as any)?.user?.name || "") as string;
          setDisplayName(fallback);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.name, session?.user?.email]);

  const wishlistCount = useWishlistStore((s) => s.items.length);
  const cartItemCount = useCartStore(
    (s) => s.cart?.items.reduce((sum, it) => sum + it.quantity, 0) ?? 0
  );
  const fetchCart = useCartStore((s) => s.fetchCart);
  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome back{displayName ? `, ${displayName}` : "!"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Here's an overview of your account activity
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-sm text-muted-foreground">Total Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.savedAddresses}</p>
                <p className="text-sm text-muted-foreground">Addresses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <User className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{wishlistCount}</p>
                <p className="text-sm text-muted-foreground">Wishlist</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-lg">
                <ShoppingCart className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{cartItemCount}</p>
                <p className="text-sm text-muted-foreground">Cart Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/account/orders">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      <LocalDate value={order.date} /> • {order.items.length} items
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                  <p className="font-semibold">${order.total.toFixed(2)}</p>
                  <StatusBadge type="order" status={order.status} />
                </div>
              </div>
            ))}
          </div>

          {recentOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No orders yet</p>
              <Link href="/shop">
                <Button>Start Shopping</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/account/profile">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <User className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Update Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your personal information
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/account/addresses">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <MapPin className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">Manage Addresses</p>
                  <p className="text-sm text-muted-foreground">
                    Add or edit shipping addresses
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
