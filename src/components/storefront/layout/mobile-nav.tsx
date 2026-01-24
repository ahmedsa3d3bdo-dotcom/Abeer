"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ShoppingBag,
  Sparkles,
  Tag,
  BadgePercent,
  Search,
  User,
  Package,
  Heart,
  ShoppingCart,
  Phone,
  HelpCircle,
  Truck,
  RotateCcw,
  Shield,
  FileText,
  
  type LucideIcon,
} from "lucide-react";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  const shopAllHref = "/shop?page=1&limit=12&sortBy=newest";

  type NavItem = {
    href: string;
    label: string;
    icon: LucideIcon;
    iconClassName: string;
    iconBgClassName: string;
    exact?: boolean;
  };

  const groups: Array<{ title: string; items: NavItem[] }> = [
    {
      title: "Shop",
      items: [
        {
          href: shopAllHref,
          label: "All Products",
          icon: ShoppingBag,
          iconClassName: "text-primary",
          iconBgClassName: "bg-primary/15",
          exact: true,
        },
        {
          href: "/shop/new",
          label: "New Arrivals",
          icon: Sparkles,
          iconClassName: "text-emerald-600",
          iconBgClassName: "bg-emerald-500/15",
        },
        {
          href: "/shop/featured",
          label: "Featured",
          icon: Tag,
          iconClassName: "text-violet-600",
          iconBgClassName: "bg-violet-500/15",
        },
        {
          href: "/shop/sale",
          label: "Sale",
          icon: BadgePercent,
          iconClassName: "text-rose-600",
          iconBgClassName: "bg-rose-500/15",
        },
        {
          href: "/search",
          label: "Search",
          icon: Search,
          iconClassName: "text-sky-600",
          iconBgClassName: "bg-sky-500/15",
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: "/account",
          label: "My Account",
          icon: User,
          iconClassName: "text-amber-600",
          iconBgClassName: "bg-amber-500/15",
        },
        {
          href: "/account/orders",
          label: "Orders",
          icon: Package,
          iconClassName: "text-indigo-600",
          iconBgClassName: "bg-indigo-500/15",
        },
        {
          href: "/wishlist",
          label: "Wishlist",
          icon: Heart,
          iconClassName: "text-pink-600",
          iconBgClassName: "bg-pink-500/15",
        },
        {
          href: "/cart",
          label: "Cart",
          icon: ShoppingCart,
          iconClassName: "text-cyan-600",
          iconBgClassName: "bg-cyan-500/15",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          href: "/contact",
          label: "Contact",
          icon: Phone,
          iconClassName: "text-teal-600",
          iconBgClassName: "bg-teal-500/15",
        },
        {
          href: "/faq",
          label: "FAQ",
          icon: HelpCircle,
          iconClassName: "text-slate-600",
          iconBgClassName: "bg-slate-500/15",
        },
        {
          href: "/shipping",
          label: "Shipping",
          icon: Truck,
          iconClassName: "text-blue-600",
          iconBgClassName: "bg-blue-500/15",
        },
        {
          href: "/returns",
          label: "Returns",
          icon: RotateCcw,
          iconClassName: "text-orange-600",
          iconBgClassName: "bg-orange-500/15",
        },
        {
          href: "/privacy",
          label: "Privacy",
          icon: Shield,
          iconClassName: "text-zinc-600",
          iconBgClassName: "bg-zinc-500/15",
        },
        {
          href: "/terms",
          label: "Terms",
          icon: FileText,
          iconClassName: "text-neutral-600",
          iconBgClassName: "bg-neutral-500/15",
        },
      ],
    },
  ];

  const getIsActive = (item: NavItem) => {
    if (item.exact) return pathname === "/shop";
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
        <div className="flex h-full flex-col">
          <SheetHeader className="px-5 py-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Menu</SheetTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
               
                <span className="sr-only">Close menu</span>
              </Button>
            </div>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.title} className="rounded-xl border bg-muted/20 p-2">
                  <div className="px-2 pb-1.5 pt-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.title}
                    </h3>
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = getIsActive(item);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={`${group.title}:${item.href}`}
                          href={item.href}
                          onClick={onClose}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            "hover:bg-background/60",
                            active ? "bg-background shadow-sm" : "text-foreground",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-lg",
                              item.iconBgClassName,
                            )}
                          >
                            <Icon className={cn("h-5 w-5", item.iconClassName)} />
                          </span>
                          <span className="flex-1 truncate">{item.label}</span>
                          <span
                            className={cn(
                              "text-xs text-muted-foreground transition-opacity",
                              active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                            )}
                          >
                            {active ? "Selected" : "Open"}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
