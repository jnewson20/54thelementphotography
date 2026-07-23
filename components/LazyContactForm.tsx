"use client";

import dynamic from "next/dynamic";

const ContactForm = dynamic(() => import("./ContactForm"), {
  ssr: false,
  loading: () => <div className="min-h-50 grid place-items-center">Loading contact form…</div>,
});

export default function LazyContactForm() {
  return <ContactForm />;
}
