import Link from "next/link";
import { Star, Quote } from "lucide-react";
import { storefrontReviewsService } from "@/server/storefront/services/reviews.service";

export async function ReviewsSection() {
  // Fetch latest approved reviews across products
  const reviews = await storefrontReviewsService.listRecent(4);

  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      {/* Section Header */}
      <div className="mb-8 sm:mb-10 lg:mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          What Customers Say
        </h2>
        <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base max-w-md mx-auto">
          Real reviews from our valued customers
        </p>
      </div>

      {/* Reviews Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
        {reviews.map((r, index) => (
          <div
            key={r.id}
            className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/80 p-5 sm:p-6 flex flex-col gap-4 transition-all duration-500 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
          >
            {/* Quote Icon */}
            <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/10 group-hover:text-primary/20 transition-colors duration-300" />

            {/* Header: Name & Date */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                {/* Avatar placeholder */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                  {r.authorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm sm:text-base">{r.authorName}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Star Rating */}
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < r.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-muted-foreground/20 text-muted-foreground/20"
                    }`}
                />
              ))}
            </div>

            {/* Review Title & Comment */}
            <div className="flex-1">
              {r.title && (
                <h4 className="font-medium text-sm sm:text-base mb-1 line-clamp-1">
                  {r.title}
                </h4>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                {r.comment}
              </p>
            </div>

            {/* Product Link */}
            <div className="pt-3 border-t border-border/50">
              <Link
                href={`/product/${r.product.slug}`}
                className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors duration-300 flex items-center gap-1"
              >
                <span className="truncate">For {r.product.name}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
