"use client";

import { type MouseEvent, type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
  children?: CategoryNode[];
};

type SubcategoryItem = {
  id: string;
  name: string;
  slug: string;
  image?: string | null;
  productCount?: number;
  parentId: string;
  parentName: string;
};

export function SubcategoryCarousel({
  categories,
  limit = 24,
}: {
  categories?: CategoryNode[];
  limit?: number;
}) {
  const items = useMemo(() => {
    const totalProducts = (node: CategoryNode): number => {
      const direct = typeof node.productCount === "number" ? node.productCount : 0;
      const children = node.children || [];
      if (!children.length) return direct;
      return direct + children.reduce((acc, c) => acc + totalProducts(c), 0);
    };

    const out: SubcategoryItem[] = [];
    for (const parent of categories || []) {
      const children = parent.children || [];
      for (const child of children) {
        const count = totalProducts(child);
        if (count <= 0) continue;
        out.push({
          id: child.id,
          name: child.name,
          slug: child.slug,
          image: child.image,
          productCount: count,
          parentId: parent.id,
          parentName: parent.name,
        });
      }
    }
    return out.slice(0, Math.max(0, limit));
  }, [categories, limit]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const getVisibleCards = useCallback(() => {
    if (typeof window === "undefined") return 3;
    const width = window.innerWidth;
    if (width < 640) return 1.5;
    if (width < 768) return 2;
    if (width < 1024) return 3;
    if (width < 1280) return 4;
    return 4;
  }, []);

  const [visibleCards, setVisibleCards] = useState(3);

  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getVisibleCards]);

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const maxIndex = Math.max(0, items.length - Math.floor(visibleCards));

  useEffect(() => {
    if (isDragging || items.length <= Math.floor(visibleCards)) return;

    autoplayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);

    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [isDragging, maxIndex, items.length, visibleCards]);

  useEffect(() => {
    if (!items.length) return;
    setCurrentIndex((prev) => Math.max(0, Math.min(maxIndex, prev)));
  }, [items.length, maxIndex]);

  const handleDragStart = useCallback(
    (clientX: number) => {
      setIsDragging(true);
      setStartX(clientX);
      setScrollLeft(currentIndex);
    },
    [currentIndex],
  );

  const handleDragMove = useCallback(
    (clientX: number) => {
      if (!isDragging || !trackRef.current) return;

      const diff = startX - clientX;
      const cardWidth = trackRef.current.offsetWidth / visibleCards;
      const dragOffset = diff / cardWidth;

      const newIndex = Math.max(0, Math.min(maxIndex, scrollLeft + dragOffset));
      setCurrentIndex(Math.round(newIndex));
    },
    [isDragging, startX, scrollLeft, visibleCards, maxIndex],
  );

  const handleDragEnd = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      setIsDragging(false);

      const diff = startX - clientX;
      const threshold = 50;

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentIndex < maxIndex) {
          setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
        } else if (diff < 0 && currentIndex > 0) {
          setCurrentIndex((prev) => Math.max(0, prev - 1));
        }
      }
    },
    [isDragging, startX, currentIndex, maxIndex],
  );

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = (e: MouseEvent) => {
    handleDragEnd(e.clientX);
  };

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
  };

  const handleTouchStart = (e: TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    handleDragEnd(e.changedTouches[0].clientX);
  };

  if (items.length === 0) return null;

  const cardWidth = 100 / visibleCards;
  const gapSize = 24;

  return (
    <section
      ref={sectionRef}
      className={cn(
        "py-12 sm:py-16 lg:py-20 transition-all duration-1000",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12",
      )}
    >
      <div
        className={cn(
          "mb-8 sm:mb-10 lg:mb-12 text-center transition-all duration-700 delay-100",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        )}
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Browse Subcategories</h2>
        <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base max-w-md mx-auto">
          Jump faster to what you want, then shop in one click
        </p>
      </div>

      <div
        ref={trackRef}
        className={cn("relative overflow-hidden cursor-grab active:cursor-grabbing", isDragging && "select-none")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn("flex gap-4 sm:gap-6", !isDragging && "transition-transform duration-500 ease-out")}
          style={{
            transform: `translateX(calc(-${currentIndex * cardWidth}% - ${(currentIndex * gapSize) / visibleCards}px))`,
          }}
        >
          {items.map((it, index) => (
            <Link
              key={it.id}
              href={`/shop?categorySlug=${encodeURIComponent(it.slug)}`}
              onClick={(e) => {
                if (isDragging) e.preventDefault();
              }}
              className={cn(
                "flex-shrink-0 group/sub transition-all duration-500",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
              style={{
                width: `calc(${cardWidth}% - ${gapSize - gapSize / visibleCards}px)`,
                transitionDelay: isVisible ? `${120 + index * 40}ms` : "0ms",
              }}
            >
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10 opacity-70 group-hover/sub:opacity-50 transition-opacity duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 z-5" />
                  <Image
                    src={it.image || "/placeholder-product.svg"}
                    alt={it.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover/sub:scale-110"
                    quality={60}
                    loading="lazy"
                    fetchPriority="low"
                    sizes="(max-width: 640px) 70vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    draggable={false}
                  />
                  <div className="absolute inset-0 opacity-0 group-hover/sub:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/20 via-transparent to-transparent z-10" />

                  <div className="absolute left-3 top-3 z-20">
                    <div className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">
                      {it.parentName}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 sm:mt-5 text-center">
                <h3 className="font-semibold text-base sm:text-lg lg:text-xl text-foreground group-hover/sub:text-primary transition-colors duration-300 line-clamp-1">
                  {it.name}
                </h3>
                {typeof it.productCount === "number" ? (
                  <p className="text-sm text-muted-foreground mt-1">{it.productCount} products</p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {items.length > Math.floor(visibleCards) && (
        <div className="flex justify-center gap-2 mt-7 sm:mt-9">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 sm:h-2.5 rounded-full transition-all duration-300",
                i === currentIndex
                  ? "w-9 sm:w-11 bg-primary"
                  : "w-2 sm:w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
