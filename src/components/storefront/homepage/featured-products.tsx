import { ProductGrid } from "../organisms/product-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { storefrontProductsService } from "@/server/storefront/services/products.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getFeaturedProducts() {
  try {
    // Avoid self-fetching API routes during `next build`.
    return await storefrontProductsService.getFeatured(8);
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();

  if (products.length === 0) {
    return null; // Don't render section if no featured products
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10 lg:mb-12">
        <div className="space-y-1 sm:space-y-2">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Featured Products
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md">
            Handpicked items just for you — our editors&apos; top picks this season
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="group w-fit hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          <Link href="/shop" className="flex items-center gap-2">
            View All
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>

      {/* Responsive Product Grid */}
      <ProductGrid products={products} columns={4} />
    </section>
  );
}
