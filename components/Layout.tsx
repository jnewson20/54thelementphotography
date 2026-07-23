import React, { ReactNode } from "react";
import Head from "next/head";
import "./globals.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <Head>
        <title>Photography — Create. Capture. Connect.</title>
        <meta name="description" content="Contemporary photography portfolio." />
      </Head>
      <main>{children}</main>
      <footer className="border-t border-white/10">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-6">
          <div>&copy; {new Date().getFullYear()} 54TH ELEMENT</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="/admin" className="transition hover:opacity-80">Admin</a>
            <a href="https://www.instagram.com/54th_element/" aria-label="Instagram">IG</a>
            <a href="https://www.behance.net/54th_element" aria-label="Behance">BE</a>
            <a href="mailto:jay.newson@54thelementphotography.com" aria-label="Email">✉</a>
          </div>
        </div>
      </footer>
    </>
  );
}
