"use client";

import React, { useEffect, useState } from "react";
import { fetchContent, type AdminPageContent } from "../admin/content";
import CategoryCarousel from "./components/CategoryCarousel";

export default function GalleryPage() {
  const [content, setContent] = useState<AdminPageContent | null>(null);

  useEffect(() => {
    void (async () => {
      setContent(await fetchContent());
    })();
  }, []);

  if (!content) return (
    <div className="container w-screen space-y-5">
      <header className="max-w-3xl space-y-2">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#d8cbb1]/40" />
        <div className="h-4 w-64 animate-pulse rounded bg-[#d8cbb1]/30" />
      </header>
      <div className="flex flex-col mt-8 gap-6">
        {[1, 2, 3].map((n) => (
          <div key={n}>
            <div className="h-6 w-28 animate-pulse rounded bg-[#d8cbb1]/40 mb-4" />
            <div className="h-[320px] sm:h-[420px] md:h-[520px] w-full animate-pulse rounded bg-[#d8cbb1]/30" />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container w-screen space-y-5">
      <header className="max-w-3xl space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold">Gallery</h1>
        <p className="text-sm text-[#797979] mt-2">Check out our latest work across different projects.</p>
      </header>

      <div className="flex flex-col mt-8">
        {content.gallery.map((cat) => (
          <section key={cat.key} aria-labelledby={`gallery-${cat.key}`} className="cv-auto">
            <div className="flex items-center justify-between">
              <h2 id={`gallery-${cat.key}`} className="text-2xl font-semibold">{cat.title}</h2>
            </div>

            <div className=" container justify-center w-full">
              <CategoryCarousel slides={cat.images} interval={5000} />


            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
