import { HeroSection } from "@/components/storefront/homepage/hero-section";
import { FeaturedProducts } from "@/components/storefront/homepage/featured-products";
import { CategoryCarousel } from "@/components/storefront/homepage/category-carousel";
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

export const revalidate = 60; // ISR: Revalidate every 60 seconds

async function getCategories() {
  try {
    return await storefrontCategoriesService.getTopLevel(12);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export default async function HomePage() {
  const siteName = (await settingsRepository.findByKey("site_name"))?.value || siteConfig.name || "";
  const categories = await getCategories();

  return (
    <div className="flex flex-col">
      {/* Hero Section - Full width immersive experience */}
      <HeroSection />

      {/* Category Carousel - Right after hero for immediate discovery */}
      <CategoryCarousel categories={categories} />

      {/* Seasonal Offers Banner */}
      <AnimatedSection animation="fade-up" delay={100}>
        <SeasonalOffersBanner />
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
