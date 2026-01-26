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
import { storefrontOffersService } from "@/server/storefront/services/offers.service";
import { settingsRepository } from "@/server/repositories/settings.repository";
import { siteConfig } from "@/config/site";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

type SeasonalOffer = {
  id: string;
  name: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: any;
};

async function getCategoriesTree() {
  try {
    return await storefrontCategoriesService.getTree();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

async function getSeasonalOffers(): Promise<SeasonalOffer[]> {
  const rows = await storefrontOffersService.listActiveDisplayPromotions();
  return rows.slice(0, 4).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    value: r.value,
    startsAt: r.startsAt ? new Date(r.startsAt as any).toISOString() : null,
    endsAt: r.endsAt ? new Date(r.endsAt as any).toISOString() : null,
    metadata: r.metadata,
  }));
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
      <AnimatedSection animation="fade-up" delay={100} defer>
        <SeasonalOffersBanner offers={seasonalOffers} />
      </AnimatedSection>

      <CategoryCarousel categories={topLevelCategories} />

      {/* Subcategory Carousel - deeper browsing right after top categories */}
      <SubcategoryCarousel categories={categoriesTree} />

      {/* Featured Products */}
      <AnimatedSection animation="fade-up" delay={0} defer>
        <FeaturedProducts />
      </AnimatedSection>

      {/* Trending Products */}
      <AnimatedSection animation="fade-up" delay={0} defer>
        <TrendingProducts />
      </AnimatedSection>

      {/* Fashion Video Section */}
      <AnimatedSection animation="zoom-in" delay={0} defer>
        <FashionVideoSection />
      </AnimatedSection>

      {/* Recently Viewed */}
      <AnimatedSection animation="fade-up" delay={0} defer>
        <RecentlyViewedCarousel />
      </AnimatedSection>

      {/* Personalized Recommendations */}
      <AnimatedSection animation="fade-up" delay={0} defer>
        <RecommendationsRail context="user" title="For you" limit={6} />
      </AnimatedSection>

      {/* Reviews Section */}
      <AnimatedSection animation="fade-up" delay={0} defer>
        <ReviewsSection />
      </AnimatedSection>

      {/* Newsletter Section */}
      <AnimatedSection animation="scale-in" delay={0} defer>
        <NewsletterSection />
      </AnimatedSection>
    </div>
  );
}
