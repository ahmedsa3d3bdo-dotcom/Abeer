"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  User, 
  Package, 
  MapPin, 
  Home,
  Bell,
  Settings
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMemo } from "react";

const navigation = [
  {
    name: "Dashboard",
    href: "/account",
    icon: Home,
  },
  {
    name: "Orders",
    href: "/account/orders",
    icon: Package,
  },
  {
    name: "Profile",
    href: "/account/profile",
    icon: User,
  },
  {
    name: "Addresses",
    href: "/account/addresses",
    icon: MapPin,
  },
  {
    name: "Notifications",
    href: "/account/notifications",
    icon: Bell,
  },
  {
    name: "Settings",
    href: "/account/settings",
    icon: Settings,
  },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isInvoiceRoute = useMemo(() => {
    const p = (pathname || "").toLowerCase();
    return p.includes("/invoice");
  }, [pathname]);
  const active = useMemo(() => {
    if (!pathname) return "/account";
    for (const item of navigation) {
      if (pathname === item.href) return item.href;
    }
    // Match nested routes like /account/orders/123
    const match = navigation.find((n) => pathname.startsWith(n.href));
    return match?.href ?? "/account";
  }, [pathname]);

  if (isInvoiceRoute) {
    return <>{children}</>;
  }

  return (
    <div className="container py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">My Account</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and view your orders
        </p>
      </div>

      {/* Top Tabs Navigation */}
      <Tabs value={active} className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto whitespace-nowrap no-scrollbar">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <TabsTrigger key={item.href} value={item.href} asChild>
                <Link href={item.href} className={cn("px-3 py-2 flex items-center")}> 
                  <Icon className="h-4 w-4 mr-2 shrink-0" />
                  {item.name}
                </Link>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}
