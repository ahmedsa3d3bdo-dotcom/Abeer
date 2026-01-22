"use client";

import { useEffect, useRef, useState } from "react";

export function FashionVideoSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "200px" }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-12" ref={ref}>
      <div className="overflow-hidden rounded-xl border ring-1 ring-border bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        {isVisible ? (
          <video
            src="/Storefront/fashonVideo.mp4"
            className="h-[300px] sm:h-[300px] md:h-[300px] lg:h-[500px] w-full object-cover"
            preload="none"
            autoPlay
            loop
            muted
            playsInline
            controls={false}
          />
        ) : (
          <div className="h-[300px] sm:h-[300px] md:h-[300px] lg:h-[500px] w-full" />
        )}
      </div>
    </section>
  );
}
