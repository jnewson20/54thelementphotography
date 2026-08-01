'use client';
import Image, { type StaticImageData } from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { IMAGE_SIZES } from "../app/lib/image-sizes";
import { toMediaSrc } from "../app/lib/media";

type Slide = { src: string | StaticImageData; alt?: string };

export default function Carousel({ slides = [], interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeVisible, setActiveVisible] = useState(true);
  const [previousVisible, setPreviousVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const indexRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const activeSlide = slides[index];

  useEffect(() => {
    if (slides.length <= 1) return;

    timer.current = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [slides.length, interval]);

  useEffect(() => {
    if (slides.length === 0) return;

    const preloaders: HTMLImageElement[] = [];
    slides.forEach((slide) => {
      const src = typeof slide.src === "string" ? toMediaSrc(slide.src) : slide.src.src;
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
    const previous = indexRef.current;
    if (previous === index) return;

    indexRef.current = index;
    setPrevIndex(previous);
    setIsTransitioning(true);
    setActiveVisible(false);
    setPreviousVisible(true);

    if (rafRef.current) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = window.requestAnimationFrame(() => {
      setActiveVisible(true);
      setPreviousVisible(false);
      rafRef.current = null;
    });

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
      setPrevIndex(null);
      transitionTimeoutRef.current = null;
    }, 920);
  }, [index]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 -z-10" aria-hidden>
      {isTransitioning && prevIndex !== null && slides[prevIndex] ? (
        <div className={`absolute inset-0 transition-opacity duration-[900ms] ease-in-out ${previousVisible ? "opacity-100" : "opacity-0"}`}>
          <Image
            src={typeof slides[prevIndex].src === "string" ? toMediaSrc(slides[prevIndex].src) : slides[prevIndex].src}
            alt={slides[prevIndex].alt || `slide-${prevIndex}`}
            fill
            className="object-cover"
            priority={prevIndex === 0}
            loading="eager"
            unoptimized
            placeholder={typeof slides[prevIndex].src === "object" ? "blur" : "empty"}
            sizes={IMAGE_SIZES.FULL_BLEED}
          />
        </div>
      ) : null}

      {activeSlide ? (
        <div
          key={index}
          className={`absolute inset-0 slide transition-opacity duration-[900ms] ease-in-out ${activeVisible ? "opacity-100" : "opacity-0"}`}
          role="img"
          aria-label={activeSlide.alt || `slide-${index}`}
        >
          <Image
            src={typeof activeSlide.src === "string" ? toMediaSrc(activeSlide.src) : activeSlide.src}
            alt={activeSlide.alt || `slide-${index}`}
            fill
            className="object-cover"
            priority={index === 0}
            loading="eager"
            unoptimized
            placeholder={typeof activeSlide.src === "object" ? "blur" : "empty"}
            sizes={IMAGE_SIZES.FULL_BLEED}
          />
        </div>
      ) : null}

      <div className="absolute inset-0 bg-black/45 pointer-events-none" />
    </div>
  );
}
