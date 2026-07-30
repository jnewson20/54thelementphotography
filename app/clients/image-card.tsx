// app/clients/image-card.tsx
"use client";
import Image from "next/image";
import { IMAGE_SIZES } from "../lib/image-sizes";
import { toMediaSrc } from "../lib/media";

type ImageCardProps = {
  src: string;
  alt?: string;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
};

export default function ImageCard({ src, alt, selected = false, onSelect, onOpen }: ImageCardProps) {
  const filename = src.split("/").pop() || "image.jpg";

  // Secure download route (streams file from server, recommended for protected galleries)
  const secureDownloadHref = `/api/download?file=${encodeURIComponent(src)}`;

  return (
    <div className={`relative group overflow-hidden border border-white/10 bg-white/5 transition-shadow duration-300 ${selected ? "ring-2 ring-accent/40 shadow-2xl" : "hover:shadow-2xl"}`}>
      {onSelect ? (
        <label className="absolute left-3 top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-black/10 border border-white/20 text-sm text-white shadow-lg">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="sr-only"
          />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${selected ? "bg-white text-[#041217]" : "bg-white/10"}`}>
            {selected ? "✓" : ""}
          </span>
        </label>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        className="group relative flex h-64 w-full overflow-hidden transition-transform duration-300 ease-out hover:scale-105"
        aria-label="Open slideshow"
      >
        <Image
          src={toMediaSrc(src)}
          alt={alt || ""}
          fill
          unoptimized
          quality={100}
          sizes={IMAGE_SIZES.THIRD}
          className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-white/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </button>
    </div>
  );
}
