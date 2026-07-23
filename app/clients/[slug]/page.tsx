"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { useParams, useRouter } from "next/navigation";
import { loadContent, type AdminClient } from "../../admin/content";
import { clearClientSession, isClientSessionValid } from "../../lib/auth";
import ClientGallery from "../client-gallery";

const luxuryHeading = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

type ClientViewData = {
  client: AdminClient | null;
  title: string;
  images: string[];
  coverImage: string;
  note?: string;
};

function normalizeSlugValue(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export default function ClientPage() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const rawSlug = params?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const normalizedSlug = normalizeSlugValue(slug);
  const [viewData, setViewData] = useState<ClientViewData>({ client: null, title: "Private gallery", images: [], coverImage: "/assets/client-bg.jpg" });
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (typeof rawSlug === "undefined") {
      return;
    }

    if (!slug || !normalizedSlug) {
      router.replace("/clients/login");
      return;
    }

    if (!isClientSessionValid(normalizedSlug)) {
      router.replace("/clients/login");
      return;
    }

    const content = loadContent();
    const client =
      content.clients.find((entry) => normalizeSlugValue(entry.username) === normalizedSlug) ?? null;

    setViewData({
      client,
      title: client ? client.galleryTitle || client.name : "Private gallery",
      images: client ? client.images.map((image) => image.src) : [],
      coverImage: client?.coverImage || "/assets/client-bg.jpg",
      note: client ? `Welcome ${client.name}. Access your private gallery below.` : undefined,
    });
    setCheckingAccess(false);
  }, [normalizedSlug, rawSlug, router, slug]);

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

  if (!viewData.client) {
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

  return (
    <div className="min-h-screen pb-16">
      <div className="relative h-[280px] w-full overflow-hidden md:h-[360px]">
        <img src={viewData.coverImage} alt={`${viewData.client.name} cover`} className="h-full w-full object-cover" loading="eager" decoding="async" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/45" />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className={`${luxuryHeading.className} soft-float px-6 text-center text-[clamp(2.1rem,5.1vw,4.2rem)] font-medium tracking-[0.16em] text-white/95 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]`}
          >
            {viewData.title}
          </h1>
        </div>
      </div>

      <div className="container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mt-8 text-3xl font-extrabold">{viewData.title}</h1>
            {viewData.note && <p className="mt-2 text-sm text-[#797979]">{viewData.note}</p>}
          </div>
          <div>
            <button type="button" onClick={handleSignOut} className="text-sm text-[#797979] hover:underline">Sign out</button>
          </div>
        </div>

        <div className="mt-8">
          <ClientGallery title={viewData.title} images={viewData.images} />
        </div>
      </div>
    </div>
  );
}
