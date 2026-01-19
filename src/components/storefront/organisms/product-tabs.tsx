"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, FileText, Truck } from "lucide-react";
import type { Product } from "@/types/storefront";
import type { ShippingMethod } from "@/types/storefront";

interface ProductTabsProps {
  product: Product;
}

export function ProductTabs({ product }: ProductTabsProps) {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setShippingLoading(true);
        setShippingError(null);
        const res = await fetch("/api/storefront/shipping/methods");
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error?.message || "Failed to load shipping methods");
        if (!mounted) return;
        const methods = Array.isArray(json?.data) ? (json.data as ShippingMethod[]) : [];
        setShippingMethods(methods.map((m) => ({ ...m, price: Number((m as any)?.price ?? 0) })));
      } catch (e: any) {
        if (!mounted) return;
        setShippingError(e?.message || "Failed to load shipping methods");
        setShippingMethods([]);
      } finally {
        if (mounted) setShippingLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
        <TabsTrigger value="description" className="gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Description</span>
        </TabsTrigger>
        <TabsTrigger value="specifications" className="gap-2">
          <Package className="h-4 w-4" />
          <span className="hidden sm:inline">Specifications</span>
        </TabsTrigger>
        <TabsTrigger value="shipping" className="gap-2">
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">Shipping</span>
        </TabsTrigger>
      </TabsList>

      {/* Description Tab */}
      <TabsContent value="description" className="mt-6 space-y-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {product.description ? (
            <div
              dangerouslySetInnerHTML={{ __html: product.description }}
              className="text-muted-foreground leading-relaxed"
            />
          ) : (
            <p className="text-muted-foreground">
              No description available for this product.
            </p>
          )}
        </div>
      </TabsContent>

      {/* Specifications Tab */}
      <TabsContent value="specifications" className="mt-6">
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-2 gap-4 p-4">
            <span className="font-medium">SKU</span>
            <span className="text-muted-foreground">{product.sku}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <span className="font-medium">Status</span>
            <span className="text-muted-foreground capitalize">
              {product.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 p-4">
            <span className="font-medium">Stock Status</span>
            <span className="text-muted-foreground capitalize">
              {product.stockStatus.replace("_", " ")}
            </span>
          </div>
          {product.categories && product.categories.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4">
              <span className="font-medium">Categories</span>
              <span className="text-muted-foreground">
                {product.categories.map((c) => c.name).join(", ")}
              </span>
            </div>
          )}
          {product.variants && product.variants.length > 0 && (
            <div className="grid grid-cols-2 gap-4 p-4">
              <span className="font-medium">Available Variants</span>
              <span className="text-muted-foreground">
                {product.variants.length} options
              </span>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Shipping Tab */}
      <TabsContent value="shipping" className="mt-6 space-y-4">
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-start gap-4">
            <Truck className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Shipping Methods</h3>
              <p className="text-sm text-muted-foreground">Available shipping options for this product.</p>
            </div>
          </div>

          {shippingLoading ? (
            <div className="text-sm text-muted-foreground">Loading shipping methods...</div>
          ) : shippingError ? (
            <div className="text-sm text-destructive">{shippingError}</div>
          ) : shippingMethods.length === 0 ? (
            <div className="text-sm text-muted-foreground">No shipping methods available.</div>
          ) : (
            <div className="space-y-3">
              {shippingMethods.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    {(m.description || m.carrier || typeof m.estimatedDays === "number") && (
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {m.description ? m.description : null}
                        {!m.description && m.carrier ? m.carrier : null}
                        {typeof m.estimatedDays === "number" ? (
                          <span className={m.description || m.carrier ? "ml-2" : undefined}>
                            {m.estimatedDays <= 0 ? "" : `Estimated: ${m.estimatedDays} day${m.estimatedDays === 1 ? "" : "s"}`}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-sm font-semibold">
                    {Number(m.price) === 0 ? <span className="text-green-600">FREE</span> : `$${Number(m.price).toFixed(2)}`}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-start gap-4">
            <Package className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold mb-1">Easy Returns</h3>
              <p className="text-sm text-muted-foreground">
                30-day return policy. Items must be in original condition with
                tags attached.
              </p>
            </div>
          </div>
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-2">Estimated Delivery Times:</h4>
            {shippingMethods.length ? (
              <ul className="text-sm text-muted-foreground space-y-1">
                {shippingMethods.map((m) => (
                  <li key={`${m.id}-eta`}>
                    {m.name}: {typeof m.estimatedDays === "number" && m.estimatedDays > 0 ? `${m.estimatedDays} day${m.estimatedDays === 1 ? "" : "s"}` : "—"}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-muted-foreground">—</div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
