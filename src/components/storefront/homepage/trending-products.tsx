import { ProductCardSkeleton } from "../atoms/product-card-skeleton";
import { ProductGrid } from "../organisms/product-grid";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import { storefrontProductsService } from "@/server/storefront/services/products.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTrendingProducts() {
  try {
    // Avoid self-fetching API routes during `next build`.
    return await storefrontProductsService.getTrending(8);
  } catch (error) {
    console.error("Error fetching trending products:", error);
    return [];
  }
}

export async function TrendingProducts() {
  const products = await getTrendingProducts();

  if (products.length === 0) {
    return null; // Don't render section if no trending products
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10 lg:mb-12">
        <div className="space-y-1 sm:space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Trending Now
            </h2>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md">
            Most popular products this week — see what others are loving
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="group w-fit hover:bg-primary hover:text-primary-foreground transition-all duration-300"
        >
          <Link href="/shop?sortBy=popular" className="flex items-center gap-2">
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
