"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProductVariant } from "@/types/storefront";

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariantId?: string;
  onVariantChange: (variantId: string) => void;
}

export function VariantSelector({
  variants,
  selectedVariantId,
  onVariantChange,
}: VariantSelectorProps) {
  // Group variants by option type (e.g., size, color)
  const optionTypes = Array.from(
    new Set(
      variants.flatMap((v) => Object.keys(v.options))
    )
  );

  // Get unique values for each option type
  const getOptionValues = (optionType: string) => {
    return Array.from(
      new Set(variants.map((v) => v.options[optionType]).filter(Boolean))
    );
  };

  // Get available variants for a specific option value
  const getAvailableVariants = (optionType: string, value: string) => {
    return variants.filter(
      (v) => v.options[optionType] === value && v.isActive && v.stockQuantity > 0
    );
  };

  // Get current selections from selected variant
  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const currentSelections = selectedVariant?.options || {};

  // Handle option selection
  const handleOptionSelect = (optionType: string, value: string) => {
    // Find a variant that matches this selection along with other current selections
    const matchingVariant = variants.find((v) => {
      const matches = Object.entries({ ...currentSelections, [optionType]: value }).every(
        ([key, val]) => v.options[key] === val
      );
      return matches && v.isActive;
    });

    if (matchingVariant) {
      onVariantChange(matchingVariant.id);
    }
  };

  return (
    <div className="space-y-4">
      {optionTypes.map((optionType) => {
        const values = getOptionValues(optionType);

        return (
          <div key={optionType}>
            <label className="text-sm font-medium mb-3 block capitalize">
              {optionType}
              {currentSelections[optionType] && (
                <span className="text-muted-foreground ml-2">
                  : {currentSelections[optionType]}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2">
              {values.map((value) => {
                const isSelected = currentSelections[optionType] === value;
                const availableVariants = getAvailableVariants(optionType, value);
                const isAvailable = availableVariants.length > 0;

                return (
                  <Button
                    key={value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleOptionSelect(optionType, value)}
                    disabled={!isAvailable}
                    className={cn(
                      "min-w-[60px]",
                      !isAvailable && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {value}
                  </Button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Selected:</span> {selectedVariant.name}
          {selectedVariant.stockQuantity <= 5 && (
            <span className="text-orange-600 ml-2">
              (Only {selectedVariant.stockQuantity} left)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
