import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  className?: string;
  showCurrency?: boolean;
  showDiscountBadge?: boolean;
}

function formatPrice(value: number) {
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(2);
}

export function PriceDisplay({
  price,
  compareAtPrice,
  className,
  showCurrency = true,
  showDiscountBadge = true,
}: PriceDisplayProps) {
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const discountPercent = hasDiscount
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-lg font-bold text-primary">
        {showCurrency && "$"}
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {showCurrency && "$"}
            {formatPrice(compareAtPrice)}
          </span>
          {showDiscountBadge && (
            <span className="text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">
              -{discountPercent}%
            </span>
          )}
        </>
      )}
    </div>
  );
}
