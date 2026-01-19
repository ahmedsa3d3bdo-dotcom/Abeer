import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductBadgeProps {
  type: "new" | "sale" | "low-stock" | "out-of-stock" | "featured";
  className?: string;
}

export function ProductBadge({ type, className }: ProductBadgeProps) {
  const config = {
    new: {
      label: "New",
      className: "bg-blue-500 hover:bg-blue-600",
    },
    sale: {
      label: "Sale",
      className: "bg-destructive hover:bg-destructive/90",
    },
    "low-stock": {
      label: "Low Stock",
      className: "bg-orange-500 hover:bg-orange-600",
    },
    "out-of-stock": {
      label: "Out of Stock",
      className: "bg-zinc-600 hover:bg-zinc-700",
    },
    featured: {
      label: "Featured",
      className: "bg-primary hover:bg-primary/90",
    },
  };

  const { label, className: badgeClassName } = config[type];

  return (
    <Badge className={cn(badgeClassName, "text-white", className)}>
      {label}
    </Badge>
  );
}
