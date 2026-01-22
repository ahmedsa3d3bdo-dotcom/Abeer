import { HeroSection } from "@/components/storefront/homepage/hero-section";
import { FeaturedProducts } from "@/components/storefront/homepage/featured-products";
import { CategoryCarousel } from "@/components/storefront/homepage/category-carousel";
import { SubcategoryCarousel } from "@/components/storefront/homepage/subcategory-carousel";
import { FashionVideoSection } from "@/components/storefront/homepage/fashion-video";
import { TrendingProducts } from "@/components/storefront/homepage/trending-products";
import { ReviewsSection } from "@/components/storefront/homepage/reviews-section";
import { NewsletterSection } from "@/components/storefront/homepage/newsletter";
import { RecentlyViewedCarousel } from "@/components/storefront/organisms/recently-viewed-carousel";
import { RecommendationsRail } from "@/components/storefront/organisms/recommendations-rail";
import { SeasonalOffersBanner } from "@/components/storefront/homepage/seasonal-offers-banner";
import { AnimatedSection } from "@/components/storefront/homepage/scroll-animations";
import { storefrontCategoriesService } from "@/server/storefront/services/categories.service";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { siteConfig } from "@/config/site";
import { db } from "@/shared/db";
import * as schema from "@/shared/db/schema";
import { sql } from "drizzle-orm";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

async function getCategoriesTree() {
  try {
    return await storefrontCategoriesService.getTree();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

async function getSeasonalOffers() {
  const now = new Date();
  const rows = await db
    .select({
      id: schema.discounts.id,
      name: schema.discounts.name,
      type: schema.discounts.type,
      value: schema.discounts.value,
      scope: schema.discounts.scope,
      startsAt: schema.discounts.startsAt,
      endsAt: schema.discounts.endsAt,
      metadata: schema.discounts.metadata,
    })
    .from(schema.discounts)
    .where(
      sql`${schema.discounts.isAutomatic} = true and ${schema.discounts.status} = 'active' and (${schema.discounts.startsAt} is null or ${schema.discounts.startsAt} <= ${now}) and (${schema.discounts.endsAt} is null or ${schema.discounts.endsAt} >= ${now})`
    )
    .orderBy(schema.discounts.startsAt as any);

  return rows.filter((o: any) => o.startsAt || o.endsAt).slice(0, 4);
}

export default async function HomePage() {
  const siteName = (await settingsRepository.findByKey("site_name"))?.value || siteConfig.name || "";
  const categoriesTree = await getCategoriesTree();
  const topLevelCategories = categoriesTree.slice(0, 12);
  const seasonalOffers = await getSeasonalOffers();

  return (
    <div className="flex flex-col">
      {/* Hero Section - Full width immersive experience */}
      <HeroSection />

      {/* Category Carousel - Right after hero for immediate discovery */}
      <CategoryCarousel categories={topLevelCategories} />

      {/* Subcategory Carousel - deeper browsing right after top categories */}
      <SubcategoryCarousel categories={categoriesTree} />

      {/* Seasonal Offers Banner */}
      <AnimatedSection animation="fade-up" delay={100}>
        <SeasonalOffersBanner offers={seasonalOffers} />
      </AnimatedSection>

      {/* Featured Products */}
      <AnimatedSection animation="fade-up" delay={0}>
        <FeaturedProducts />
      </AnimatedSection>

      {/* Trending Products */}
      <AnimatedSection animation="fade-up" delay={0}>
        <TrendingProducts />
      </AnimatedSection>

      {/* Fashion Video Section */}
      <AnimatedSection animation="zoom-in" delay={0}>
        <FashionVideoSection />
      </AnimatedSection>

      {/* Recently Viewed */}
      <AnimatedSection animation="fade-up" delay={0}>
        <RecentlyViewedCarousel />
      </AnimatedSection>

      {/* Personalized Recommendations */}
      <AnimatedSection animation="fade-up" delay={0}>
        <RecommendationsRail context="user" title="For you" limit={6} />
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection animation="fade-up" delay={0}>
        <ReviewsSection />
      </AnimatedSection>

      {/* Newsletter Section */}
      <AnimatedSection animation="scale-in" delay={0}>
        <NewsletterSection />
      </AnimatedSection>
    </div>
  );
}
