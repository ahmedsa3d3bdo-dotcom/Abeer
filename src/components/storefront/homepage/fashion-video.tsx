export function FashionVideoSection() {
  return (
    <section className="py-12">
      <div className="overflow-hidden rounded-xl border ring-1 ring-border bg-black">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src="/Storefront/fashonVideo.mp4"
          className="h-[300px] sm:h-[300px] md:h-[300px] lg:h-[500px] w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          controls={false}
        />
      </div>
    </section>
  );
}
