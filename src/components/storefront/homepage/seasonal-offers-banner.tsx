"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Clock } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { siteConfig } from "@/config/site";

type Offer = {
  id: string;
  name: string;
  type: "percentage" | "fixed_amount" | "free_shipping";
  value: string;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: any;
};

export function SeasonalOffersBanner({ offers }: { offers?: Offer[] }) {
  const safeOffers = (offers || []).filter((o) => Boolean((o as any)?.metadata?.display?.imageUrl));
  if (!safeOffers.length) return null;

  const router = useRouter();
  const { data: session } = useSession();
  const [buyingOfferId, setBuyingOfferId] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [visibleCards, setVisibleCards] = useState(3);

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

  useEffect(() => {
    const handleResize = () => setVisibleCards(getVisibleCards());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [getVisibleCards]);

  const maxIndex = Math.max(0, safeOffers.length - Math.floor(visibleCards));

  useEffect(() => {
    if (isDragging || safeOffers.length <= Math.floor(visibleCards)) return;
    autoplayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 4000);
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [isDragging, maxIndex, safeOffers.length, visibleCards]);

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
      const cardWidthPx = trackRef.current.offsetWidth / visibleCards;
      const dragOffset = diff / cardWidthPx;
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
        if (diff > 0 && currentIndex < maxIndex) setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
        else if (diff < 0 && currentIndex > 0) setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    },
    [isDragging, startX, currentIndex, maxIndex],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  };
  const handleMouseMove = (e: React.MouseEvent) => handleDragMove(e.clientX);
  const handleMouseUp = (e: React.MouseEvent) => handleDragEnd(e.clientX);
  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false);
  };
  const handleTouchStart = (e: React.TouchEvent) => handleDragStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => handleDragMove(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => handleDragEnd(e.changedTouches[0].clientX);

  const renderValue = (o: Offer) => {
    if (o.type === "percentage") return `${parseFloat(o.value)}% off`;
    if (o.type === "fixed_amount") return `$${parseFloat(o.value).toFixed(2)} off`;
    return "Free shipping";
  };

  const renderTag = (o: Offer) => {
    const md: any = o.metadata || null;
    if (md?.kind === "offer" || md?.offerKind === "standard") return renderValue(o);
    const fromMd = String(md?.display?.tag || "").trim();
    if (fromMd) return fromMd;
    if (md?.offerKind === "bxgy_generic") {
      const buy = md?.bxgy?.buyQty;
      const get = md?.bxgy?.getQty;
      if (buy != null && get != null) return `Buy ${buy} Get ${get}`;
    }
    if (md?.offerKind === "bxgy_bundle") {
      const buyTotal = Array.isArray(md?.bxgyBundle?.buy) ? md.bxgyBundle.buy.reduce((acc: number, x: any) => acc + Number(x?.quantity || 0), 0) : 0;
      const getTotal = Array.isArray(md?.bxgyBundle?.get) ? md.bxgyBundle.get.reduce((acc: number, x: any) => acc + Number(x?.quantity || 0), 0) : 0;
      if (buyTotal > 0 && getTotal > 0) return `Buy ${buyTotal} Get ${getTotal}`;
    }
    return "Promotion";
  };

  const cardWidth = 100 / visibleCards;
  const gapSize = 24;

  const requireAuth = () => {
    if ((session as any)?.user?.id) return true;
    const callbackUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    router.push(`${siteConfig.routes.login}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    return false;
  };

  const handleBuyNowBundle = async (o: Offer) => {
    try {
      if (!requireAuth()) return;
      const md: any = o.metadata || null;
      const spec = md?.bxgyBundle || md?.bundleBxgy || {};
      const buyList: any[] = Array.isArray(spec?.buy) ? spec.buy : [];
      const items = buyList
        .map((x: any) => ({ productId: String(x?.productId || ""), quantity: Number(x?.quantity || 0) }))
        .filter((x: any) => Boolean(x.productId) && Number.isFinite(x.quantity) && x.quantity > 0);
      if (!items.length) throw new Error("Bundle is missing buy items");

      setBuyingOfferId(o.id);
      const res = await fetch("/api/storefront/buy-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error?.message || "Buy Now failed");
      router.push("/checkout?mode=buy-now");
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
    } finally {
      setBuyingOfferId(null);
    }
  };

  return (
    <div className="w-full border-y border-border/50 bg-gradient-to-r from-muted/40 via-muted/30 to-muted/40 py-4 sm:py-6">
      {/* Section Header */}
      <div className="mb-8 sm:mb-10 lg:mb-12 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
          Browse offers and deals
        </h2>
        <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-base max-w-md mx-auto">
          Discover limited-time promotions and bundle deals
        </p>
      </div>

      {/* Offers Grid */}
      <div
        ref={trackRef}
        className={"relative overflow-hidden cursor-grab active:cursor-grabbing" + (isDragging ? " select-none" : "")}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={"flex gap-4 sm:gap-6" + (!isDragging ? " transition-transform duration-500 ease-out" : "")}
          style={{
            transform: `translateX(calc(-${currentIndex * cardWidth}% - ${(currentIndex * gapSize) / visibleCards}px))`,
          }}
        >
          {safeOffers.map((o) => (
            <Link
              key={o.id}
              href={`/shop?offerId=${encodeURIComponent(o.id)}`}
              onClick={(e) => {
                if (isDragging) e.preventDefault();
              }}
              className="flex-shrink-0 group/card"
              style={{
                width: `calc(${cardWidth}% - ${gapSize - gapSize / visibleCards}px)`,
              }}
            >
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={String(o.metadata?.display?.imageUrl)}
                    alt={o.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                    quality={60}
                    loading="lazy"
                    fetchPriority="low"
                    sizes="(max-width: 640px) 70vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    draggable={false}
                  />

                  {(() => {
                    const md: any = o.metadata || null;
                    const isBundle = md?.offerKind === "bxgy_bundle";
                    if (!isBundle) return null;
                    return (
                      <div className="absolute inset-x-3 bottom-3 z-10">
                        <Button
                          type="button"
                          className="w-full"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleBuyNowBundle(o);
                          }}
                          disabled={buyingOfferId === o.id}
                        >
                          {buyingOfferId === o.id ? "Loading..." : "Buy now"}
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-4 sm:mt-5">
                <div className="w-fit">
                  <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    {renderTag(o)}
                  </Badge>
                </div>
                <div className="mt-2 font-semibold text-base sm:text-lg text-foreground group-hover/card:text-primary transition-colors duration-300 line-clamp-1" title={o.name}>
                  {o.name}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <div className="grid grid-cols-[auto_3rem_1fr] items-start gap-x-2 gap-y-1 min-h-[2.25rem]">
                    <Clock className="w-3 h-3 mt-0.5 row-span-2" />
                    <div className="font-medium">From</div>
                    <div>{o.startsAt ? new Date(o.startsAt).toLocaleDateString() : "now"}</div>
                    <div className="font-medium">Until</div>
                    <div>{o.endsAt ? new Date(o.endsAt).toLocaleDateString() : "ongoing"}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {safeOffers.length > Math.floor(visibleCards) && (
        <div className="flex justify-center gap-2 mt-4 sm:mt-5">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={
                "h-2 sm:h-2.5 rounded-full transition-all duration-300 " +
                (i === currentIndex ? "w-8 sm:w-10 bg-primary" : "w-2 sm:w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

