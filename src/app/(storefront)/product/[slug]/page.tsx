import { notFound } from "next/navigation";
import { api } from "@/lib/storefront/api-client";
import { ProductGallery } from "@/components/storefront/organisms/product-gallery";
import { ProductInfo } from "@/components/storefront/organisms/product-info";
import { ProductTabs } from "@/components/storefront/organisms/product-tabs";
import { RelatedProducts } from "@/components/storefront/organisms/related-products";
import { ProductReviews } from "@/components/storefront/organisms/product-reviews";
import { Breadcrumbs } from "@/components/storefront/atoms/breadcrumbs";
import type { Product } from "@/types/storefront";
import { storefrontProductsService } from "@/server/storefront/services/products.service";
import { RecentlyViewedTracker } from "@/components/storefront/organisms/recently-viewed-tracker";
import { RecentlyViewedCarousel } from "@/components/storefront/organisms/recently-viewed-carousel";
import { RecommendationsRail } from "@/components/storefront/organisms/recommendations-rail";
import { settingsRepository } from "@/server/repositories/settings.repository";

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  try {
    const product: Product = await api.get(`/api/storefront/products/${slug}`);
    
    return {
      title: product.metaTitle || product.name,
      description: product.metaDescription || product.shortDescription || product.description,
      openGraph: {
        title: product.name,
        description: product.shortDescription,
        images: product.images.map(img => ({ url: img.url, alt: img.altText })),
      },
    };
  } catch {
    return {
      title: "Product Not Found",
    };
  }
}

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const product: Product = await api.get(`/api/storefront/products/${slug}`);
    return product;
  } catch (error) {
    try {
      const product = await storefrontProductsService.getBySlug(slug);
      return product;
    } catch {
      return null;
    }
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const currency = (await settingsRepository.findByKey("currency"))?.value || "CAD";

  if (!product) {
    notFound();
  }

  // Build breadcrumb path
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
    ...(product.categories && product.categories.length > 0
      ? [{ label: product.categories[0].name, href: `/shop?categoryId=${product.categories[0].id}` }]
      : []),
    { label: product.name, href: `/product/${slug}` },
  ];

  return (
    <div className="container py-8">
      <RecentlyViewedTracker
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          primaryImage: product.images?.[0]?.url,
          rating: product.averageRating,
          reviewCount: product.reviewCount,
        }}
      />
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbs} className="mb-6" />

      {/* Product Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Image Gallery */}
        <ProductGallery images={product.images} productName={product.name} />

        {/* Product Info */}
        <ProductInfo product={product} />
      </div>

      {/* Product Tabs */}
      <ProductTabs product={product} />

      {/* Product Reviews */}
      <ProductReviews
        productId={product.id}
        averageRating={product.averageRating}
        reviewCount={product.reviewCount}
      />

      {/* Related Products */}
      <RecommendationsRail context="product" productId={product.id} title="You may also like" limit={6} />

      {/* Recently Viewed */}
      <RecentlyViewedCarousel />

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.images.map(img => img.url),
            sku: product.sku,
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: currency,
              availability: product.stockStatus === "in_stock"
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            },
            aggregateRating: product.averageRating > 0 ? {
              "@type": "AggregateRating",
              ratingValue: product.averageRating,
              reviewCount: product.reviewCount,
            } : undefined,
          }),
        }}
      />
    </div>
  );
}
