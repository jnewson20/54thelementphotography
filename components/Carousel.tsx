'use client';
import Image, { type StaticImageData } from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { toMediaSrc } from "../app/lib/media";

type Slide = { src: string | StaticImageData; alt?: string };

export default function Carousel({ slides = [], interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [index, setIndex] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced || slides.length <= 1) return;
    timer.current = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), interval);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [slides.length, interval]);

  return (
    <div className="absolute inset-0 -z-10" aria-hidden >
      {slides.map((s, i) => (
        <div
          key={i}
          className={`absolute inset-0 slide ${i === index ? "opacity-80" : "opacity-0"}`}
          role="img"
          aria-label={s.alt || `slide-${i}`}
        >
          <Image
            src={typeof s.src === "string" ? toMediaSrc(s.src) : s.src}
            alt={s.alt || `slide-${i}`}
            fill
            className="object-cover"
            priority={i === 0}
            placeholder={typeof s.src === "object" ? "blur" : "empty"}
            sizes="100vw"
          />
        </div>
      ))}
      {/* overlay for contrast */}
      <div className="absolute inset-0 bg-black/80 -z-5 pointer-events-none" />
    </div>
  );
}
