"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavGroup, type NavMainItem } from "@/navigation/sidebar/sidebar-items";
import { getSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

interface NavMainProps {
  readonly items: readonly NavGroup[];
}

const IsComingSoon = () => (
  <span className="ml-auto rounded-md bg-gray-200 px-2 py-1 text-xs dark:text-gray-800">Soon</span>
);

const NavItemExpanded = ({
  item,
  isActive,
  isSubmenuOpen,
  open,
  onOpenChange,
  renderBadgeByUrl,
  onNavigate,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  isSubmenuOpen: (subItems?: NavMainItem["subItems"]) => boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  renderBadgeByUrl: (url: string, opts?: { suppress?: boolean }) => ReactNode;
  onNavigate: () => void;
}) => {
  return (
    <Collapsible
      key={item.title}
      asChild
      open={item.subItems ? Boolean(open) : undefined}
      onOpenChange={item.subItems ? onOpenChange : undefined}
      className="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          {item.subItems ? (
            <SidebarMenuButton
              disabled={item.comingSoon}
              isActive={isActive(item.url, item.subItems)}
              tooltip={item.title}
            >
              {item.icon && (
                <item.icon className={item.iconClassName ? `${item.iconClassName} !${item.iconClassName}` : undefined} />
              )}
              <span>{item.title}</span>
              {item.comingSoon && <IsComingSoon />}
              {renderBadgeByUrl(item.url)}
              <ChevronRight className="transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              asChild
              aria-disabled={item.comingSoon}
              isActive={isActive(item.url)}
              tooltip={item.title}
            >
              <Link href={item.url} target={item.newTab ? "_blank" : undefined} onClick={onNavigate}>
                {item.icon && (
                  <item.icon className={item.iconClassName ? `${item.iconClassName} !${item.iconClassName}` : undefined} />
                )}
                <span>{item.title}</span>
                {item.comingSoon && <IsComingSoon />}
                {renderBadgeByUrl(item.url)}
              </Link>
            </SidebarMenuButton>
          )}
        </CollapsibleTrigger>
        {item.subItems && (
          <CollapsibleContent>
            <SidebarMenuSub>
              {item.subItems.map((subItem) => (
                <SidebarMenuSubItem key={subItem.title}>
                  <SidebarMenuSubButton aria-disabled={subItem.comingSoon} isActive={isActive(subItem.url)} asChild>
                    <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined} onClick={onNavigate}>
                      {subItem.icon && (
                        <subItem.icon
                          className={subItem.iconClassName ? `${subItem.iconClassName} !${subItem.iconClassName}` : undefined}
                        />
                      )}
                      <span>{subItem.title}</span>
                      {renderBadgeByUrl(subItem.url)}
                      {subItem.comingSoon && <IsComingSoon />}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        )}
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavItemCollapsed = ({
  item,
  isActive,
  renderBadgeByUrl,
  onNavigate,
}: {
  item: NavMainItem;
  isActive: (url: string, subItems?: NavMainItem["subItems"]) => boolean;
  renderBadgeByUrl: (url: string, opts?: { suppress?: boolean }) => ReactNode;
  onNavigate: () => void;
}) => {
  return (
    <SidebarMenuItem key={item.title}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            disabled={item.comingSoon}
            tooltip={item.title}
            isActive={isActive(item.url, item.subItems)}
          >
            {item.icon && <item.icon className={item.iconClassName} />}
            <span>{item.title}</span>
            {renderBadgeByUrl(item.url)}
            <ChevronRight />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-50 space-y-1" side="right" align="start">
          {item.subItems?.map((subItem) => (
            <DropdownMenuItem key={subItem.title} asChild>
              <SidebarMenuSubButton
                key={subItem.title}
                asChild
                className="focus-visible:ring-0"
                aria-disabled={subItem.comingSoon}
                isActive={isActive(subItem.url)}
              >
                <Link href={subItem.url} target={subItem.newTab ? "_blank" : undefined} onClick={onNavigate}>
                  {subItem.icon && (
                    <subItem.icon
                      className={subItem.iconClassName ? `${subItem.iconClassName} !${subItem.iconClassName}` : "text-sidebar-foreground"}
                    />
                  )}
                  <span>{subItem.title}</span>
                  {renderBadgeByUrl(subItem.url)}
                  {subItem.comingSoon && <IsComingSoon />}
                </Link>
              </SidebarMenuSubButton>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export function NavMain({ items }: NavMainProps) {
  const path = usePathname();
  const { state, isMobile, setOpen, setOpenMobile } = useSidebar();

  const [allowedPermissions, setAllowedPermissions] = useState<Set<string> | null>(null);
  const [newCounts, setNewCounts] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);
  const [openByUrl, setOpenByUrl] = useState<Record<string, boolean>>({});

  const refreshNewCounts = async () => {
    try {
      const types = [
        "order_created",
        "customer_registered",
        "shipment_created",
        "product_review",
        "newsletter_subscribed",
        "contact_message",
      ].join(",");
      const res = await fetch(`/api/storefront/notifications/summary?types=${encodeURIComponent(types)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      const byType = (data?.data?.byType || {}) as Record<string, number>;
      setNewCounts({
        orders: Number(byType.order_created || 0),
        customers: Number(byType.customer_registered || 0),
        shipments: Number(byType.shipment_created || 0),
        reviews: Number(byType.product_review || 0),
        newsletter: Number(byType.newsletter_subscribed || 0),
        messages: Number(byType.contact_message || 0),
      });
    } catch {
      // ignore
    }
  };

  const badgeForUrl = (url: string, opts?: { suppress?: boolean }) => {
    if (opts?.suppress) return null;
    let count = 0;
    if (url === "/dashboard/orders") count = newCounts.orders || 0;
    else if (url === "/dashboard/customers") count = newCounts.customers || 0;
    else if (url === "/dashboard/shipping/shipments") count = newCounts.shipments || 0;
    else if (url === "/dashboard/reviews") count = newCounts.reviews || 0;
    else if (url === "/dashboard/marketing/newsletter") count = newCounts.newsletter || 0;
    else if (url === "/dashboard/support/messages") count = newCounts.messages || 0;
    if (!count) return null;
    return (
      <Badge variant="secondary" className="ml-auto text-[10px] leading-4">
        New {count}
      </Badge>
    );
  };

  useEffect(() => {
    void getSession().then((session) => {
      const roles = Array.isArray((session as any)?.user?.roles) ? (session as any).user.roles : [];
      if (roles.includes("super_admin")) {
        setAllowedPermissions(null);
        return;
      }
      const perms = Array.isArray((session as any)?.user?.permissions) ? (session as any).user.permissions : [];
      setAllowedPermissions(new Set(perms));
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    void refreshNewCounts();
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/storefront/notifications/stream");
      es.onmessage = () => {
        void refreshNewCounts();
      };
    } catch {}
    return () => {
      try {
        es?.close();
      } catch {}
    };
  }, []);

  const filteredItems = useMemo(() => {
    const can = (perm?: string) => {
      if (!perm) return true;
      if (allowedPermissions === null) return true;

      const parts = String(perm).split(".");
      const base = parts.slice(0, -1).join(".");
      const action = parts[parts.length - 1];

      const has = (p: string) => allowedPermissions.has(p);

      return (
        has(perm) ||
        (base ? has(`${base}.manage`) : false) ||
        (action === "view" && base ? has(`${base}.create`) || has(`${base}.update`) || has(`${base}.delete`) : false)
      );
    };

    return items
      .map((group) => {
        const nextItems = (group.items || [])
          .map((item) => {
            const nextSub = item.subItems?.filter((s) => can((s as any).permission)) ?? item.subItems;
            const showItem = can((item as any).permission) && (!item.subItems || (nextSub?.length ?? 0) > 0);
            if (!showItem) return null;
            return { ...item, subItems: nextSub };
          })
          .filter(Boolean) as any[];
        return { ...group, items: nextItems };
      })
      .filter((g) => (g.items?.length ?? 0) > 0);
  }, [items, allowedPermissions]);

  useEffect(() => {
    if (!mounted) return;

    const next: Record<string, boolean> = {};
    for (const group of filteredItems as any[]) {
      for (const item of (group.items || []) as any[]) {
        if (!item?.subItems?.length) continue;
        next[String(item.url)] = (item.subItems as any[]).some((sub) => typeof sub?.url === "string" && path.startsWith(sub.url));
      }
    }
    setOpenByUrl(next);
  }, [mounted, filteredItems, path]);

  const isItemActive = (url: string, subItems?: NavMainItem["subItems"]) => {
    if (subItems?.length) {
      return subItems.some((sub) => path.startsWith(sub.url));
    }
    return path === url;
  };

  const isSubmenuOpen = (subItems?: NavMainItem["subItems"]) => {
    return subItems?.some((sub) => path.startsWith(sub.url)) ?? false;
  };

  const closeSidebarAfterNavigate = () => {
    if (typeof window === "undefined") return;
    if (isMobile) {
      setOpenMobile(false);
      return;
    }

    // Close (collapse) the sidebar on smaller screens (tablet-ish widths)
    // so navigation doesn't keep it over the content.
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  };

  return (
    <>
          {filteredItems.map((group) => (
        <SidebarGroup key={group.id}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {group.items.map((item) => {
                if (state === "collapsed" && !isMobile) {
                  // If no subItems, just render the button as a link
                  if (!item.subItems) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          aria-disabled={item.comingSoon}
                          tooltip={item.title}
                          isActive={isItemActive(item.url)}
                        >
                          <Link href={item.url} target={item.newTab ? "_blank" : undefined} onClick={closeSidebarAfterNavigate}>
                            {item.icon && <item.icon />}
                            <span>{item.title}</span>
                            {badgeForUrl(item.url, { suppress: Boolean(item.subItems?.length) })}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }
                  // Otherwise, render the dropdown as before
                  return (
                    <NavItemCollapsed
                      key={item.title}
                      item={item}
                      isActive={isItemActive}
                      renderBadgeByUrl={badgeForUrl}
                      onNavigate={closeSidebarAfterNavigate}
                    />
                  );
                }
                // Expanded view
                return (
                  <NavItemExpanded
                    key={item.title}
                    item={item}
                    isActive={isItemActive}
                    isSubmenuOpen={isSubmenuOpen}
                    open={openByUrl[item.url]}
                    onOpenChange={(o) => setOpenByUrl((s) => ({ ...s, [item.url]: o }))}
                    renderBadgeByUrl={badgeForUrl}
                    onNavigate={closeSidebarAfterNavigate}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}
