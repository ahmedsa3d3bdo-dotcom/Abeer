"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HScrollButtonsProps {
  containerId: string;
  step?: number;
  className?: string;
  sideOffset?: number; // px offset to place buttons just outside content
}

export function HScrollButtons({ containerId, step = 300, className, sideOffset = 12 }: HScrollButtonsProps) {
  const scrollBy = (delta: number) => {
    const el = document.getElementById(containerId);
    if (el) el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <div className={className}>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 -translate-y-1/2 shadow-lg pointer-events-auto"
        style={{ left: `-${sideOffset}px` }}
        onClick={() => scrollBy(-step)}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Scroll left</span>
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-1/2 -translate-y-1/2 shadow-lg pointer-events-auto"
        style={{ right: `-${sideOffset}px` }}
        onClick={() => scrollBy(step)}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Scroll right</span>
      </Button>
    </div>
  );
}
