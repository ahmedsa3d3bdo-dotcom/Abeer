"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Category {
    id: string;
    name: string;
    slug: string;
    image?: string | null;
    productCount?: number;
}

interface CategoryCarouselProps {
    categories?: Category[];
}

export function CategoryCarousel({ categories: initialCategories }: CategoryCarouselProps) {
    const [categories, setCategories] = useState<Category[]>(initialCategories || []);
    const [isLoading, setIsLoading] = useState(!initialCategories);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const sectionRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const autoplayRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch categories if not provided
    useEffect(() => {
        if (initialCategories) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/storefront/categories", { cache: "no-store" });
                const data = await res.json();
                if (!cancelled && res.ok && data?.success) {
                    const cats = data.data?.categories || [];
                    setCategories(cats.slice(0, 12));
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [initialCategories]);

    // Intersection observer for entrance animation
    useEffect(() => {
        if (!sectionRef.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15 }
        );
        observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    // Get visible cards count based on viewport
    const getVisibleCards = useCallback(() => {
        if (typeof window === "undefined") return 3;
        const width = window.innerWidth;
        if (width < 640) return 1.5; // Mobile - show 1.5 cards for peek effect
        if (width < 768) return 2; // Tablet
        if (width < 1024) return 3; // Small desktop
        if (width < 1280) return 4; // Desktop
        return 4; // Large desktop
    }, []);

    const [visibleCards, setVisibleCards] = useState(3);

    useEffect(() => {
        const handleResize = () => setVisibleCards(getVisibleCards());
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [getVisibleCards]);

    const maxIndex = Math.max(0, categories.length - Math.floor(visibleCards));

    // Autoplay functionality (pause on drag)
    useEffect(() => {
        if (isDragging || categories.length <= Math.floor(visibleCards)) return;

        autoplayRef.current = setInterval(() => {
            setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
        }, 4000);

        return () => {
            if (autoplayRef.current) clearInterval(autoplayRef.current);
        };
    }, [isDragging, maxIndex, categories.length, visibleCards]);

    // Touch/Mouse drag handlers for swipe
    const handleDragStart = useCallback((clientX: number) => {
        setIsDragging(true);
        setStartX(clientX);
        setScrollLeft(currentIndex);
    }, [currentIndex]);

    const handleDragMove = useCallback((clientX: number) => {
        if (!isDragging || !trackRef.current) return;

        const diff = startX - clientX;
        const cardWidth = trackRef.current.offsetWidth / visibleCards;
        const dragOffset = diff / cardWidth;

        // Visual feedback while dragging
        const newIndex = Math.max(0, Math.min(maxIndex, scrollLeft + dragOffset));
        setCurrentIndex(Math.round(newIndex));
    }, [isDragging, startX, scrollLeft, visibleCards, maxIndex]);

    const handleDragEnd = useCallback((clientX: number) => {
        if (!isDragging) return;
        setIsDragging(false);

        const diff = startX - clientX;
        const threshold = 50; // Minimum swipe distance

        if (Math.abs(diff) > threshold) {
            if (diff > 0 && currentIndex < maxIndex) {
                setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
            } else if (diff < 0 && currentIndex > 0) {
                setCurrentIndex(prev => Math.max(0, prev - 1));
            }
        }
    }, [isDragging, startX, currentIndex, maxIndex]);

    // Mouse events
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        handleDragStart(e.clientX);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        handleDragMove(e.clientX);
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        handleDragEnd(e.clientX);
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
        }
    };

    // Touch events for mobile/tablet swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        handleDragEnd(e.changedTouches[0].clientX);
    };

    if (isLoading) {
        return (
            <section className="py-12 sm:py-16 lg:py-20">
                <div className="mb-8 text-center">
                    <div className="h-8 w-64 mx-auto bg-muted/50 rounded-lg animate-pulse" />
                    <div className="h-4 w-48 mx-auto mt-3 bg-muted/30 rounded animate-pulse" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-[4/5] rounded-2xl bg-muted/50 animate-pulse" />
                            <div className="h-5 w-3/4 mx-auto bg-muted/30 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (categories.length === 0) return null;

    // Calculate card width based on visible cards
    const cardWidth = 100 / visibleCards;
    const gapSize = 24; // 6 in tailwind = 24px

    return (
        <section
            ref={sectionRef}
            className={cn(
                "py-12 sm:py-16 lg:py-20 transition-all duration-1000",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
            )}
        >
            {/* Section Header */}
            <div
                className={cn(
                    "mb-8 sm:mb-10 lg:mb-12 text-center transition-all duration-700 delay-100",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                )}
            >
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                    Browse By Category
                </h2>
                <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base max-w-md mx-auto">
                    Explore our curated collection of premium categories
                </p>
            </div>

            {/* Carousel Container */}
            <div
                ref={trackRef}
                className={cn(
                    "relative overflow-hidden cursor-grab active:cursor-grabbing",
                    isDragging && "select-none"
                )}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Carousel Track */}
                <div
                    className={cn(
                        "flex gap-4 sm:gap-6",
                        !isDragging && "transition-transform duration-500 ease-out"
                    )}
                    style={{
                        transform: `translateX(calc(-${currentIndex * cardWidth}% - ${currentIndex * gapSize / visibleCards}px))`,
                    }}
                >
                    {categories.map((category, index) => (
                        <Link
                            key={category.id}
                            href={`/shop?categorySlug=${encodeURIComponent(category.slug)}`}
                            onClick={(e) => {
                                // Prevent navigation if we were just dragging
                                if (isDragging) {
                                    e.preventDefault();
                                }
                            }}
                            className={cn(
                                "flex-shrink-0 group/card transition-all duration-500",
                                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                            )}
                            style={{
                                width: `calc(${cardWidth}% - ${gapSize - gapSize / visibleCards}px)`,
                                transitionDelay: isVisible ? `${150 + index * 50}ms` : "0ms",
                            }}
                        >
                            {/* Card - BIGGER with 4:5 aspect ratio */}
                            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                                {/* Image Container - Taller aspect ratio */}
                                <div className="relative aspect-[4/5] overflow-hidden">
                                    {/* Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent z-10 opacity-70 group-hover/card:opacity-50 transition-opacity duration-500" />

                                    {/* Background Pattern */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 z-5" />

                                    {/* Category Image */}
                                    <Image
                                        src={category.image || "/placeholder-product.svg"}
                                        alt={category.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                                        sizes="(max-width: 640px) 70vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        draggable={false}
                                    />

                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/20 via-transparent to-transparent z-10" />
                                </div>
                            </div>

                            {/* Category Name - Below Card */}
                            <div className="mt-4 sm:mt-5 text-center">
                                <h3 className="font-semibold text-base sm:text-lg lg:text-xl text-foreground group-hover/card:text-primary transition-colors duration-300 line-clamp-1">
                                    {category.name}
                                </h3>
                                {category.productCount !== undefined && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {category.productCount} products
                                    </p>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Progress Dots */}
            {categories.length > Math.floor(visibleCards) && (
                <div className="flex justify-center gap-2 mt-8 sm:mt-10">
                    {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrentIndex(i)}
                            aria-label={`Go to slide ${i + 1}`}
                            className={cn(
                                "h-2 sm:h-2.5 rounded-full transition-all duration-300",
                                i === currentIndex
                                    ? "w-8 sm:w-10 bg-primary"
                                    : "w-2 sm:w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                            )}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
