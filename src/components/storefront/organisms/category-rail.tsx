"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/storefront/api-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
}

interface CategoryRailProps {
  activeCategoryId?: string | undefined;
  onSelect?: (categoryId?: string) => void;
}

export function CategoryRail({ activeCategoryId, onSelect }: CategoryRailProps) {
  const router = useRouter();
  const { data } = useQuery<{ categories: Category[] }>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/storefront/categories"),
  });

  const items = data?.categories || [];

  const handleSelect = (categoryId?: string) => {
    if (onSelect) return onSelect(categoryId);
    if (!categoryId) {
      router.push("/shop");
      return;
    }
    router.push(`/shop?categoryId=${encodeURIComponent(categoryId)}`);
  };

  return (
    <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
          <Button variant={activeCategoryId ? "ghost" : "default"} size="sm" onClick={() => handleSelect(undefined)} className={cn("whitespace-nowrap", !activeCategoryId && "shadow-sm")}>
            All
          </Button>
          {items.map((c) => (
            <Button key={c.id} variant={activeCategoryId === c.id ? "default" : "outline"} size="sm" onClick={() => handleSelect(c.id)} className="whitespace-nowrap gap-2 pl-2 pr-3">
              <span className="relative size-6 overflow-hidden rounded-full bg-muted">
                <Image src={c.image || "/placeholder-product.svg"} alt={c.name} fill className="object-cover" sizes="24px" />
              </span>
              {c.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
