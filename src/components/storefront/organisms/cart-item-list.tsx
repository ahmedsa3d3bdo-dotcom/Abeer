"use client";

import { CartItem } from "@/components/storefront/molecules/cart-item";
import { Separator } from "@/components/ui/separator";
import type { CartItem as CartItemType } from "@/types/storefront";

interface CartItemListProps {
  items: CartItemType[];
}

export function CartItemList({ items }: CartItemListProps) {
  return (
    <div className="border rounded-lg">
      {items.map((item, index) => (
        <div key={item.id}>
          <CartItem item={item} />
          {index < items.length - 1 && <Separator />}
        </div>
      ))}
    </div>
  );
}
