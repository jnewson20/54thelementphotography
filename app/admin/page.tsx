"use client";

import React, { useEffect, useMemo, useState } from "react";
import { compressImageDataUrl, getDefaultContent, loadContent, saveClientAuthSnapshot, saveContent, type AdminClient, type AdminImage, type AdminPageContent, type AdminPortfolioItem, type AdminServiceGroup } from "./content";
import { clearAdminAuthentication, clearTemporaryAdminPassword, consumeTemporaryAdminPassword, isAdminAuthenticated, saveTemporaryAdminPassword, setAdminAuthenticated } from "../lib/auth";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

async function prepareUploadDataUrl(file: File, options?: { preserveOriginal?: boolean }) {
  const source = await readFileAsDataUrl(file);
  if (options?.preserveOriginal) {
    return source;
  }

  return compressImageDataUrl(source);
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#d8cbb1]/30 bg-[#f9f3e6]/90 p-6 shadow-[0_20px_50px_rgba(7,16,24,0.08)]">
      <h2 className="text-xl font-semibold text-[#071018]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function ImageEditor({ item, onChange, onRemove, onUpload }: { item: AdminImage; onChange: (patch: Partial<AdminImage>) => void; onRemove: () => void; onUpload: (file: File) => void }) {
  return (
    <div className="rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[#071018]">{item.alt || "Image"}</div>
        <button type="button" onClick={onRemove} className="rounded-full border border-[#071018]/10 px-3 py-1 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#d8cbb1]/30 bg-[#f2e9d9]">
        <img src={item.src} alt={item.alt || ""} className="h-36 w-full object-cover" />
      </div>
      <div className="mt-3 space-y-2">
        <label className="block text-sm text-[#4d5561]">
          Alt text
          <input value={item.alt} onChange={(e) => onChange({ alt: e.target.value })} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
        </label>
        <label className="block text-sm text-[#4d5561]">
          Replace image
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
        </label>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<AdminPageContent>(getDefaultContent());
  const [message, setMessage] = useState("Manage the site content below.");
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [draggedPortfolioIndex, setDraggedPortfolioIndex] = useState<number | null>(null);
  const [selectedCarouselIds, setSelectedCarouselIds] = useState<Record<string, boolean>>({});
  const [selectedGalleryImageIds, setSelectedGalleryImageIds] = useState<Record<string, Record<string, boolean>>>({});
  const [selectedClientImageIds, setSelectedClientImageIds] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = isAdminAuthenticated();
    setLoggedIn(saved);
    setAuthChecked(true);
    setContent(loadContent());
  }, []);

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();

    const isTemporaryPassword = username === ADMIN_USERNAME && consumeTemporaryAdminPassword(password);
    if (username === ADMIN_USERNAME && (password === ADMIN_PASSWORD || isTemporaryPassword)) {
      setAdminAuthenticated(true);
      setLoggedIn(true);
      setMessage(isTemporaryPassword ? "Signed in with your one-time password." : "Signed in successfully.");
    } else {
      setMessage("Use admin / admin123 to sign in, or request a temporary password.");
    }
  };

  const handleForgotPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setResettingPassword(true);
    setMessage("Sending your temporary password...");

    try {
      const response = await fetch("/api/admin/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username || ADMIN_USERNAME }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to send a temporary password.");
      }

      if (data.tempPassword) {
        saveTemporaryAdminPassword(data.tempPassword);
      }

      setShowForgotPassword(false);
      setMessage(data.message || "A one-time password has been sent to the admin email.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send a temporary password.");
    } finally {
      setResettingPassword(false);
    }
  };

  const saveCurrentContent = async () => {
    try {
      await saveContent(content);
      setMessage("Changes saved locally.");
      setShowSaveToast(true);
      window.setTimeout(() => setShowSaveToast(false), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save. Storage is full.");
    }
  };

  const updateHomeCarousel = (next: AdminImage[]) => {
    setContent((current) => ({ ...current, homeCarousel: next }));
  };
  const updatePortfolio = (next: AdminPortfolioItem[]) => {
    setContent((current) => ({ ...current, homePortfolio: next }));
  };
  const updateGallery = (next: AdminPageContent["gallery"]) => {
    setContent((current) => ({ ...current, gallery: next }));
  };
  const updateClients = (next: AdminClient[]) => {
    setContent((current) => ({ ...current, clients: next }));
    saveClientAuthSnapshot(next);
  };
  const updateServices = (next: AdminServiceGroup[]) => {
    setContent((current) => ({ ...current, services: next }));
  };

  const moveCarouselSlide = (from: number, to: number) => {
    updateHomeCarousel(moveItem(content.homeCarousel, from, to));
  };

  const movePortfolioItem = (from: number, to: number) => {
    updatePortfolio(moveItem(content.homePortfolio, from, to));
  };

  const moveGalleryGroup = (from: number, to: number) => {
    updateGallery(moveItem(content.gallery, from, to));
  };

  const moveGalleryImage = (groupIndex: number, from: number, to: number) => {
    const next = [...content.gallery];
    next[groupIndex] = {
      ...next[groupIndex],
      images: moveItem(next[groupIndex].images, from, to),
    };
    updateGallery(next);
  };

  const moveClient = (from: number, to: number) => {
    updateClients(moveItem(content.clients, from, to));
  };

  const moveClientImage = (clientIndex: number, from: number, to: number) => {
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      images: moveItem(next[clientIndex].images, from, to),
    };
    updateClients(next);
  };

  const moveServiceGroup = (from: number, to: number) => {
    updateServices(moveItem(content.services, from, to));
  };

  const moveServicePackage = (groupIndex: number, from: number, to: number) => {
    const next = [...content.services];
    next[groupIndex] = {
      ...next[groupIndex],
      packages: moveItem(next[groupIndex].packages, from, to),
    };
    updateServices(next);
  };

  const toggleCarouselSelection = (id: string) => {
    setSelectedCarouselIds((current) => ({ ...current, [id]: !current[id] }));
  };

  const deleteSelectedCarousel = () => {
    const next = content.homeCarousel.filter((item) => !selectedCarouselIds[item.id]);
    updateHomeCarousel(next);
    setSelectedCarouselIds({});
  };

  const selectAllCarousel = () => {
    setSelectedCarouselIds(
      content.homeCarousel.reduce<Record<string, boolean>>((acc, item) => {
        acc[item.id] = true;
        return acc;
      }, {})
    );
  };

  const clearCarouselSelection = () => {
    setSelectedCarouselIds({});
  };

  const toggleGalleryImageSelection = (groupKey: string, imageId: string) => {
    setSelectedGalleryImageIds((current) => ({
      ...current,
      [groupKey]: {
        ...(current[groupKey] || {}),
        [imageId]: !(current[groupKey] || {})[imageId],
      },
    }));
  };

  const deleteSelectedGalleryImages = (groupIndex: number) => {
    const groupKey = content.gallery[groupIndex].key;
    const selectedForGroup = selectedGalleryImageIds[groupKey] || {};
    const next = [...content.gallery];
    next[groupIndex] = {
      ...next[groupIndex],
      images: next[groupIndex].images.filter((image) => !selectedForGroup[image.id]),
    };
    updateGallery(next);
    setSelectedGalleryImageIds((current) => ({ ...current, [groupKey]: {} }));
  };

  const selectAllGalleryImages = (groupIndex: number) => {
    const group = content.gallery[groupIndex];
    const nextSelection = group.images.reduce<Record<string, boolean>>((acc, image) => {
      acc[image.id] = true;
      return acc;
    }, {});

    setSelectedGalleryImageIds((current) => ({
      ...current,
      [group.key]: nextSelection,
    }));
  };

  const clearGalleryImageSelection = (groupKey: string) => {
    setSelectedGalleryImageIds((current) => ({
      ...current,
      [groupKey]: {},
    }));
  };

  const toggleClientImageSelection = (clientId: string, imageId: string) => {
    setSelectedClientImageIds((current) => ({
      ...current,
      [clientId]: {
        ...(current[clientId] || {}),
        [imageId]: !(current[clientId] || {})[imageId],
      },
    }));
  };

  const deleteSelectedClientImages = (clientIndex: number) => {
    const clientId = content.clients[clientIndex].id;
    const selectedForClient = selectedClientImageIds[clientId] || {};
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      images: next[clientIndex].images.filter((image) => !selectedForClient[image.id]),
    };
    updateClients(next);
    setSelectedClientImageIds((current) => ({ ...current, [clientId]: {} }));
  };

  const selectAllClientImages = (clientIndex: number) => {
    const client = content.clients[clientIndex];
    const nextSelection = client.images.reduce<Record<string, boolean>>((acc, image) => {
      acc[image.id] = true;
      return acc;
    }, {});

    setSelectedClientImageIds((current) => ({
      ...current,
      [client.id]: nextSelection,
    }));
  };

  const clearClientImageSelection = (clientId: string) => {
    setSelectedClientImageIds((current) => ({
      ...current,
      [clientId]: {},
    }));
  };

  const resetClientLoginBackground = () => {
    setContent((current) => ({ ...current, clientLoginBackground: "/assets/client-bg.jpg" }));
  };

  const resetClientCoverImage = (clientIndex: number) => {
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      coverImage: "/assets/client-bg.jpg",
    };
    updateClients(next);
  };

  const addCarouselSlide = () => {
    updateHomeCarousel([...content.homeCarousel, { id: createId("carousel"), src: "/assets/hero1.jpg", alt: "New slide" }]);
  };

  const addPortfolioItem = () => {
    if (content.homePortfolio.length >= 3) return;
    updatePortfolio([...content.homePortfolio, { id: createId("portfolio"), title: "New portfolio item", src: "/assets/portfolio1.jpg" }]);
  };

  const addGalleryImage = (groupIndex: number) => {
    const next = [...content.gallery];
    next[groupIndex] = {
      ...next[groupIndex],
      images: [...next[groupIndex].images, { id: createId("gallery"), src: "/assets/portraits-1.jpg", alt: "New image" }],
    };
    updateGallery(next);
  };

  const addClient = () => {
    updateClients([
      ...content.clients,
      {
        id: createId("client"),
        name: "New Client",
        username: `client-${Math.random().toString(36).slice(2, 6)}`,
        password: "change-me",
        galleryTitle: "Client Gallery",
        coverImage: "/assets/client-bg.jpg",
        images: [],
      },
    ]);
  };

  const addClientImage = (clientIndex: number) => {
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      images: [...next[clientIndex].images, { id: createId("client-image"), src: "/assets/portraits-1.jpg", alt: "New client image" }],
    };
    updateClients(next);
  };

  const handleClientBulkUpload = async (files: FileList | null, clientIndex: number) => {
    if (!files?.length) return;
    const dataUrls = await Promise.all(
      Array.from(files).map((file) => prepareUploadDataUrl(file, { preserveOriginal: true }))
    );
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      images: [
        ...next[clientIndex].images,
        ...dataUrls.map((src, index) => ({ id: createId(`client-image-${index}`), src, alt: `Client image ${next[clientIndex].images.length + index + 1}` })),
      ],
    };
    updateClients(next);
  };

  const addServiceGroup = () => {
    updateServices([
      ...content.services,
      {
        key: createId("service"),
        title: "New Service",
        description: "Describe this new offering.",
        packages: [
          {
            id: createId("pkg"),
            title: "Starter",
            price: "$0",
            duration: "1 hour",
            bullets: ["Add features here"],
            note: "",
            primaryButtonText: "Book",
            primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
            secondaryButtonText: "Inquire",
            secondaryButtonHref: "/#contact",
          },
        ],
      },
    ]);
  };

  const addServicePackage = (groupIndex: number) => {
    const next = [...content.services];
    next[groupIndex] = {
      ...next[groupIndex],
      packages: [
        ...next[groupIndex].packages,
        {
          id: createId("pkg"),
          title: "New package",
          price: "$0",
          duration: "1 hour",
          bullets: ["Add features here"],
          note: "",
          primaryButtonText: "Book",
          primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
          secondaryButtonText: "Inquire",
          secondaryButtonHref: "/#contact",
        },
      ],
    };
    updateServices(next);
  };

  const handleUpload = async (file: File, target: "carousel" | "portfolio" | "gallery" | "background" | "client" | "client-cover" | "service", index?: number, groupIndex?: number, packageIndex?: number, clientIndex?: number) => {
    const keepOriginalQuality = target === "client" || target === "client-cover";
    const dataUrl = await prepareUploadDataUrl(file, { preserveOriginal: keepOriginalQuality });
    if (target === "carousel") {
      const next = [...content.homeCarousel];
      next[index ?? 0] = { ...next[index ?? 0], src: dataUrl };
      updateHomeCarousel(next);
      return;
    }
    if (target === "portfolio") {
      const next = [...content.homePortfolio];
      next[index ?? 0] = { ...next[index ?? 0], src: dataUrl };
      updatePortfolio(next);
      return;
    }
    if (target === "background") {
      setContent((current) => ({ ...current, clientLoginBackground: dataUrl }));
      return;
    }
    if (target === "client") {
      const next = [...content.clients];
      next[clientIndex ?? 0] = {
        ...next[clientIndex ?? 0],
        images: next[clientIndex ?? 0].images.map((img, imgIndex) => (imgIndex === index ? { ...img, src: dataUrl } : img)),
      };
      updateClients(next);
      return;
    }
    if (target === "client-cover") {
      const next = [...content.clients];
      next[clientIndex ?? 0] = {
        ...next[clientIndex ?? 0],
        coverImage: dataUrl,
      };
      updateClients(next);
      return;
    }
    if (target === "gallery") {
      const next = [...content.gallery];
      next[groupIndex ?? 0] = {
        ...next[groupIndex ?? 0],
        images: next[groupIndex ?? 0].images.map((img, imgIndex) => (imgIndex === index ? { ...img, src: dataUrl } : img)),
      };
      updateGallery(next);
      return;
    }
    if (target === "service") {
      const next = [...content.services];
      next[groupIndex ?? 0] = {
        ...next[groupIndex ?? 0],
        packages: next[groupIndex ?? 0].packages.map((pkg, pkgIndex) => (pkgIndex === packageIndex ? { ...pkg, primaryButtonHref: dataUrl } : pkg)),
      };
      updateServices(next);
    }
  };

  const previewSummary = useMemo(() => {
    const count = content.homeCarousel.length + content.gallery.reduce((sum, group) => sum + group.images.length, 0);
    return `${count} media items currently managed`;
  }, [content]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#071018] px-4 py-20 text-white">
        <div className="mx-auto flex max-w-md flex-col rounded-[28px] border border-[#d8cbb1]/20 bg-[#0f1b29] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
          <p className="text-sm uppercase tracking-[0.3em] text-[#9aa6b2]">Administrator</p>
          <h1 className="mt-2 text-3xl font-semibold">Checking access</h1>
          <p className="mt-3 text-sm text-[#c9d5dc]">Verifying your administrator session.</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#071018] px-4 py-20 text-white">
        <div className="mx-auto flex max-w-md flex-col rounded-[28px] border border-[#d8cbb1]/20 bg-[#0f1b29] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.3)]">
          <p className="text-sm uppercase tracking-[0.3em] text-[#9aa6b2]">Administrator</p>
          <h1 className="mt-2 text-3xl font-semibold">Admin login</h1>
          <p className="mt-3 text-sm text-[#c9d5dc]">Use the shared administrator credentials to manage the site.</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block text-sm text-[#c9d5dc]">
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#071018] px-3 py-2 text-white" />
            </label>
            <label className="block text-sm text-[#c9d5dc]">
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#071018] px-3 py-2 text-white" />
            </label>
            <button type="submit" className="btn-accent w-full rounded-xl px-4 py-2">Sign in</button>
          </form>

          <div className="mt-4 space-y-3">
            <button type="button" onClick={() => setShowForgotPassword((current) => !current)} className="text-sm font-medium text-[#f0d9ae] hover:underline">
              {showForgotPassword ? "Hide password reset" : "Forgot password?"}
            </button>

            {showForgotPassword && (
              <form onSubmit={handleForgotPassword} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-[#c9d5dc]">Send a one-time password to the admin email address.</p>
                <button type="submit" disabled={resettingPassword} className="mt-3 rounded-xl border border-[#f0d9ae]/40 px-3 py-2 text-sm font-medium text-[#f0d9ae] transition hover:bg-[#f0d9ae]/10 disabled:opacity-60">
                  {resettingPassword ? "Sending..." : "Send temporary password"}
                </button>
              </form>
            )}
          </div>

          <p className="mt-4 text-sm text-[#9aa6b2]">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f1e4] px-4 py-10 text-[#071018]">
      {showSaveToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="rounded-full bg-[#071018] px-6 py-3 text-sm font-semibold text-white shadow-lg">
            Changes saved
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-[30px] border border-[#d8cbb1]/30 bg-[#071018] px-8 py-8 text-white shadow-[0_25px_60px_rgba(7,16,24,0.15)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-[#9aa6b2]">Administrator</p>
              <h1 className="mt-2 text-3xl font-semibold">Manage the photography site</h1>
              <p className="mt-2 text-sm text-[#c9d5dc]">{previewSummary}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={saveCurrentContent} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">Save changes</button>
              <button type="button" onClick={() => { clearAdminAuthentication(); clearTemporaryAdminPassword(); setLoggedIn(false); setMessage("Signed out."); }} className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20">Log out</button>
            </div>
          </div>
        </header>

        <SectionCard title="Main page carousel">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5f5d58]">Add, remove, or replace slides shown on the homepage hero.</p>
            <div className="flex gap-2">
              <button type="button" onClick={addCarouselSlide} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add slide</button>
              <button type="button" onClick={selectAllCarousel} disabled={content.homeCarousel.length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Select all</button>
              <button type="button" onClick={clearCarouselSelection} disabled={Object.values(selectedCarouselIds).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Clear selection</button>
              <button type="button" onClick={deleteSelectedCarousel} disabled={Object.values(selectedCarouselIds).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Delete selected</button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {content.homeCarousel.map((slide, index) => (
              <div key={slide.id} className="rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
                <label className="mb-2 flex items-center gap-2 text-xs text-[#4d5561]">
                  <input type="checkbox" checked={Boolean(selectedCarouselIds[slide.id])} onChange={() => toggleCarouselSelection(slide.id)} />
                  Select for delete
                </label>
                <img src={slide.src} alt={slide.alt || ""} className="h-44 w-full rounded-2xl object-cover" />
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <button type="button" disabled={index === 0} onClick={() => moveCarouselSlide(index, index - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Up</button>
                    <button type="button" disabled={index === content.homeCarousel.length - 1} onClick={() => moveCarouselSlide(index, index + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Down</button>
                  </div>
                  <label className="block text-sm text-[#4d5561]">
                    Alt text
                    <input value={slide.alt} onChange={(e) => { const next = [...content.homeCarousel]; next[index] = { ...next[index], alt: e.target.value }; updateHomeCarousel(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Upload image
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "carousel", index)} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
                  </label>
                  <button type="button" onClick={() => updateHomeCarousel(content.homeCarousel.filter((item) => item.id !== slide.id))} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Homepage portfolio cards">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5f5d58]">Exactly 3 cards shown under the hero section. Drag to reorder.</p>
            {content.homePortfolio.length < 3 && (
              <button type="button" onClick={addPortfolioItem} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add card ({content.homePortfolio.length}/3)</button>
            )}
          </div>
          {content.homePortfolio.length < 3 && (
            <p className="rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">⚠ Add {3 - content.homePortfolio.length} more card(s) to complete the portfolio section.</p>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {content.homePortfolio.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDraggedPortfolioIndex(index)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedPortfolioIndex !== null && draggedPortfolioIndex !== index) {
                    const next = [...content.homePortfolio];
                    const draggedItem = next[draggedPortfolioIndex];
                    next.splice(draggedPortfolioIndex, 1);
                    next.splice(index, 0, draggedItem);
                    setDraggedPortfolioIndex(index);
                    updatePortfolio(next);
                  }
                }}
                onDragEnd={() => setDraggedPortfolioIndex(null)}
                className={`cursor-move rounded-2xl border-2 transition-opacity ${
                  draggedPortfolioIndex === index ? "opacity-40 border-[#071018]" : "border-[#d8cbb1]/40"
                } bg-white/70 p-4`}
              >
                <div className="mb-2 inline-block rounded-full bg-[#d8cbb1]/20 px-2 py-1 text-xs text-[#4d5561]">Position {index + 1}</div>
                <img src={item.src} alt={item.title} className="h-40 w-full rounded-2xl object-cover" />
                <div className="mt-3 space-y-2">
                  <div className="flex gap-2">
                    <button type="button" disabled={index === 0} onClick={() => movePortfolioItem(index, index - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Up</button>
                    <button type="button" disabled={index === content.homePortfolio.length - 1} onClick={() => movePortfolioItem(index, index + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Down</button>
                  </div>
                  <label className="block text-sm text-[#4d5561]">
                    Title
                    <input value={item.title} onChange={(e) => { const next = [...content.homePortfolio]; next[index] = { ...next[index], title: e.target.value }; updatePortfolio(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Upload image
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "portfolio", index)} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Gallery categories">
          <p className="text-sm text-[#5f5d58]">Update each category title and its gallery images.</p>
          <div className="space-y-6">
            {content.gallery.map((group, groupIndex) => (
              <div key={group.key} className="rounded-[22px] border border-[#d8cbb1]/30 bg-[#f7f1e4] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-[#071018]">{group.title}</h3>
                    <p className="text-sm text-[#5f5d58]">Category key: {group.key}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={groupIndex === 0} onClick={() => moveGalleryGroup(groupIndex, groupIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-2 text-xs disabled:opacity-40">Up</button>
                    <button type="button" disabled={groupIndex === content.gallery.length - 1} onClick={() => moveGalleryGroup(groupIndex, groupIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-2 text-xs disabled:opacity-40">Down</button>
                    <button type="button" onClick={() => addGalleryImage(groupIndex)} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add image</button>
                    <button type="button" onClick={() => selectAllGalleryImages(groupIndex)} disabled={group.images.length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-xs disabled:opacity-40">Select all</button>
                    <button type="button" onClick={() => clearGalleryImageSelection(group.key)} disabled={Object.values(selectedGalleryImageIds[group.key] || {}).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-xs disabled:opacity-40">Clear selection</button>
                    <button type="button" onClick={() => deleteSelectedGalleryImages(groupIndex)} disabled={Object.values(selectedGalleryImageIds[group.key] || {}).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-xs disabled:opacity-40">Delete selected</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {group.images.map((image, imageIndex) => (
                    <div key={image.id} className="rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
                      <label className="mb-2 flex items-center gap-2 text-xs text-[#4d5561]">
                        <input type="checkbox" checked={Boolean((selectedGalleryImageIds[group.key] || {})[image.id])} onChange={() => toggleGalleryImageSelection(group.key, image.id)} />
                        Select for delete
                      </label>
                      <img src={image.src} alt={image.alt || ""} className="h-40 w-full rounded-2xl object-cover" />
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <button type="button" disabled={imageIndex === 0} onClick={() => moveGalleryImage(groupIndex, imageIndex, imageIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Up</button>
                          <button type="button" disabled={imageIndex === group.images.length - 1} onClick={() => moveGalleryImage(groupIndex, imageIndex, imageIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Down</button>
                        </div>
                        <label className="block text-sm text-[#4d5561]">
                          Alt text
                          <input value={image.alt} onChange={(e) => { const next = [...content.gallery]; next[groupIndex] = { ...next[groupIndex], images: next[groupIndex].images.map((img, index) => index === imageIndex ? { ...img, alt: e.target.value } : img) }; updateGallery(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Upload image
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "gallery", imageIndex, groupIndex)} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
                        </label>
                        <button type="button" onClick={() => { const next = [...content.gallery]; next[groupIndex] = { ...next[groupIndex], images: next[groupIndex].images.filter((entry) => entry.id !== image.id) }; updateGallery(next); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Client login background">
          <label className="block text-sm text-[#4d5561]">
            Upload new background image
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "background")} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
          </label>
          <button type="button" onClick={resetClientLoginBackground} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove upload</button>
          <div className="overflow-hidden rounded-2xl border border-[#d8cbb1]/30 bg-[#071018]">
            <img src={content.clientLoginBackground} alt="Client login background" className="h-56 w-full object-cover" />
          </div>
        </SectionCard>

        <SectionCard title="Client galleries">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5f5d58]">Create client credentials, set a client title, and manage their private gallery images.</p>
            <button type="button" onClick={addClient} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add client</button>
          </div>
          <div className="space-y-6">
            {content.clients.map((client, clientIndex) => (
              <div key={client.id} className="rounded-[22px] border border-[#d8cbb1]/30 bg-[#f7f1e4] p-4">
                <div className="mb-3 flex gap-2">
                  <button type="button" disabled={clientIndex === 0} onClick={() => moveClient(clientIndex, clientIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Move client up</button>
                  <button type="button" disabled={clientIndex === content.clients.length - 1} onClick={() => moveClient(clientIndex, clientIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Move client down</button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-[#4d5561]">
                    Client name
                    <input value={client.name} onChange={(e) => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], name: e.target.value }; updateClients(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Gallery title
                    <input value={client.galleryTitle} onChange={(e) => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], galleryTitle: e.target.value }; updateClients(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Username
                    <input value={client.username} onChange={(e) => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], username: e.target.value }; updateClients(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Password
                    <input value={client.password} onChange={(e) => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], password: e.target.value }; updateClients(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                </div>
                <div className="mt-4 rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
                  <p className="text-sm font-medium text-[#4d5561]">Client cover image</p>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-[#d8cbb1]/30 bg-[#071018]">
                    <img src={client.coverImage || "/assets/client-bg.jpg"} alt={`${client.name} cover`} className="h-40 w-full object-cover" />
                  </div>
                  <label className="mt-3 block text-sm text-[#4d5561]">
                    Upload cover image
                    <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "client-cover", undefined, undefined, undefined, clientIndex)} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
                  </label>
                  <button type="button" onClick={() => resetClientCoverImage(clientIndex)} className="mt-3 rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove cover upload</button>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[#5f5d58]">Upload one image or several at once for this client gallery.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => addClientImage(clientIndex)} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add placeholder</button>
                    <label className="cursor-pointer rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">
                      Upload multiple
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleClientBulkUpload(e.target.files, clientIndex)} />
                    </label>
                    <button type="button" onClick={() => selectAllClientImages(clientIndex)} disabled={client.images.length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Select all</button>
                    <button type="button" onClick={() => clearClientImageSelection(client.id)} disabled={Object.values(selectedClientImageIds[client.id] || {}).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Clear selection</button>
                    <button type="button" onClick={() => deleteSelectedClientImages(clientIndex)} disabled={Object.values(selectedClientImageIds[client.id] || {}).filter(Boolean).length === 0} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white disabled:opacity-40">Delete selected</button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {client.images.map((image, imageIndex) => (
                    <div key={image.id} className="rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
                      <label className="mb-2 flex items-center gap-2 text-xs text-[#4d5561]">
                        <input type="checkbox" checked={Boolean((selectedClientImageIds[client.id] || {})[image.id])} onChange={() => toggleClientImageSelection(client.id, image.id)} />
                        Select for delete
                      </label>
                      <img src={image.src} alt={image.alt || ""} className="h-40 w-full rounded-2xl object-cover" />
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <button type="button" disabled={imageIndex === 0} onClick={() => moveClientImage(clientIndex, imageIndex, imageIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Up</button>
                          <button type="button" disabled={imageIndex === client.images.length - 1} onClick={() => moveClientImage(clientIndex, imageIndex, imageIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Down</button>
                        </div>
                        <label className="block text-sm text-[#4d5561]">
                          Alt text
                          <input value={image.alt} onChange={(e) => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], images: next[clientIndex].images.map((img, index) => index === imageIndex ? { ...img, alt: e.target.value } : img) }; updateClients(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Upload image
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "client", imageIndex, undefined, undefined, clientIndex)} className="mt-1 w-full rounded-xl border border-dashed border-[#d8cbb1]/70 bg-white px-3 py-2 text-sm" />
                        </label>
                        <button type="button" onClick={() => { const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], images: next[clientIndex].images.filter((entry) => entry.id !== image.id) }; updateClients(next); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Services and package cards">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#5f5d58]">Edit service categories, package cards, and the button links on the services page.</p>
            <button type="button" onClick={addServiceGroup} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add service group</button>
          </div>
          <div className="space-y-6">
            {content.services.map((group, groupIndex) => (
              <div key={group.key} className="rounded-[22px] border border-[#d8cbb1]/30 bg-[#f7f1e4] p-4">
                <div className="mb-3 flex gap-2">
                  <button type="button" disabled={groupIndex === 0} onClick={() => moveServiceGroup(groupIndex, groupIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Move group up</button>
                  <button type="button" disabled={groupIndex === content.services.length - 1} onClick={() => moveServiceGroup(groupIndex, groupIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Move group down</button>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm text-[#4d5561]">
                    Group title
                    <input value={group.title} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], title: e.target.value }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <label className="block text-sm text-[#4d5561]">
                    Description
                    <textarea value={group.description} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], description: e.target.value }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                  </label>
                  <button type="button" onClick={() => addServicePackage(groupIndex)} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm font-medium text-[#071018] transition hover:bg-[#071018] hover:text-white">Add package</button>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {group.packages.map((pkg, pkgIndex) => (
                    <div key={pkg.id} className="rounded-2xl border border-[#d8cbb1]/40 bg-white/70 p-4">
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button type="button" disabled={pkgIndex === 0} onClick={() => moveServicePackage(groupIndex, pkgIndex, pkgIndex - 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Up</button>
                          <button type="button" disabled={pkgIndex === group.packages.length - 1} onClick={() => moveServicePackage(groupIndex, pkgIndex, pkgIndex + 1)} className="rounded-full border border-[#071018]/10 px-3 py-1 text-xs disabled:opacity-40">Down</button>
                        </div>
                        <label className="block text-sm text-[#4d5561]">
                          Package title
                          <input value={pkg.title} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, title: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Price
                          <input value={pkg.price} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, price: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Duration
                          <input value={pkg.duration} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, duration: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Bullets (comma separated)
                          <input value={pkg.bullets.join(", ")} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, bullets: e.target.value.split(",").map((item) => item.trim()).filter(Boolean) } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Note
                          <input value={pkg.note} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, note: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Primary button text
                          <input value={pkg.primaryButtonText} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, primaryButtonText: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Primary button link
                          <input value={pkg.primaryButtonHref} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, primaryButtonHref: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Secondary button text
                          <input value={pkg.secondaryButtonText} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, secondaryButtonText: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <label className="block text-sm text-[#4d5561]">
                          Secondary button link
                          <input value={pkg.secondaryButtonHref} onChange={(e) => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.map((entry, index) => index === pkgIndex ? { ...entry, secondaryButtonHref: e.target.value } : entry) }; updateServices(next); }} className="mt-1 w-full rounded-xl border border-[#d8cbb1]/60 bg-white px-3 py-2 text-sm text-[#071018]" />
                        </label>
                        <button type="button" onClick={() => { const next = [...content.services]; next[groupIndex] = { ...next[groupIndex], packages: next[groupIndex].packages.filter((entry) => entry.id !== pkg.id) }; updateServices(next); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove package</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
