"use client";

export default function MovingBanner({
  text = "",
  speed = 40,
  includeLogo = true,
  logoSrc = "/Storefront/images/logo (1).png",
  logoHeight = 20,
}: {
  text?: string;
  speed?: number; // seconds per loop
  includeLogo?: boolean;
  logoSrc?: string;
  logoHeight?: number;
}) {
  return (
    <section
      className="relative overflow-hidden border-y"
      style={{ marginInline: "calc(50% - 50vw)" }}
    >
      <div className="bg-primary/80 text-background">
        <div className="py-4 sm:py-5">
          <div className="flex items-center overflow-hidden whitespace-nowrap will-change-transform" aria-hidden>
            <Row text={text} speed={speed} offset={0} includeLogo={includeLogo} logoSrc={logoSrc} logoHeight={logoHeight} />
            <Row text={text} speed={speed} offset={50} includeLogo={includeLogo} logoSrc={logoSrc} logoHeight={logoHeight} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ text, speed, offset, includeLogo, logoSrc, logoHeight }: { text: string; speed: number; offset: number; includeLogo?: boolean; logoSrc?: string; logoHeight?: number }) {
  return (
    <div
      className="flex shrink-0 items-center gap-24 md:gap-32 px-8"
      style={{
        width: "200%",
        animation: `bannerScroll ${speed}s linear infinite`,
        animationDelay: `-${offset / 100 * speed}s`,
      }}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-8 sm:gap-10">
          <span className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide uppercase">{text}</span>
          {includeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoSrc} alt="" className="opacity-95" style={{ height: logoHeight, width: "auto" }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
