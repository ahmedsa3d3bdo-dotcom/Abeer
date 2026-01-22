"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/storefront/api-client";
import { ProductGrid } from "@/components/storefront/organisms/product-grid";
import { FilterSidebar } from "@/components/storefront/organisms/filter-sidebar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import type { ProductListResponse } from "@/types/storefront";
import { CategoryRail } from "@/components/storefront/organisms/category-rail";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { usePathname, useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";
import { siteConfig } from "@/config/site";

export default function ShopPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initedRef = useRef(false);
  const lastUrlSyncedRef = useRef<string | null>(null);
  const pathCategorySlug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "shop") return undefined;
    if (parts.length !== 2) return undefined;
    const seg = parts[1];
    if (!seg || seg === "new" || seg === "sale" || seg === "featured") return undefined;
    return seg;
  }, [pathname]);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 12,
    sortBy: "newest" as const,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    categoryIds: undefined as string[] | undefined,
    inStock: false,
    onSale: false,
    isFeatured: false,
    search: undefined as string | undefined,
  });

  const parseFiltersFromSearchParams = (sp: ReadonlyURLSearchParams) => {
    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "12");
    const sortBy = (sp.get("sortBy") as any) || "newest";
    const minPrice = sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined;
    const maxPrice = sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined;
    const minRating = sp.get("minRating") ? Number(sp.get("minRating")) : undefined;
    const inStock = sp.get("inStock") === "true";
    const onSale = sp.get("onSale") === "true";
    const isFeatured = sp.get("isFeatured") === "true";
    const q = sp.get("q") || sp.get("search") || undefined;
    return {
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 12 : limit,
      sortBy,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      onSale,
      isFeatured,
      search: q || undefined,
    };
  };

  const categoriesDataQuery = useQuery<{ categories: Array<{ id: string; name: string; slug: string; children?: any[] }> }>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/storefront/categories"),
  });

  const categoriesTree: any[] = useMemo(
    () => (categoriesDataQuery.data as any)?.data?.categories || categoriesDataQuery.data?.categories || [],
    [categoriesDataQuery.data],
  );

  const categoryIndex = useMemo(() => {
    const idToSlug = new Map<string, string>();
    const slugToId = new Map<string, string>();
    const walk = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n?.id && n?.slug) {
          idToSlug.set(String(n.id), String(n.slug));
          slugToId.set(String(n.slug), String(n.id));
        }
        if (Array.isArray(n.children) && n.children.length) walk(n.children);
      }
    };
    walk(categoriesTree);
    return { idToSlug, slugToId };
  }, [categoriesTree]);

  const resolveCategoryIdsFromSearchParams = (sp: ReadonlyURLSearchParams) => {
    const slugs = sp.getAll("categorySlug").filter(Boolean);
    const effectiveSlugs = slugs.length ? slugs : pathCategorySlug ? [pathCategorySlug] : [];
    if (effectiveSlugs.length && categoryIndex.slugToId.size) {
      const ids = effectiveSlugs
        .map((s) => categoryIndex.slugToId.get(String(s)) || "")
        .filter(Boolean);
      return ids.length ? ids : undefined;
    }
    const ids = sp.getAll("categoryId").filter(Boolean);
    return ids.length ? ids : undefined;
  };

  // Initialize + keep in sync with URL (including resolving categorySlug -> categoryId)
  useEffect(() => {
    const qs = searchParams.toString();
    const syncKey = `${pathCategorySlug || ""}|${qs}|${categoryIndex.slugToId.size}`;
    if (initedRef.current && syncKey === lastUrlSyncedRef.current) return;
    lastUrlSyncedRef.current = syncKey;
    const next = parseFiltersFromSearchParams(searchParams);
    const categoryIds = resolveCategoryIdsFromSearchParams(searchParams);
    setFilters((prev) => ({ ...prev, ...next, categoryIds }));
    initedRef.current = true;
  }, [searchParams, categoryIndex.slugToId, pathCategorySlug]);

  // Update URL when filters change (shallow) with guard to avoid loops
  const lastQsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!initedRef.current) return;
    const params = new URLSearchParams();
    params.set("page", String(filters.page));
    params.set("limit", String(filters.limit));
    params.set("sortBy", filters.sortBy);
    if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
    if (filters.minRating !== undefined) params.set("minRating", String(filters.minRating));
    if (filters.inStock) params.set("inStock", "true");
    if (filters.onSale) params.set("onSale", "true");
    if (filters.isFeatured) params.set("isFeatured", "true");
    if (filters.search) params.set("q", filters.search);
    if (filters.categoryIds && filters.categoryIds.length) {
      const slugs = filters.categoryIds
        .map((id) => categoryIndex.idToSlug.get(id) || "")
        .filter(Boolean)
        .sort();
      if (slugs.length === filters.categoryIds.length) {
        for (const slug of slugs) params.append("categorySlug", slug);
      } else {
        const sorted = [...filters.categoryIds].sort();
        for (const id of sorted) params.append("categoryId", id);
      }
    }
    const qs = params.toString();
    const keepInitialPathCategory =
      (!filters.categoryIds || filters.categoryIds.length === 0) &&
      !!pathCategorySlug &&
      categoryIndex.slugToId.size === 0;
    const nextPathname = keepInitialPathCategory ? `/shop/${encodeURIComponent(pathCategorySlug!)}` : "/shop";
    const nextUrl = `${nextPathname}?${qs}`;
    if (nextUrl === lastQsRef.current) return;
    const currentUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
    if (nextUrl === currentUrl) {
      lastQsRef.current = nextUrl;
      return;
    }
    lastQsRef.current = nextUrl;
    router.replace(nextUrl, { scroll: false });
  }, [filters, pathname, pathCategorySlug, router, categoryIndex.idToSlug]);

  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [pendingFilters, setPendingFilters] = useState({
    page: 1,
    limit: 12,
    sortBy: "newest" as const,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minRating: undefined as number | undefined,
    categoryIds: undefined as string[] | undefined,
    inStock: false,
    onSale: false,
    isFeatured: false,
    search: undefined as string | undefined,
  });

  // Fetch products with React Query
  const { data, isLoading, error } = useQuery<ProductListResponse>({
    queryKey: ["shop-products", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", filters.page.toString());
      params.set("limit", filters.limit.toString());
      params.set("sortBy", filters.sortBy);
      if (filters.minPrice) params.set("minPrice", filters.minPrice.toString());
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
      if (filters.minRating) params.set("minRating", filters.minRating.toString());
      if (filters.categoryIds && filters.categoryIds.length > 0) {
        const expanded = expandCategoryIds(filters.categoryIds);
        for (const id of expanded) params.append("categoryId", id);
      }
      if (filters.inStock) params.set("inStock", "true");
      if (filters.onSale) params.set("onSale", "true");
      if (filters.isFeatured) params.set("isFeatured", "true");
      if (filters.search) params.set("q", filters.search);

      return api.get(`/api/storefront/products?${params.toString()}`);
    },
  });

  const handleSortChange = (value: string) => {
    setFilters((prev) => ({ ...prev, sortBy: value as any, page: 1 }));
  };

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 12,
      sortBy: "newest",
      minPrice: undefined,
      maxPrice: undefined,
      minRating: undefined,
      categoryIds: undefined,
      inStock: false,
      onSale: false,
      isFeatured: false,
      search: undefined,
    });
  };

  const hasActiveFilters =
    filters.minPrice ||
    filters.maxPrice ||
    filters.minRating ||
    (filters.categoryIds && filters.categoryIds.length > 0) ||
    filters.inStock ||
    filters.onSale ||
    filters.isFeatured ||
    !!filters.search;

  // Chip labels
  const catMap = useMemo(() => {
    const map = new Map<string, string>();
    const cats = categoriesTree;
    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        map.set(n.id, n.name);
        if (Array.isArray(n.children) && n.children.length) walk(n.children);
      }
    };
    walk(cats);
    return map;
  }, [categoriesTree]);

  // Helpers to work with category trees (expand/compress)
  const collectDescendants = (nodes: any[], targetId: string): Set<string> => {
    const set = new Set<string>();
    const dfs = (n: any) => {
      set.add(n.id);
      if (Array.isArray(n.children)) for (const c of n.children) dfs(c);
    };
    const walkFind = (arr: any[]) => {
      for (const n of arr) {
        if (n.id === targetId) {
          dfs(n);
        } else if (Array.isArray(n.children) && n.children.length) {
          walkFind(n.children);
        }
      }
    };
    walkFind(nodes);
    return set;
  };
  const expandCategoryIds = (ids?: string[]) => {
    if (!ids || !ids.length) return [] as string[];
    const out = new Set<string>();
    for (const id of ids) {
      for (const did of collectDescendants(categoriesTree, id)) out.add(did);
    }
    return Array.from(out);
  };
  const hasAncestor = (nodes: any[], id: string, selected: Set<string>): boolean => {
    // build parent map once
    const parent = new Map<string, string | null>();
    const build = (arr: any[], p: string | null) => {
      for (const n of arr) {
        parent.set(n.id, p);
        if (Array.isArray(n.children) && n.children.length) build(n.children, n.id);
      }
    };
    build(nodes, null);
    let cur = parent.get(id) || null;
    while (cur) {
      if (selected.has(cur)) return true;
      cur = parent.get(cur) || null;
    }
    return false;
  };
  const compressCategoryIds = (ids?: string[]) => {
    if (!ids || !ids.length) return [] as string[];
    const set = new Set(ids);
    return ids.filter((id) => !hasAncestor(categoriesTree, id, set));
  };

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ label: string; onClear: () => void }> = [];
    const displayCategoryIds = compressCategoryIds(filters.categoryIds || []);
    if (displayCategoryIds.length) {
      for (const id of displayCategoryIds) {
        const label = catMap.get(id) || "Category";
        chips.push({ label, onClear: () => handleFilterChange({ categoryIds: (filters.categoryIds || []).filter((x) => x !== id) }) });
      }
    }
    if (filters.minPrice) chips.push({ label: `Min $${filters.minPrice}`, onClear: () => handleFilterChange({ minPrice: undefined }) });
    if (filters.maxPrice) chips.push({ label: `Max $${filters.maxPrice}`, onClear: () => handleFilterChange({ maxPrice: undefined }) });
    if (filters.minRating) chips.push({ label: `${filters.minRating}+ stars`, onClear: () => handleFilterChange({ minRating: undefined }) });
    if (filters.inStock) chips.push({ label: "In stock", onClear: () => handleFilterChange({ inStock: false }) });
    if (filters.onSale) chips.push({ label: "On sale", onClear: () => handleFilterChange({ onSale: false }) });
    if (filters.search) chips.push({ label: `Search: ${filters.search}`, onClear: () => handleFilterChange({ search: undefined }) });
    return chips;
  }, [filters, catMap]);

  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  const baseUrl = useMemo(() => {
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    if (configured) return String(configured).replace(/\/+$/, "");
    if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
    return String(siteConfig.url || "http://localhost:3000").replace(/\/+$/, "");
  }, []);

  const selectedCategory = useMemo(() => {
    const ids = filters.categoryIds || [];
    if (ids.length !== 1) return undefined;
    const id = ids[0];
    const slug = categoryIndex.idToSlug.get(id);
    const name = catMap.get(id);
    if (!slug || !name) return undefined;
    return {
      id,
      slug,
      name,
      url: `${baseUrl}/shop/${encodeURIComponent(slug)}`,
    };
  }, [baseUrl, catMap, categoryIndex.idToSlug, filters.categoryIds]);

  const structuredData = useMemo(() => {
    const qs = searchParams.toString();
    const listUrl = `${baseUrl}${pathname}${qs ? `?${qs}` : ""}`;
    const itemList = (data?.items || []).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${baseUrl}/product/${p.slug}`,
      name: p.name,
    }));

    const crumbs = [
      { name: "Home", item: `${baseUrl}/` },
      { name: "Shop", item: `${baseUrl}/shop` },
      ...(selectedCategory ? [{ name: selectedCategory.name, item: selectedCategory.url }] : []),
    ];

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, idx) => ({
            "@type": "ListItem",
            position: idx + 1,
            name: c.name,
            item: c.item,
          })),
        },
        {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: itemList.length,
          url: listUrl,
          itemListElement: itemList,
        },
      ],
    };
  }, [baseUrl, data?.items, pathname, searchParams, selectedCategory]);

  return (
    <div className="py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CategoryRail
        activeCategoryId={(filters.categoryIds && filters.categoryIds.length === 1) ? filters.categoryIds[0] : undefined}
        onSelect={(categoryId) => {
          if (!categoryId) return handleFilterChange({ categoryIds: undefined });
          // Keep minimal parent-only in state
          handleFilterChange({ categoryIds: [categoryId] });
        }}
      />
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">All Products</h1>
        <p className="text-muted-foreground">
          Discover our complete collection
        </p>
      </div>

      {/* Mobile Filters Drawer */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="left" className="w-[90vw] sm:w-[420px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="p-4 overflow-y-auto h-[calc(100dvh-140px)]">
            <FilterSidebar
              filters={{ ...pendingFilters, categoryIds: expandCategoryIds(pendingFilters.categoryIds) }}
              onFilterChange={(f: any) =>
                setPendingFilters((prev) => {
                  const next = { ...prev, ...f } as any;
                  if (Array.isArray(next.categoryIds)) {
                    next.categoryIds = compressCategoryIds(next.categoryIds);
                  }
                  return next;
                })
              }
            />
          </div>
          <SheetFooter className="p-4 border-t grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPendingFilters({
                  page: 1,
                  limit: 12,
                  sortBy: "newest",
                  minPrice: undefined,
                  maxPrice: undefined,
                  minRating: undefined,
                  categoryIds: undefined,
                  inStock: false,
                  onSale: false,
                  isFeatured: false,
                  search: undefined,
                });
              }}
            >
              Clear
            </Button>
            <Button
              onClick={() => {
                handleFilterChange({
                  minPrice: pendingFilters.minPrice,
                  maxPrice: pendingFilters.maxPrice,
                  minRating: pendingFilters.minRating,
                  categoryIds: pendingFilters.categoryIds,
                  inStock: pendingFilters.inStock,
                  onSale: pendingFilters.onSale,
                  isFeatured: pendingFilters.isFeatured,
                  search: pendingFilters.search,
                });
                setShowMobileFilters(false);
              }}
            >
              Apply
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Toolbar */}
      <div className="mb-3 mt-4">
        {/* Mobile toolbar */}
        <div className="sm:hidden space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPendingFilters(filters);
                setShowMobileFilters(true);
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>

            <div className="flex items-center gap-2">
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {data && (
            <p className="text-sm text-muted-foreground">
              Showing {data.items.length} of {data.total} products
            </p>
          )}

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground px-0"
            >
              <X className="mr-2 h-4 w-4" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Desktop/Tablet toolbar */}
        <div className="hidden sm:flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => {
                setPendingFilters(filters);
                setShowMobileFilters(true);
              }}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                Sort by:
              </span>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price_asc">Price: Low to High</SelectItem>
                  <SelectItem value="price_desc">Price: High to Low</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="popular">Popular</SelectItem>
                </SelectContent>
              </Select>

              <div className="hidden lg:flex items-center gap-1 ml-2 rounded-md border p-1">
                <Button
                  variant={density === "comfortable" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDensity("comfortable")}
                >
                  Comfortable
                </Button>
                <Button
                  variant={density === "compact" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setDensity("compact")}
                >
                  Compact
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {data && (
                <p className="text-sm text-muted-foreground">
                  Showing {data.items.length} of {data.total} products
                </p>
              )}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip, i) => (
            <Button key={i} size="sm" variant="secondary" onClick={chip.onClear}>
              {chip.label}
              <X className="ml-2 h-4 w-4" />
            </Button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <aside className="hidden lg:block">
          <FilterSidebar
            filters={{ ...filters, categoryIds: expandCategoryIds(filters.categoryIds) }}
            onFilterChange={(f: any) => {
              // Normalize to minimal parent-only selection
              const minimal = { ...f };
              if (Array.isArray(minimal.categoryIds)) {
                minimal.categoryIds = compressCategoryIds(minimal.categoryIds);
              }
              handleFilterChange(minimal);
            }}
          />
        </aside>

        {/* Product Grid */}
        <main className="lg:col-span-3">
          {error && (
            <div className="text-center py-12">
              <p className="text-destructive">
                Failed to load products. Please try again.
              </p>
            </div>
          )}

          <ProductGrid
            products={data?.items || []}
            isLoading={isLoading}
            columns={density === "compact" ? 4 : 3}
            density={density}
          />

          {/* Pagination */}
          {data && data.hasMore && (
            <div className="mt-8 text-center">
              <Button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={isLoading}
              >
                Load More
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
