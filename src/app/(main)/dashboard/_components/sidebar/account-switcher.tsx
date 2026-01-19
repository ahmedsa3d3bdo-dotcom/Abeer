"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { cn, getInitials } from "@/lib/utils";
import { getSession, signOut } from "next-auth/react";

export function AccountSwitcher() {
  const [activeUser, setActiveUser] = useState<{ id?: string; name: string; email: string; avatar: string; role?: string } | null>(null);
  const [hasControlPanel, setHasControlPanel] = useState(false);

  async function handleLogout() {
    try {
      await fetch("/api/v1/security/sessions/logout", { method: "POST" });
    } catch {
    }
    await signOut({ callbackUrl: "/" });
  }

  useEffect(() => {
    void getSession().then((session) => {
      const roles = Array.isArray((session as any)?.user?.roles) ? (session as any).user.roles : [];

      const roleList: string[] = [];
      for (const r of roles) {
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

      setActiveUser({
        id: (session as any)?.user?.id,
        name: (session as any)?.user?.name ?? (session as any)?.user?.email ?? "User",
        email: (session as any)?.user?.email ?? "",
        avatar: (session as any)?.user?.image ?? "",
        role: (roles as any)?.[0],
      });
    });
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-9 rounded-lg">
          <AvatarImage src={activeUser?.avatar || undefined} alt={activeUser?.name || "User"} />
          <AvatarFallback className="rounded-lg">{getInitials(activeUser?.name || "U")}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56 space-y-1 rounded-lg" side="bottom" align="end" sideOffset={4}>
        <DropdownMenuItem className={cn("p-0", "bg-accent/50 border-l-primary border-l-2")}> 
          <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
            <Avatar className="size-9 rounded-lg">
              <AvatarImage src={activeUser?.avatar || undefined} alt={activeUser?.name || "User"} />
              <AvatarFallback className="rounded-lg">{getInitials(activeUser?.name || "U")}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{activeUser?.name || "User"}</span>
              <span className="truncate text-xs capitalize">{activeUser?.role ?? ""}</span>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
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
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void handleLogout()}>Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
