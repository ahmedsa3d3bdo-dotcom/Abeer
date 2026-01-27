"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantitySelector } from "./quantity-selector";
import { useCartStore } from "@/stores/cart.store";
import type { CartItem as CartItemType } from "@/types/storefront";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const isLoading = useCartStore((state) => state.isLoading);

  const handleQuantityChange = (newQuantity: number) => {
    updateQuantity(item.id, newQuantity);
  };

  const handleRemove = () => {
    removeItem(item.id);
    setShowRemoveDialog(false);
  };

  const itemTotal = item.totalPrice;
  const isGift = Boolean((item as any).isGift);
  const referencePrice = Number((item as any).referencePrice ?? item.unitPrice ?? 0);
  const compareAt = Number((item as any).compareAtPrice ?? 0);
  const unit = Number(item.unitPrice ?? 0);
  const hasSaleCompareAt =
    !isGift && Number.isFinite(compareAt) && compareAt > 0 && Number.isFinite(referencePrice) && compareAt > referencePrice;
  const hasPromotionPrice =
    !isGift && Number.isFinite(referencePrice) && referencePrice > 0 && Number.isFinite(unit) && unit > 0 && unit < referencePrice;
  const promotionName = !isGift ? String((item as any).promotionName || "") : "";

  return (
    <>
      <div className="p-4 sm:p-6">
        <div className="flex gap-4">
          {/* Product Image */}
          <Link
            href={`/product/${item.productSlug}`}
            className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 rounded-lg overflow-hidden border bg-muted"
          >
            <Image
              src={item.image}
              alt={item.productName}
              fill
              className="object-cover"
              sizes="112px"
            />
          </Link>

          {/* Product Info */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/product/${item.productSlug}`}
                  className="font-semibold hover:underline line-clamp-2"
                >
                  {item.productName}
                </Link>

                {isGift ? (
                  <div className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">
                    Free gift
                  </div>
                ) : null}

                {promotionName ? (
                  <div className="mt-1 text-xs font-medium text-green-700 dark:text-green-300">{promotionName}</div>
                ) : null}
                
                {/* Variant Info */}
                {item.variantName && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.variantName}
                  </p>
                )}
                
                {/* SKU */}
                <p className="text-xs text-muted-foreground mt-1">
                  SKU: {item.sku}
                </p>
              </div>

              {/* Remove Button - Desktop */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRemoveDialog(true)}
                disabled={isLoading}
                className="flex"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="sr-only">Remove item</span>
              </Button>
            </div>

            {/* Price and Quantity */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Quantity Selector */}
                <QuantitySelector
                  value={item.quantity}
                  onChange={handleQuantityChange}
                  max={99}
                  className="scale-90 origin-left"
                />
              </div>

              {/* Price */}
              <div className="text-right">
                {isGift ? (
                  <>
                    <div className="font-semibold text-green-700 dark:text-green-300">FREE</div>
                    <div className="text-xs text-muted-foreground mt-1">$0.00 each</div>
                  </>
                ) : (
                  <>
                    {hasSaleCompareAt ? (
                      <div className="text-xs text-muted-foreground line-through">
                        ${(compareAt * Number(item.quantity ?? 0)).toFixed(2)}
                      </div>
                    ) : null}
                    {hasPromotionPrice ? (
                      <div className="text-xs text-muted-foreground line-through">
                        ${(referencePrice * Number(item.quantity ?? 0)).toFixed(2)}
                      </div>
                    ) : null}
                    <div className="font-semibold">${itemTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {hasSaleCompareAt ? <span className="line-through mr-2">${compareAt.toFixed(2)}</span> : null}
                      {hasPromotionPrice ? <span className="line-through mr-2">${referencePrice.toFixed(2)}</span> : null}
                      <span>${unit.toFixed(2)} each</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove item from cart?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{item.productName}" from your cart?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
