
"use client";

import React, { useEffect, useState } from "react";
import { fetchContent, type AdminPageContent } from "../admin/content";
import PackageCard from "./PackageCard";

export default function ServicesPage() {
  const [content, setContent] = useState<AdminPageContent | null>(null);

  useEffect(() => {
    void (async () => {
      setContent(await fetchContent());
    })();
  }, []);

  if (!content) return null;

  return (
    <div className="container py-20">
      <header className="">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl md:text-4xl font-extrabold">Services & Packages</h1>
        </div>
        <p className="mt-4 max-w-3xl text-[#797979]">
          Choose a package or contact me for a custom quote. Packages below are common starting points and can be tailored.
        </p>
      </header>

      <div className="mt-12 space-y-16">
        {content.services.map((group) => (
          <section key={group.key} aria-labelledby={`svc-${group.key}`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 id={`svc-${group.key}`} className="text-2xl font-semibold">{group.title}</h2>
                {group.description && <p className="text-sm text-[#797979] mt-1">{group.description}</p>}
              </div>
            </div>

            <div className="mt-6 grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {group.packages.map((p) => (
                <PackageCard key={p.id} pkg={p} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section id="contact" className="mt-16 bg-white/85 p-8 rounded-xl shadow-lg border border-white/10">
        <h3 className="text-xl font-semibold">Ready to book or need a custom package?</h3>
        <p className="text-sm text-[#797979] mt-2">Use the form on the contact page or email me with project details.</p>
        <div className="mt-4">
          <a href="/#contact" className="btn-accent inline-block">Contact</a>
        </div>
      </section>
    </div>
  );
}
