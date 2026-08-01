// app/clients/image-card.tsx
"use client";
import Image from "next/image";
import { IMAGE_SIZES } from "../lib/image-sizes";
import { toMediaSrc } from "../lib/media";

type ImageCardProps = {
  imageId: string;
  src: string;
  alt?: string;
  selected?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
};

export default function ImageCard({ imageId, src, alt, selected = false, onSelect, onOpen }: ImageCardProps) {
  const secureDownloadHref = `/api/download?imageId=${encodeURIComponent(imageId)}`;

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

      <div className="absolute bottom-3 right-3 z-20">
        <a
          href={secureDownloadHref}
          className="inline-flex items-center rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-black/60"
        >
          Download
        </a>
      </div>
    </div>
  );
}
