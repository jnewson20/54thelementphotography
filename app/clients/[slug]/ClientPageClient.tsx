"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter } from "next/navigation";
import { DEFAULT_CLIENT_COVER_IMAGE } from "../../admin/content";
import { clearClientSession, isClientSessionValid } from "../../lib/auth";
import { IMAGE_SIZES } from "../../lib/image-sizes";
import { toMediaSrc } from "../../lib/media";
import ClientGallery from "../client-gallery";

type ClientGalleryImage = {
  id: string;
  src: string;
  alt: string;
};

type PublicClient = {
  id: string;
  name: string;
  username: string;
  galleryTitle: string;
  coverImage: string;
  images: ClientGalleryImage[];
};

const luxuryHeading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

function normalizeSlugValue(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function preloadImage(src: string, onSettled: () => void): Promise<void> {
  return new Promise((resolve) => {
    const image = new window.Image();

    const finalize = () => {
      onSettled();
      resolve();
    };

    image.onload = finalize;
    image.onerror = finalize;
    image.src = src;
  });
}

export default function ClientPageClient({ client }: { client: PublicClient | null }) {
  const router = useRouter();
  const normalizedSlug = normalizeSlugValue(client?.username);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [preparingGallery, setPreparingGallery] = useState(false);
  const [galleryReady, setGalleryReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!client || !normalizedSlug) {
      router.replace("/clients/login");
      return;
    }

    if (!isClientSessionValid(normalizedSlug)) {
      router.replace("/clients/login");
      return;
    }

    const coverImage = client.coverImage || DEFAULT_CLIENT_COVER_IMAGE;
    const sources = [toMediaSrc(coverImage), ...client.images.map((image) => toMediaSrc(image.src))].filter((src): src is string => Boolean(src && src.trim()));

    let canceled = false;

    setCheckingAccess(false);
    setPreparingGallery(true);
    setGalleryReady(false);
    setLoadedCount(0);
    setTotalCount(sources.length);

    if (sources.length === 0) {
      setPreparingGallery(false);
      setGalleryReady(true);
      return;
    }

    void Promise.all(
      sources.map((src) =>
        preloadImage(src, () => {
          if (!canceled) {
            setLoadedCount((current) => current + 1);
          }
        })
      )
    ).finally(() => {
      if (canceled) return;
      setPreparingGallery(false);
      setGalleryReady(true);
    });

    return () => {
      canceled = true;
    };
  }, [client, normalizedSlug, router]);

  const handleSignOut = () => {
    clearClientSession();
    router.push("/clients/login");
  };

  if (checkingAccess) {
    return (
      <div className="container py-20">
        <p className="text-sm text-[#797979]">Checking your access...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="container py-20">
        <h1 className="text-2xl font-semibold">Gallery not found</h1>
        <p className="mt-2 text-sm text-[#797979]">If you believe this is an error, contact the photographer.</p>
        <div className="mt-6">
          <Link href="/clients/login" className="btn-ghost rounded-md px-4 py-2">Return to login</Link>
        </div>
      </div>
    );
  }

  const title = client.galleryTitle || client.name;
  const coverImage = client.coverImage || DEFAULT_CLIENT_COVER_IMAGE;
  const images = client.images.map((image) => ({ id: image.id, src: image.src, alt: image.alt }));
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((loadedCount / totalCount) * 100)) : 100;

  if (!galleryReady) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#071018]">
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={toMediaSrc(coverImage)}
            alt={`${client.name} cover`}
            fill
            className="h-full w-full object-cover"
            loading="eager"
            sizes={IMAGE_SIZES.FULL_BLEED}
          />
        </div>
        <div className="absolute inset-0 bg-black/55" aria-hidden />

        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-3xl border border-white/20 bg-black/30 p-8 text-center backdrop-blur-md">
            <p className="text-sm uppercase tracking-[0.22em] text-white/70">Client Access</p>
            <h1 className="mt-3 text-[clamp(1.5rem,4.2vw,2.4rem)] font-semibold text-white">
              Preparing your Personal Gallery
            </h1>
            <p className="mt-3 text-sm text-white/80">
              {preparingGallery && totalCount > 0
                ? `Loading ${Math.min(loadedCount, totalCount)} of ${totalCount} images...`
                : "Finalizing your experience..."}
            </p>
            <p className="mt-2 text-xs tracking-[0.15em] text-white/70">{progressPercent}%</p>

            <div
              className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/20"
              role="progressbar"
              aria-label="Preparing your personal gallery"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
            >
              <div
                className="h-full rounded-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <div className="relative h-70 w-full overflow-hidden md:h-90">
        <Image
          src={toMediaSrc(coverImage)}
          alt={`${client.name} cover`}
          fill
          className="h-full w-full object-cover"
          loading="eager"
          sizes={IMAGE_SIZES.FULL_BLEED}
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/30 to-black/45" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className={`${luxuryHeading.className} soft-float px-6 text-center text-[clamp(2.1rem,5.1vw,4.2rem)] font-medium tracking-[0.16em] text-white/95 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
          >
            {title}
          </h1>
        </div>
      </div>

      <div className="container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mt-8 text-3xl font-extrabold">{title}</h1>
            <p className="mt-2 text-sm text-[#797979]">Welcome {client.name}. Access your private gallery below.</p>
          </div>
          <div>
            <button type="button" onClick={handleSignOut} className="text-sm text-[#797979] hover:underline">Sign out</button>
          </div>
        </div>

        <div className="mt-8">
          <ClientGallery title={title} images={images} />
        </div>
      </div>
    </div>
  );
}