"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useRouter } from "next/navigation";
import { DEFAULT_CLIENT_COVER_IMAGE, type AdminClient } from "../../admin/content";
import { clearClientSession, isClientSessionValid } from "../../lib/auth";
import { toMediaSrc } from "../../lib/media";
import ClientGallery from "../client-gallery";

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

export default function ClientPageClient({ client }: { client: AdminClient | null }) {
  const router = useRouter();
  const normalizedSlug = normalizeSlugValue(client?.username);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!client || !normalizedSlug) {
      router.replace("/clients/login");
      return;
    }

    if (!isClientSessionValid(normalizedSlug)) {
      router.replace("/clients/login");
      return;
    }

    setCheckingAccess(false);
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
  const images = client.images.map((image) => image.src);

  return (
    <div className="min-h-screen pb-16">
      <div className="relative h-[280px] w-full overflow-hidden md:h-[360px]">
        <Image
          src={toMediaSrc(coverImage)}
          alt={`${client.name} cover`}
          fill
          className="h-full w-full object-cover"
          loading="eager"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/45" />
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