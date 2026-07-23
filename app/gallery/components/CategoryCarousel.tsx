"use client";
import React, { useEffect, useRef, useState } from "react";
import type { StaticImageData } from "next/image";

type Slide = { src?: string | StaticImageData; alt?: string };

export default function CategoryCarousel({
  slides,
  interval = 5000,
}: {
  slides: Slide[];
  interval?: number;
}) {
  const [active, setActive] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || slides.length <= 1) return;

    timer.current = window.setInterval(() => setActive((i) => (i + 1) % slides.length), interval);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [interval, slides.length]);

  const goTo = (index: number) => setActive(index);
  const previous = () => setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);

  return (
    <div className="flex items-center rounded-[4px]  bg-[#ffffff]">
      <div className="relative min-h-[320px] w-full sm:min-h-[420px] md:min-h-[520px]">
        <div className="absolute inset-0 drop-shadow-md shadow-black" aria-hidden="true">
          {slides.map((slide, index) => {
            const src = typeof slide.src === "string" ? slide.src : slide.src?.src;
            return (
              <div
                key={`slide-${index}`}
                className={`absolute inset-0 transition-opacity duration-1000 ease-out ${index === active ? "opacity-100" : "opacity-0"}`}
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={slide.alt || ""} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full bg-[#ffffff]" />
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute inset-0 bg-black/10" />

        <div className="absolute inset-x-4 bottom-4 z-20 flex items-center justify-between gap-4">
          <div className="text-sm text-white/80">{`${active + 1} / ${slides.length}`}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={previous}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Previous slide"
            >
              ←
            </button>
            <button
              type="button"
              onClick={next}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur transition hover:bg-white/20"
              aria-label="Next slide"
            >
              →
            </button>
          </div>
        </div>

        <div className="absolute inset-x-4 top-4 z-20 flex items-center gap-2">
          {slides.map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => goTo(index)}
              className={`h-2 w-2 rounded-full transition-all ${index === active ? "w-6 bg-white" : "bg-white/35"}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
