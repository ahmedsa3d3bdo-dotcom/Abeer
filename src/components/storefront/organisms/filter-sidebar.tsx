"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/storefront/api-client";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface FilterSidebarProps {
  filters: {
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    categoryIds?: string[];
    inStock?: boolean;
    onSale?: boolean;
  };
  onFilterChange: (filters: any) => void;
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const [priceRange, setPriceRange] = useState([
    filters.minPrice || 0,
    filters.maxPrice || 1000,
  ]);
  const [minInput, setMinInput] = useState<number | "">(filters.minPrice ?? "");
  const [maxInput, setMaxInput] = useState<number | "">(filters.maxPrice ?? "");

  // Fetch categories
  const { data: categoriesData } = useQuery<{
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      productCount?: number;
      children?: Array<any>;
    }>;
  }>({
    queryKey: ["categories"],
    queryFn: () => api.get("/api/storefront/categories"),
  });

  const categories = categoriesData?.categories || [];

  useEffect(() => {
    setPriceRange([filters.minPrice || 0, filters.maxPrice || 1000]);
    setMinInput(filters.minPrice ?? "");
    setMaxInput(filters.maxPrice ?? "");
  }, [filters.minPrice, filters.maxPrice]);

  // Update price filter when slider changes
  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
  };

  const handlePriceCommit = () => {
    onFilterChange({
      minPrice: priceRange[0] || undefined,
      maxPrice: priceRange[1] || undefined,
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      onFilterChange({
        minPrice: minInput === "" ? undefined : Number(minInput),
        maxPrice: maxInput === "" ? undefined : Number(maxInput),
      });
    }, 350);
    return () => clearTimeout(t);
  }, [minInput, maxInput]);

  // Rating handled via RadioGroup below

  const collectIds = (node: any): string[] => {
    const ids = [node.id];
    if (Array.isArray(node.children) && node.children.length) {
      for (const child of node.children) ids.push(...collectIds(child));
    }
    return ids;
  };

  const handleNodeToggle = (node: any) => {
    const ids = collectIds(node);
    const set = new Set(filters.categoryIds || []);
    const allSelected = ids.every((id) => set.has(id));
    if (allSelected) {
      ids.forEach((id) => set.delete(id));
    } else {
      ids.forEach((id) => set.add(id));
    }
    const next = Array.from(set);
    onFilterChange({ categoryIds: next.length ? next : undefined });
  };

  const handleInStockChange = (checked: boolean) => {
    onFilterChange({ inStock: checked });
  };

  const handleOnSaleChange = (checked: boolean) => {
    onFilterChange({ onSale: checked });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
      </div>

      <details open>
        <summary className="flex items-center justify-between cursor-pointer select-none">
          <span className="font-medium">Categories</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); onFilterChange({ categoryIds: undefined }); }}>Clear</Button>
        </summary>
        <div className="mt-3 space-y-2">
          {categories.map((category: any) => (
            <CategoryNode
              key={category.id}
              node={category}
              depth={0}
              selectedIds={filters.categoryIds || []}
              onToggle={handleNodeToggle}
            />
          ))}
        </div>
      </details>

      <Separator />

      <details open>
        <summary className="flex items-center justify-between cursor-pointer select-none">
          <span className="font-medium">Price Range</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); onFilterChange({ minPrice: undefined, maxPrice: undefined }); }}>Clear</Button>
        </summary>
        <div className="px-2 mt-3">
          <Slider
            min={0}
            max={1000}
            step={10}
            value={priceRange}
            onValueChange={handlePriceChange}
            onValueCommit={handlePriceCommit}
            className="mb-4"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="min-price" className="text-sm">Min</Label>
              <Input id="min-price" type="number" inputMode="numeric" value={minInput as any} onChange={(e) => setMinInput(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="max-price" className="text-sm">Max</Label>
              <Input id="max-price" type="number" inputMode="numeric" value={maxInput as any} onChange={(e) => setMaxInput(e.target.value === "" ? "" : Number(e.target.value))} />
            </div>
          </div>
        </div>
      </details>

      <Separator />

      <details open>
        <summary className="flex items-center justify-between cursor-pointer select-none">
          <span className="font-medium">Minimum Rating</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onFilterChange({ minRating: undefined });
            }}
          >
            Clear
          </Button>
        </summary>
        <div className="mt-3">
          <RadioGroup
            value={filters.minRating ? String(filters.minRating) : "any"}
            onValueChange={(val) =>
              onFilterChange({ minRating: val === "any" ? undefined : Number(val) })
            }
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="rating-any" value="any" />
              <Label htmlFor="rating-any" className="text-sm font-normal cursor-pointer">
                Any rating
              </Label>
            </div>
            {[4, 3, 2, 1].map((rating) => (
              <div className="flex items-center gap-2" key={rating}>
                <RadioGroupItem id={`rating-${rating}`} value={String(rating)} />
                <Label
                  htmlFor={`rating-${rating}`}
                  className="text-sm font-normal cursor-pointer flex items-center select-none"
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={
                        i < rating
                          ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                          : "h-4 w-4 text-muted-foreground"
                      }
                    />
                  ))}
                  <span className="ml-2">& Up</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </details>

      <Separator />

      <details open>
        <summary className="flex items-center justify-between cursor-pointer select-none">
          <span className="font-medium">Availability</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); onFilterChange({ inStock: false }); }}>Clear</Button>
        </summary>
        <div className="flex items-center space-x-2 mt-3">
          <Checkbox
            id="in-stock"
            checked={filters.inStock || false}
            onCheckedChange={handleInStockChange}
          />
          <Label
            htmlFor="in-stock"
            className="text-sm font-normal cursor-pointer"
          >
            In Stock Only
          </Label>
        </div>
      </details>

      <Separator />

      <details open>
        <summary className="flex items-center justify-between cursor-pointer select-none">
          <span className="font-medium">Deals</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); onFilterChange({ onSale: false }); }}>Clear</Button>
        </summary>
        <div className="flex items-center space-x-2 mt-3">
          <Checkbox
            id="on-sale"
            checked={filters.onSale || false}
            onCheckedChange={handleOnSaleChange}
          />
          <Label htmlFor="on-sale" className="text-sm font-normal cursor-pointer">
            On sale only
          </Label>
        </div>
      </details>
    </div>
  );
}

