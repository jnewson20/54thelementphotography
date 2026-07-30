"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Layout from "../components/Layout";
import Carousel from "../components/Carousel";
import LazyContactForm from "../components/LazyContactForm";
import { type AdminPageContent } from "./admin/content";
import { IMAGE_SIZES } from "./lib/image-sizes";
import { toMediaSrc } from "./lib/media";

export default function HomePageClient({ content }: { content: AdminPageContent }) {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (prefersReduced) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    revealElements.forEach((element) => observer.observe(element));
    window.setTimeout(() => {
      revealElements.forEach((element) => element.classList.add("is-visible"));
    }, 120);

    return () => observer.disconnect();
  }, []);

  const heroSlides = content.homeCarousel.map((slide) => ({ src: slide.src, alt: slide.alt }));
  const portfolio = content.homePortfolio;
  const featuredServices = content.services.slice(0, 3);

  return (
    <Layout>
      <section className="relative h-screen overflow-hidden">
        <Carousel slides={heroSlides} interval={6000} />
        <div className="container relative flex h-full flex-col justify-center">
          <div data-reveal className="reveal mx-auto max-w-3xl text-center">
            <h1 className="soft-float text-[clamp(28px,6vw,56px)] font-extrabold text-white/90 text-shadow-lg text-shadow-black-950">
              Capture. Create. Connect.
            </h1>
            <p className="mt-4 text-white/90">Contemporary photography — editorial, travel, and portrait.</p>
            <div className="mt-6 flex justify-center gap-3">
              <a className="btn-accent" href="./gallery">View Work</a>
              <a className="btn-ghost shadow-xs shadow-mist-700" href="/#contact">
                Contact
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="container mt-12 cv-auto">
        <h2 data-reveal className="reveal mb-6 text-2xl font-semibold">Portfolio</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {portfolio.map((p, index) => (
            <div key={p.id} data-reveal className="reveal group relative h-72 overflow-hidden rounded-[28px]" style={{ transitionDelay: `${index * 80}ms` }}>
              <div className="card-photo relative h-full w-full">
                {p.src ? (
                  <Image
                    src={toMediaSrc(p.src)}
                    alt={p.title}
                    fill
                    className="h-full w-full object-cover"
                    sizes={IMAGE_SIZES.THIRD}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs text-gray-600">
                    No image
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className="container mt-12 cv-auto">
        <h2 data-reveal className="reveal mb-6 text-2xl font-semibold">Services</h2>
        <div className="mt-6 grid gap-4 text-white md:grid-cols-3">
          {featuredServices.map((service, index) => (
            <div key={service.key} data-reveal className="reveal rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(94,64,27,0.60),rgba(94,64,27,0.50))] p-6 shadow-[0_20px_50px_rgba(7,16,24,0.12)] transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_26px_60px_rgba(7,16,24,0.2)]" style={{ transitionDelay: `${index * 90}ms` }}>
              <h3 className="font-semibold">{service.title}</h3>
              <p className="mt-2 text-sm text-white/80">{service.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="container mt-12 mb-20 cv-auto">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div data-reveal className="reveal relative h-80 overflow-hidden rounded-[32px] bg-[#071018] shadow-[0_24px_60px_rgba(7,16,24,0.16)] md:h-[520px]">
            <Image
              src="/assets/about-1-1.avif"
              alt="Photographer portrait"
              fill
              className="h-full w-full object-cover"
              sizes={IMAGE_SIZES.HALF}
            />
          </div>

          <div data-reveal className="reveal">
            <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[#797979]">About Me</p>
            <h2 className="mb-4 text-3xl font-semibold">Meet the Photographer</h2>
            <p className="leading-8 text-black/80">
              I focus on capturing honest, cinematic imagery that paints a story. I have an appreciation for art within all it's forms, which helps me foster creating portraits that feel authentic and full of character.
              Whether I am shooting a brand campaign or a personal portrait session, I aim to make every client feel seen, comfortable, and beautifully represented through my lens.
            </p>
          </div>
        </div>
      </section>

      <section id="contact" className="container mb-40 cv-auto">
        <h2 data-reveal className="reveal mb-4 text-2xl font-semibold">Contact</h2>
        <div data-reveal className="reveal">
          <LazyContactForm />
        </div>
      </section>
    </Layout>
  );
}