import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, ArrowRight, Clock } from "lucide-react";

type Offer = {
  id: string;
  name: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  scope: string;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: any;
};

export function SeasonalOffersBanner({ offers }: { offers?: Offer[] }) {
  const safeOffers = offers || [];
  if (!safeOffers.length) return null;

  const renderValue = (o: Offer) => {
    if (o.type === "percentage") return `${parseFloat(o.value)}% off`;
    if (o.type === "fixed_amount") return `$${parseFloat(o.value).toFixed(2)} off`;
    return "Free shipping";
  };

  return (
    <div className="w-full border-y border-border/50 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 py-4 sm:py-6">
      {/* Section Header */}
      <div className="mb-3 sm:mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Tag className="w-4 h-4 text-primary" />
        <span className="font-medium">Seasonal offers</span>
      </div>

      {/* Offers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {safeOffers.map((o) => (
          <div
            key={o.id}
            className="group rounded-xl sm:rounded-2xl border border-border/50 bg-background/80 backdrop-blur-sm p-4 sm:p-5 flex items-start justify-between gap-3 transition-all duration-300 hover:shadow-md hover:border-primary/20"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {renderValue(o)}
                </Badge>
                {o.metadata?.offerKind === "bundle" && (
                  <Badge variant="default" className="bg-accent text-accent-foreground">
                    Bundle
                  </Badge>
                )}
              </div>
              <div className="font-medium text-sm sm:text-base truncate" title={o.name}>
                {o.name}
              </div>
              {(o.endsAt || o.startsAt) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    {o.startsAt ? `From ${new Date(o.startsAt).toLocaleDateString()}` : "Now"}
                    {o.endsAt ? ` · Until ${new Date(o.endsAt).toLocaleDateString()}` : ""}
                  </span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300"
            >
              <a href="/shop/sale" className="flex items-center gap-1">
                Shop
                <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
              </a>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