function CategoryNode({
  node,
  depth,
  selectedIds,
  onToggle,
}: {
  node: any;
  depth: number;
  selectedIds: string[];
  onToggle: (node: any) => void;
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const collectIds = (n: any): string[] => {
    const ids = [n.id];
    if (Array.isArray(n.children) && n.children.length) {
      for (const c of n.children) ids.push(...collectIds(c));
    }
    return ids;
  };
  const countSelectedInSubtree = (n: any): number => {
    const ids = collectIds(n);
    let cnt = 0;
    for (const id of ids) if (selectedIds.includes(id)) cnt++;
    return cnt;
  };
  const totalNodes = collectIds(node).length;
  const selectedCount = countSelectedInSubtree(node);
  const triState = selectedCount === 0 ? false : selectedCount === totalNodes ? true : "indeterminate" as const;
  const hasActive = selectedCount > 0;
  const subtreeCount = (function total(n: any): number {
    let sum = Number(n.productCount || 0);
    if (Array.isArray(n.children) && n.children.length) {
      for (const c of n.children) sum += total(c);
    }
    return sum;
  })(node);

  if (hasChildren) {
    return (
      <details open={hasActive}>
        <summary className="cursor-pointer select-none">
          <div className="flex items-center space-x-2" style={{ marginLeft: depth * 12 }}>
            <Checkbox
              id={`category-${node.id}`}
              checked={triState}
              onCheckedChange={() => onToggle(node)}
            />
            <Label htmlFor={`category-${node.id}`} className="text-sm font-normal cursor-pointer flex-1">
              {node.name}
              {subtreeCount > 0 && (
                <span className="text-muted-foreground ml-2">({subtreeCount})</span>
              )}
            </Label>
          </div>
        </summary>
        <div className="mt-2 space-y-2">
          {node.children.map((child: any) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedIds={selectedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="flex items-center space-x-2" style={{ marginLeft: depth * 12 }}>
      <Checkbox
        id={`category-${node.id}`}
        checked={triState}
        onCheckedChange={() => onToggle(node)}
      />
      <Label htmlFor={`category-${node.id}`} className="text-sm font-normal cursor-pointer flex-1">
        {node.name}
        {(Number(node.productCount || 0) > 0) && (
          <span className="text-muted-foreground ml-2">({Number(node.productCount || 0)})</span>
        )}
      </Label>
    </div>
  );
}
