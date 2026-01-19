"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/storefront/api-client";
import { ProductGrid } from "@/components/storefront/organisms/product-grid";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ProductListResponse } from "@/types/storefront";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [sortBy, setSortBy] = useState<string>("relevance");

  // Fetch search results
  const { data, isLoading, error } = useQuery<ProductListResponse>({
    queryKey: ["search-results", query, sortBy],
    queryFn: async () => {
      if (!query) return { items: [], total: 0, page: 1, limit: 12, hasMore: false };

      const params = new URLSearchParams();
      params.set("search", query);
      params.set("page", "1");
      params.set("limit", "24");
      if (sortBy && sortBy !== "relevance") {
        params.set("sortBy", sortBy);
      }

      return api.get(`/api/storefront/products?${params.toString()}`);
    },
    enabled: !!query, // Only run query if search term exists
  });

  const handleSortChange = (value: string) => {
    setSortBy(value);
  };

  // Highlight search query in text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-900 px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  if (!query) {
    return (
      <div className="container py-16">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <Search className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Search Products</h1>
          <p className="text-muted-foreground mb-6">
            Enter a search term to find products
          </p>
          <Link href="/shop">
            <Button>Browse All Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Search Results for "{highlightText(query, query)}"
        </h1>
        {data && (
          <p className="text-muted-foreground">
            {data.total === 0
              ? "No products found"
              : `Found ${data.total} ${data.total === 1 ? "product" : "products"}`}
          </p>
        )}
      </div>

      {/* Toolbar */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Clear search */}
            <Link href="/shop">
              <Button variant="ghost" size="sm">
                <X className="mr-2 h-4 w-4" />
                Clear search
              </Button>
            </Link>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Sort by:
            </span>
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
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
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive">
            Failed to load search results. Please try again.
          </p>
        </div>
      )}

      {/* Results */}
      {data && data.total > 0 && (
        <ProductGrid products={data.items} isLoading={isLoading} columns={4} />
      )}

      {/* No Results */}
      {data && data.total === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="mb-6">
            <Search className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No products found</h2>
            <p className="text-muted-foreground mb-6">
              We couldn't find any products matching "{query}"
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Search Tips:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your spelling</li>
                <li>• Try more general keywords</li>
                <li>• Try different keywords</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link href="/shop">
                <Button>Browse All Products</Button>
              </Link>
            </div>
          </div>

          {/* TODO: Show suggested products */}
        </div>
      )}
    </div>
  );
}
