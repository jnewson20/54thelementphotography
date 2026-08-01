"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import ImageCard from "./image-card";
import { IMAGE_SIZES } from "../lib/image-sizes";
import { toMediaSrc } from "../lib/media";

type ClientGalleryProps = {
  title?: string;
  images: Array<{ id: string; src: string; alt: string }>;
};

export default function ClientGallery({ title, images }: ClientGalleryProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  const toggleSelection = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevLightbox = () =>
    setLightboxIndex((current) =>
      current === null ? null : current === 0 ? images.length - 1 : current - 1
    );
  const nextLightbox = () =>
    setLightboxIndex((current) =>
      current === null ? null : current === images.length - 1 ? 0 : current + 1
    );

  const selectAll = () => setSelected(images.map((image) => image.id));
  const clearSelection = () => setSelected([]);

  const [downloading, setDownloading] = useState(false);

  const downloadSelected = async () => {
    if (selected.length === 0 || downloading) {
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch("/api/download-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: selected.map((id) => images.find((image) => image.id === id)?.src).filter((src): src is string => Boolean(src)) }),
      });

      if (!response.ok) {
        console.error("Download failed", response.statusText);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "selected-images.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {title ? <h2 className="text-2xl font-semibold text-[#071018]">{title}</h2> : null}
          <p className="text-sm text-[#797979]">
            Click any image to open the slideshow overlay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-full border border-[#071018]/10 bg-transparent px-4 py-2 text-sm text-[#071018] transition hover:bg-[#071018]/5"
            onClick={selectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="rounded-full border border-[#071018]/10 bg-transparent px-4 py-2 text-sm text-[#071018] transition hover:bg-[#071018]/5"
            onClick={clearSelection}
          >
            Clear selection
          </button>
          <p className="text-sm text-[#5f5d58]">{selected.length} selected</p>
          <button
            type="button"
            className="rounded-full border border-[#071018]/10 bg-[#071018]/5 px-4 py-2 text-sm font-semibold text-[#071018] transition hover:bg-[#071018]/10 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={downloadSelected}
            disabled={selected.length === 0 || downloading}
          >
            {downloading ? "Downloading..." : "Download selected"}
          </button>
        </div>
      </div>

      <div className="grid gap-0.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {images.map((src, index) => (
          <ImageCard
            key={src.id}
            imageId={src.id}
            src={src.src}
            alt={src.alt || `Client image ${index + 1}`}
            selected={selectedSet.has(src.id)}
            onSelect={() => toggleSelection(src.id)}
            onOpen={() => openLightbox(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && currentImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl sm:p-8">
          <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 transition-opacity duration-500 ease-out opacity-100">
                  <Image src={toMediaSrc(currentImage.src)} alt={currentImage.alt || "Backdrop image"} fill className="object-cover" sizes={IMAGE_SIZES.FULL_BLEED} priority unoptimized quality={100} />
                </div>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(7,16,24,0.08),transparent_45%),linear-gradient(135deg,rgba(252,249,242,0.82),rgba(239,226,201,0.35))]" />
              </div>
          <div className="absolute inset-0 bg-[#f7efe3]/40" onClick={closeLightbox} />

            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 rounded-full border border-[#071018]/10 bg-transparent px-3 py-1.5 text-sm text-[#071018] transition hover:bg-[#071018]/5"
            >
              Close
            </button>

            <div className="relative h-full w-full overflow-hidden">
              

              <div className="relative z-10 flex h-full items-center justify-center p-6 sm:p-8">
                <div className="relative h-full w-full overflow-hidden ">
                  <div className="absolute inset-0 transition-opacity duration-500 ease-out opacity-100">
                    <Image
                      src={toMediaSrc(currentImage.src)}
                      alt={currentImage.alt || `Slide ${(lightboxIndex ?? 0) + 1}`}
                      fill
                      sizes={IMAGE_SIZES.LIGHTBOX}
                      priority
                      unoptimized
                      quality={100}
                      className="object-contain drop-shadow-md shadow-black"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={prevLightbox}
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#071018]/10 bg-white/20 px-3 py-3 text-[#071018] shadow-lg backdrop-blur transition hover:bg-white/30"
                aria-label="Previous image"
              >
                ←
              </button>
              <button
                type="button"
                onClick={nextLightbox}
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-[#071018]/10 bg-white/20 px-3 py-3 text-[#071018] shadow-lg backdrop-blur transition hover:bg-white/30"
                aria-label="Next image"
              >
                →
              </button>

              <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-[#071018]/10 bg-bg/80 px-3 py-1.5 text-sm text-[#071018] shadow-sm">
                {(lightboxIndex ?? 0) + 1} / {images.length}
              </div>
            </div>
         
        </div>
      )}
      <style jsx global>{``}</style>
    </div>
  );
}
