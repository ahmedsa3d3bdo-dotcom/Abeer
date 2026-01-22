"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Truck, Shield, RotateCcw, Award } from "lucide-react";

// Local hero images from project
const HERO_IMAGES = [
  "/Storefront/images/abeershop_hero.png",
  "/Storefront/images/room-living.png",
  "/Storefront/images/room-office.png",
  "/Storefront/images/room-bedroom.png",
  "/Storefront/images/home-2.jpg",
  "/Storefront/images/home-1.jpg",
];

function Counter({
  value,
  suffix = "",
  prefix = "",
  inView = false
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [value, inView]);

  return (
    <span className="tabular-nums inline-block min-w-[6ch] whitespace-nowrap">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true);
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

export function HeroSection() {
  const [currentImage, setCurrentImage] = useState(0);
  const [previousImage, setPreviousImage] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prefetchEnabled, setPrefetchEnabled] = useState(false);
  const { ref: statsRef, inView: statsInView } = useInView();

  const imageCount = HERO_IMAGES.length;
  const nextPrefetchIndex = (currentImage + 1) % imageCount;

  const fadeStartRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeEndRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Image carousel - cycles through all images
  useEffect(() => {
    const imageCount = HERO_IMAGES.length;

    const startTransition = (fromIndex: number) => {
      setPreviousImage(fromIndex);
      setIsFading(false);

      if (fadeStartRef.current) clearTimeout(fadeStartRef.current);
      if (fadeEndRef.current) clearTimeout(fadeEndRef.current);

      // If the next image is slow to load (or fails), don't keep the previous slide on top forever.
      fadeStartRef.current = setTimeout(() => {
        setIsFading(true);
        if (fadeEndRef.current) clearTimeout(fadeEndRef.current);
        fadeEndRef.current = setTimeout(() => setPreviousImage(null), 1020);
      }, 1200);
    };

    const timer = setInterval(() => {
      setCurrentImage((prev) => {
        const next = (prev + 1) % imageCount;
        startTransition(prev);
        return next;
      });
    }, 6000);
    return () => {
      clearInterval(timer);
      if (fadeStartRef.current) clearTimeout(fadeStartRef.current);
      if (fadeEndRef.current) clearTimeout(fadeEndRef.current);
    };
  }, []);

  // Initial load animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    { icon: Truck, text: "Free Shipping" },
    { icon: Shield, text: "Including Warranty" },
    { icon: RotateCcw, text: "Easy-way Returns" },
    { icon: Award, text: "Premium Quality" },
  ];

  return (
    <>
      {/* Full-width hero that breaks out of parent container */}
      <section
        className="relative min-h-[calc(100dvh-64px)] overflow-hidden bg-background"
        style={{
          marginLeft: 'calc(-50vw + 50%)',
          marginRight: 'calc(-50vw + 50%)',
          width: '100vw'
        }}
      >
        {/* Full-width Background Image with Carousel */}
        <div className="absolute inset-0">
          {prefetchEnabled ? (
            <Image
              src={HERO_IMAGES[nextPrefetchIndex]}
              alt=""
              width={1920}
              height={1080}
              sizes="100vw"
              quality={50}
              loading="lazy"
              fetchPriority="low"
              className="absolute w-px h-px opacity-0 pointer-events-none"
              aria-hidden
            />
          ) : null}
          <div className="relative w-full h-full">
            <div className="absolute inset-0">
              <Image
                key={currentImage}
                src={HERO_IMAGES[currentImage]}
                alt={`Premium home interior ${currentImage + 1}`}
                fill
                priority={currentImage === 0}
                sizes="100vw"
                quality={75}
                fetchPriority={currentImage === 0 ? "high" : "auto"}
                className="object-cover"
                onLoadingComplete={() => {
                  if (currentImage === 0 && !prefetchEnabled) setPrefetchEnabled(true);
                  if (previousImage === null) return;
                  if (isFading) return;
                  if (fadeStartRef.current) clearTimeout(fadeStartRef.current);
                  setIsFading(true);
                  if (fadeEndRef.current) clearTimeout(fadeEndRef.current);
                  fadeEndRef.current = setTimeout(() => setPreviousImage(null), 1020);
                }}
                onError={() => {
                  if (previousImage === null) return;
                  if (isFading) return;
                  if (fadeStartRef.current) clearTimeout(fadeStartRef.current);
                  setIsFading(true);
                  if (fadeEndRef.current) clearTimeout(fadeEndRef.current);
                  fadeEndRef.current = setTimeout(() => setPreviousImage(null), 1020);
                }}
              />
            </div>

            {previousImage !== null ? (
              <div
                className={`absolute inset-0 transition-opacity duration-1000 ${isFading ? "opacity-0" : "opacity-100"}`}
              >
                <Image
                  key={previousImage}
                  src={HERO_IMAGES[previousImage]}
                  alt={`Premium home interior ${previousImage + 1}`}
                  fill
                  priority={previousImage === 0}
                  sizes="100vw"
                  quality={75}
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col min-h-[calc(100dvh-64px)]">
          {/* Main Content */}
          <div className="flex-1 flex items-center">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
              <div className="max-w-3xl">
                {/* Main Heading */}
                <h1
                  className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] text-white transition-all duration-700 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                >
                  <span className="block">Elevate Your</span>
                  <span className="block mt-1">Living Space</span>
                  <span className="block mt-2 text-primary">With Style</span>
                </h1>

                {/* Description */}
                <p
                  className={`mt-6 text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl transition-all duration-700 delay-100 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                >
                  Discover curated Accessories, Kitchenware and home décor that transforms your space into a sanctuary of comfort and elegance.
                </p>

                {/* CTA Buttons */}
                <div
                  className={`mt-8 flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-200 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                >
                  <Button
                    asChild
                    size="lg"
                    className="h-14 px-8 text-base rounded-full shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                  >
                    <Link href="/shop" className="flex items-center gap-2">
                      Explore Collection
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 text-base rounded-full border-2 border-white/30 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/50 transition-all hover:scale-[1.02]"
                  >
                    <Link href="/shop/new">New Arrivals</Link>
                  </Button>
                </div>

                {/* Trust Indicators */}
                <div
                  ref={statsRef}
                  className={`mt-12 grid grid-cols-3 gap-6 md:gap-8 pt-8 border-t border-white/20 transition-all duration-700 delay-300 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                >
                  <div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                      <Counter value={50} suffix="+" inView={statsInView} />
                    </div>
                    <div className="text-sm text-white/70 mt-1">Premium Brands</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                      <Counter value={10} suffix="K+" inView={statsInView} />
                    </div>
                    <div className="text-sm text-white/70 mt-1">Happy Customers</div>
                  </div>
                  <div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                      <Counter value={5} suffix="K+" inView={statsInView} />
                    </div>
                    <div className="text-sm text-white/70 mt-1">Products</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Image Indicators */}
          <div className="absolute bottom-24 right-6 md:right-12 flex gap-2 z-20">
            {HERO_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`w-2 h-2 rounded-full transition-all ${currentImage === index
                  ? "bg-primary w-8"
                  : "bg-white/50 hover:bg-white/70"
                  }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>

          {/* Bottom Features Bar */}
          <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-center gap-3 py-4 lg:py-5"
                  >
                    <feature.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-white/90">{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
