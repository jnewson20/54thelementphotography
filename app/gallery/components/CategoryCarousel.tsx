"use client";
import React, { useEffect, useRef, useState } from "react";
import Image, { type StaticImageData } from "next/image";
import { IMAGE_SIZES } from "../../lib/image-sizes";
import { toMediaSrc } from "../../lib/media";

type Slide = { src?: string | StaticImageData; alt?: string };
const TRANSITION_MS = 900;

export default function CategoryCarousel({
  slides,
  interval = 5000,
}: {
  slides: Slide[];
  interval?: number;
}) {
  const [active, setActive] = useState(0);
  const [prevActive, setPrevActive] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeVisible, setActiveVisible] = useState(true);
  const [previousVisible, setPreviousVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const activeRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const rafRef2 = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;

    timer.current = window.setInterval(() => setActive((i) => (i + 1) % slides.length), interval);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [interval, slides.length]);

  useEffect(() => {
    if (slides.length === 0) return;

    const preloaders: HTMLImageElement[] = [];
    slides.forEach((slide) => {
      const src = typeof slide?.src === "string" ? toMediaSrc(slide.src) : slide?.src?.src;
      if (!src) return;
      const image = new window.Image();
      image.src = src;
      preloaders.push(image);
    });

    return () => {
      preloaders.length = 0;
    };
  }, [slides]);

  useEffect(() => {
    const previous = activeRef.current;
    if (previous === active) return;

    activeRef.current = active;
    setPrevActive(previous);
    setIsTransitioning(true);
    setActiveVisible(false);
    setPreviousVisible(true);

    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    if (rafRef2.current) window.cancelAnimationFrame(rafRef2.current);

    // Two RAFs force an intermediate paint so opacity transitions run reliably in production builds.
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef2.current = window.requestAnimationFrame(() => {
        setActiveVisible(true);
        setPreviousVisible(false);
        rafRef2.current = null;
      });
      rafRef.current = null;
    });

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setPrevActive(null);
      transitionTimeoutRef.current = null;
    }, TRANSITION_MS + 80);
  }, [active]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (rafRef2.current) {
        window.cancelAnimationFrame(rafRef2.current);
      }
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const goTo = (index: number) => setActive(index);
  const previous = () => setActive((current) => (current - 1 + slides.length) % slides.length);
  const next = () => setActive((current) => (current + 1) % slides.length);
  const activeSlide = slides[active];
  const activeSrc = typeof activeSlide?.src === "string" ? activeSlide.src : activeSlide?.src?.src;
  const previousSlide = prevActive !== null ? slides[prevActive] : null;
  const previousSrc = typeof previousSlide?.src === "string" ? previousSlide.src : previousSlide?.src?.src;

  return (
    <div className="flex items-center rounded-[4px]  bg-[#ffffff]">
      <div className="relative min-h-[320px] w-full sm:min-h-[420px] md:min-h-[520px]">
        <div className="absolute inset-0 drop-shadow-md shadow-black" aria-hidden="true">
          {isTransitioning && previousSrc ? (
            <div
              className={`absolute inset-0 z-0 transition-opacity ease-in-out ${previousVisible ? "opacity-100" : "opacity-0"}`}
              style={{ transitionDuration: `${TRANSITION_MS}ms` }}
            >
              <Image
                src={toMediaSrc(previousSrc)}
                alt={previousSlide?.alt || ""}
                fill
                className="w-full h-full object-cover"
                sizes={IMAGE_SIZES.FULL_BLEED}
                priority={prevActive === 0}
                loading="eager"
                unoptimized
              />
            </div>
          ) : null}

          <div
            key={`slide-${active}`}
            className={`absolute inset-0 z-10 transition-opacity ease-in-out ${activeVisible ? "opacity-100" : "opacity-0"}`}
            style={{ transitionDuration: `${TRANSITION_MS}ms` }}
          >
            {activeSrc ? (
              <Image
                src={toMediaSrc(activeSrc)}
                alt={activeSlide?.alt || ""}
                fill
                className="w-full h-full object-cover"
                sizes={IMAGE_SIZES.FULL_BLEED}
                priority={active === 0}
                loading="eager"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-[#ffffff]" />
            )}
          </div>
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
