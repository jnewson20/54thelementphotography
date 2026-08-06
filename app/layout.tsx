import "../components/globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";


export const metadata: Metadata = {
  title: "54TH ELEMENT | Photography",
  description: "Contemporary photography — editorial, travel, and portrait.",
  icons: {
    icon: "/Favicon.png",
    shortcut: "/Favicon.png",
    apple: "/Favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        
       <header className="sticky -top-3 backdrop-blur bg-[linear-gradient(160deg,rgba(94,64,27,0.88),rgba(94,64,27,0.65))] z-40">
        <div className="container grid grid-cols-[1fr_auto_auto] items-center gap-4">
          <a className="text-2xl text-shadow-md text-white font-extrabold" href="/">54TH ELEMENT</a>
          <nav className="hidden sm:flex gap-6 text-white text-shadow-md">
            <a href="/gallery">Work</a>
            <a href="/services">Services</a>
            <a href="/clients/login">Clients</a>
          </nav>
          <div className="flex items-center gap-3">
            <a className="btn-accent" href="https://54thelementphotography.pixieset.com/booking/" target="_blank" rel="noopener noreferrer">
              Book
            </a>
            <div className="relative md:hidden">
              <input id="mobile-menu-toggle" type="checkbox" className="peer sr-only" />
              <label
                htmlFor="mobile-menu-toggle"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/15"
                aria-label="Open menu"
              >
                ☰
              </label>
              <div className="pointer-events-none absolute right-0 top-full z-50 mt-3 w-44 rounded-3xl bg-black/90 p-4 opacity-0 shadow-2xl shadow-black/50 transition duration-200 peer-checked:pointer-events-auto peer-checked:opacity-100">
                <a href="/gallery" className="block rounded-xl px-3 py-2 text-sm text-white hover:bg-white/10">Work</a>
                <a href="/services" className="block rounded-xl px-3 py-2 text-sm text-white hover:bg-white/10">Services</a>
                <a href="/clients/login" className="block rounded-xl px-3 py-2 text-sm text-white hover:bg-white/10">Clients</a>
              </div>
            </div>
          </div>
        </div>
      </header>
        {children}
        </body>
      <Analytics />
      <SpeedInsights />
    </html>
  );
}