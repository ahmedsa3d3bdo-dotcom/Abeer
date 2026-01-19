"use client";
import * as React from "react";

import { useRouter } from "next/navigation";
import { getSession } from "next-auth/react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { sidebarItems, type NavMainItem, type NavSubItem } from "@/navigation/sidebar/sidebar-items";

type SearchItem = {
  group: string;
  label: string;
  url: string;
  disabled?: boolean;
  newTab?: boolean;
  icon?: NavMainItem["icon"] | NavSubItem["icon"];
  iconClassName?: string;
};

export function SearchDialog() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const [allowedPermissions, setAllowedPermissions] = React.useState<Set<string> | null>(null);

  React.useEffect(() => {
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

  const items = React.useMemo((): SearchItem[] => {
    const can = (perm?: string) => {
      if (!perm) return true;
      if (allowedPermissions === null) return true;
      return allowedPermissions.has(perm);
    };

    const out: SearchItem[] = [];
    for (const group of sidebarItems) {
      const groupLabel = group.label || "Navigation";
      for (const item of group.items || []) {
        if (!can((item as any).permission)) continue;

        out.push({
          group: groupLabel,
          label: item.title,
          url: item.url,
          disabled: item.comingSoon,
          newTab: item.newTab,
          icon: item.icon,
          iconClassName: item.iconClassName,
        });

        if (item.subItems?.length) {
          for (const sub of item.subItems) {
            if (!can((sub as any).permission)) continue;
            out.push({
              group: groupLabel,
              label: `${item.title} / ${sub.title}`,
              url: sub.url,
              disabled: sub.comingSoon,
              newTab: sub.newTab,
              icon: sub.icon || item.icon,
              iconClassName: sub.iconClassName || item.iconClassName,
            });
          }
        }
      }
    }
    return out;
  }, [allowedPermissions]);

  const groups = React.useMemo(() => [...new Set(items.map((item) => item.group))], [items]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="link"
        className="text-muted-foreground !px-0 font-normal hover:no-underline"
        onClick={() => setOpen(true)}
      >
        <Search className="size-4" />
        Search
        <kbd className="bg-muted inline-flex h-5 items-center gap-1 rounded border px-1.5 text-[10px] font-medium select-none">
          <span className="text-xs">⌘</span>J
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search dashboards, users, and more…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {groups.map((group, i) => (
            <React.Fragment key={group}>
              {i !== 0 && <CommandSeparator />}
              <CommandGroup heading={group} key={group}>
                {items
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <CommandItem
                      className="!py-1.5"
                      key={`${item.url}::${item.label}`}
                      disabled={item.disabled}
                      onSelect={() => {
                        if (item.disabled) return;
                        setOpen(false);
                        if (item.newTab) {
                          window.open(item.url, "_blank", "noopener,noreferrer");
                          return;
                        }
                        router.push(item.url);
                      }}
                    >
                      {item.icon && <item.icon className={item.iconClassName} />}
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </React.Fragment>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
