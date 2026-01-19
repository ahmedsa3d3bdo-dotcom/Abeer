"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EllipsisVertical } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { getInitials } from "@/lib/utils";
import { getSession, signOut } from "next-auth/react";

export function NavUser() {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; role?: string } | null>(null);
  const [hasControlPanel, setHasControlPanel] = useState(false);

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

  async function handleLogout() {
    try {
      await fetch("/api/v1/security/sessions/logout", { method: "POST" });
    } catch {
    }
    await signOut({ callbackUrl: "/" });
  }

  useEffect(() => {
    void getSession().then((session) => {
      const rawRoles = Array.isArray((session as any)?.user?.roles) ? (session as any).user.roles : [];
      const first = rawRoles?.[0];
      const roleLabel = typeof first === "string" ? first : first?.slug ?? first?.name ?? undefined;

      const roleList: string[] = [];
      for (const r of rawRoles) {
        if (!r) continue;
        if (typeof r === "string") roleList.push(r);
        else if (typeof r?.slug === "string") roleList.push(r.slug);
        else if (typeof r?.name === "string") roleList.push(r.name);
      }
      const singleRole = (session as any)?.user?.role;
      if (typeof singleRole === "string") roleList.push(singleRole);
      if ((session as any)?.user?.isAdmin) roleList.push("admin");
      if ((session as any)?.user?.isSuperAdmin) roleList.push("superadmin");
      setHasControlPanel(
        roleList.some((s) => {
          const v = (s || "").toString().toLowerCase();
          return v.includes("admin") || v.includes("super");
        })
      );

      setUser({
        name: (session as any)?.user?.name ?? (session as any)?.user?.email ?? "User",
        email: (session as any)?.user?.email ?? "",
        avatar: (session as any)?.user?.image ?? "",
        role: roleLabel,
      });
    });
  }, []);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={user?.avatar || undefined} alt={user?.name || "User"} />
                <AvatarFallback className="rounded-lg">{getInitials(user?.name || "U")}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name || "User"}</span>
                <span className="text-muted-foreground truncate text-xs">{user?.role ? user.role : ""}</span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.avatar || undefined} alt={user?.name || "User"} />
                  <AvatarFallback className="rounded-lg">{getInitials(user?.name || "U")}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name || "User"}</span>
                  <span className="text-muted-foreground truncate text-xs">{user?.role ? user.role : ""}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/account" onClick={closeSidebarAfterNavigate}>Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/settings" onClick={closeSidebarAfterNavigate}>Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/notifications" onClick={closeSidebarAfterNavigate}>Notifications</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/profile" onClick={closeSidebarAfterNavigate}>Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/orders" onClick={closeSidebarAfterNavigate}>Orders</Link>
              </DropdownMenuItem>
              {hasControlPanel && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/default" onClick={closeSidebarAfterNavigate}>Control Panel</Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void handleLogout()}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
