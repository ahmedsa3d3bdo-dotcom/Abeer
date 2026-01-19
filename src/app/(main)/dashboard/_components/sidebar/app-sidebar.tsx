"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Settings, CircleHelp, Search, Database, ClipboardList, File, Home } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { siteConfig } from "@/config/site";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";

import { NavMain } from "./nav-main";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: CircleHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: Search,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: Database,
    },
    {
      name: "Reports",
      url: "#",
      icon: ClipboardList,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: File,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const [publicSettings, setPublicSettings] = useState<Record<string, string> | null>(null);

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

  const appName = publicSettings?.site_name || siteConfig.name || "";

  const closeSidebarAfterNavigate = () => {
    if (typeof window === "undefined") return;
    if (isMobile) {
      setOpenMobile(false);
      return;
    }
    if (window.innerWidth < 1024) {
      setOpen(false);
    }
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <Link href="/dashboard/default" onClick={closeSidebarAfterNavigate}>
                <img src="/favicon.ico" alt="" className="h-4 w-4" />
                <span className="text-base font-semibold">{appName}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
        {/* <NavDocuments items={data.documents} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/" onClick={closeSidebarAfterNavigate}>
                <Home />
                <span>Storefront</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
