"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { DEFAULT_CLIENT_COVER_IMAGE, SECTION_DEFAULT_IMAGE_SRC, fetchContent, getDefaultContent, saveClientAuthSnapshot, saveContent, type AdminClient, type AdminImage, type AdminPageContent, type AdminPortfolioItem, type AdminServiceGroup } from "./content";
import { clearAdminAuthentication, clearTemporaryAdminPassword, consumeTemporaryAdminPassword, isAdminAuthenticated, saveTemporaryAdminPassword, setAdminAuthenticated } from "../lib/auth";
import { toMediaSrc } from "../lib/media";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

type UploadSection =
  | "hero"
  | "home-portfolio"
  | "gallery-portrait"
  | "gallery-wedding"
  | "gallery-branding"
  | "client-login"
  | "client-cover"
  | "client-gallery";

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

async function uploadImageFileWithProgress(file: File, section: UploadSection, onProgress?: (loaded: number, total: number) => void) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("section", section);

  return new Promise<{ src: string; warning?: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/upload");

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded, event.total || file.size);
      }
    };

    request.onerror = () => reject(new Error("Unable to upload image."));

    request.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = null;
      }

      const typed = payload as { src?: string; error?: string; warning?: string } | null;
      if (request.status < 200 || request.status >= 300 || !typed?.src) {
        reject(new Error(typed?.error || "Unable to upload image."));
        return;
      }

      resolve({ src: typed.src, warning: typed.warning });
    };

    request.send(formData);
  });
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function formatEta(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--";
  const whole = Math.max(0, Math.round(seconds));
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  if (mins <= 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function isManagedUploadPath(src?: string) {
  if (!src) return false;

  return src.startsWith("/assets/") || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/uploads/");
}

async function deleteManagedImage(src: string) {
  if (!isManagedUploadPath(src)) return;

  await fetch("/api/admin/delete-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ src }),
  }).catch(() => null);
}

function removeManagedImages(sources: Array<string | undefined>) {
  sources.forEach((source) => {
    if (source && isManagedUploadPath(source)) {
      void deleteManagedImage(source);
    }
  });
}

type SectionUploadSummary = {
  key: string;
  label: string;
  loaded: number;
  total: number;
  uploads: number;
  updatedAt: number;
};

function resolveGallerySection(groupKey: string): UploadSection {
  const normalized = groupKey.trim().toLowerCase();
  if (normalized.includes("portrait")) return "gallery-portrait";
  if (normalized.includes("wedding")) return "gallery-wedding";
  return "gallery-branding";
}

function defaultGallerySrcForGroup(groupKey: string) {
  const section = resolveGallerySection(groupKey);
  if (section === "gallery-portrait") return SECTION_DEFAULT_IMAGE_SRC.galleryPortrait[0];
  if (section === "gallery-wedding") return SECTION_DEFAULT_IMAGE_SRC.galleryWedding[0];
  return SECTION_DEFAULT_IMAGE_SRC.galleryBranding[0];
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-[#d8cbb1]/30 bg-[#f9f3e6]/90 p-6 shadow-[0_20px_50px_rgba(7,16,24,0.08)]">
      <h2 className="text-xl font-semibold text-[#071018]">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function PreviewImage({ src, alt, width, height, className, sizes, eager = false }: { src?: string; alt: string; width: number; height: number; className: string; sizes: string; eager?: boolean }) {
  const resolvedSrc = toMediaSrc((src || "").trim());

  if (!resolvedSrc) {
    return <div className={`${className} bg-[#e7dcc8]`} />;
  }

  return (
    <Image
      src={resolvedSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
    />
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
        <PreviewImage src={item.src} alt={item.alt || ""} width={1200} height={360} className="h-36 w-full object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
  const [uploadProgress, setUploadProgress] = useState<{ label: string; loaded: number; total: number; startedAt: number; speedBps: number; etaSeconds: number | null } | null>(null);
  const [sectionProgress, setSectionProgress] = useState<Record<string, SectionUploadSummary>>({});
  const [showProgressPanel, setShowProgressPanel] = useState(false);
  const [fadeProgressPanel, setFadeProgressPanel] = useState(false);
  const [uploadElapsedMs, setUploadElapsedMs] = useState(0);
  const uploadStatRef = useRef<{ lastLoaded: number; lastAt: number; speedBps: number }>({
    lastLoaded: 0,
    lastAt: 0,
    speedBps: 0,
  });
  const progressFadeTimeoutRef = useRef<number | null>(null);
  const progressHideTimeoutRef = useRef<number | null>(null);
  const hasHydratedContent = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = isAdminAuthenticated();
    setLoggedIn(saved);
    setAuthChecked(true);
    void (async () => {
      const loaded = await fetchContent({ fresh: true });
      setContent(loaded);
      hasHydratedContent.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!hasHydratedContent.current) return;

    const timer = window.setTimeout(() => {
      void saveContent(content).catch(() => null);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [content]);

  useEffect(() => {
    if (!uploadProgress) {
      setUploadElapsedMs(0);
      uploadStatRef.current = { lastLoaded: 0, lastAt: 0, speedBps: 0 };
      return;
    }

    const tick = () => setUploadElapsedMs(Date.now() - uploadProgress.startedAt);
    tick();
    const interval = window.setInterval(tick, 200);
    return () => window.clearInterval(interval);
  }, [uploadProgress]);

  useEffect(() => {
    const hasSectionProgress = Object.keys(sectionProgress).length > 0;

    if (uploadProgress || hasSectionProgress) {
      if (progressFadeTimeoutRef.current) {
        window.clearTimeout(progressFadeTimeoutRef.current);
        progressFadeTimeoutRef.current = null;
      }
      if (progressHideTimeoutRef.current) {
        window.clearTimeout(progressHideTimeoutRef.current);
        progressHideTimeoutRef.current = null;
      }
      setShowProgressPanel(true);
      setFadeProgressPanel(false);
    }

    if (!uploadProgress && hasSectionProgress) {
      const allComplete = Object.values(sectionProgress).every((entry) => entry.total > 0 && entry.loaded >= entry.total);

      if (allComplete && !progressFadeTimeoutRef.current && !progressHideTimeoutRef.current) {
        progressFadeTimeoutRef.current = window.setTimeout(() => {
          setFadeProgressPanel(true);
          progressFadeTimeoutRef.current = null;

          progressHideTimeoutRef.current = window.setTimeout(() => {
            setShowProgressPanel(false);
            setFadeProgressPanel(false);
            setSectionProgress({});
            progressHideTimeoutRef.current = null;
          }, 420);
        }, 320);
      }
    }
  }, [uploadProgress, sectionProgress]);

  useEffect(() => {
    return () => {
      if (progressFadeTimeoutRef.current) {
        window.clearTimeout(progressFadeTimeoutRef.current);
      }
      if (progressHideTimeoutRef.current) {
        window.clearTimeout(progressHideTimeoutRef.current);
      }
    };
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
      setMessage("Changes saved on site.");
      setShowSaveToast(true);
      window.setTimeout(() => setShowSaveToast(false), 1800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save changes.");
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

  const beginSectionProgress = (sectionKey: string, label: string, bytesToAdd: number) => {
    const existing = sectionProgress[sectionKey];
    const baseLoaded = existing?.loaded ?? 0;
    const baseTotal = existing?.total ?? 0;
    const nextTotal = baseTotal + Math.max(0, bytesToAdd);

    setSectionProgress((current) => ({
      ...current,
      [sectionKey]: {
        key: sectionKey,
        label,
        loaded: baseLoaded,
        total: nextTotal,
        uploads: current[sectionKey]?.uploads ?? 0,
        updatedAt: Date.now(),
      },
    }));

    return { baseLoaded, nextTotal };
  };

  const updateSectionProgress = (sectionKey: string, label: string, loaded: number, total: number) => {
    setSectionProgress((current) => {
      const existing = current[sectionKey];
      return {
        ...current,
        [sectionKey]: {
          key: sectionKey,
          label,
          loaded: Math.max(existing?.loaded ?? 0, Math.min(loaded, total)),
          total,
          uploads: existing?.uploads ?? 0,
          updatedAt: Date.now(),
        },
      };
    });
  };

  const finishSectionProgress = (sectionKey: string, label: string, loaded: number, total: number, uploadsCompleted = 1) => {
    setSectionProgress((current) => {
      const existing = current[sectionKey];
      return {
        ...current,
        [sectionKey]: {
          key: sectionKey,
          label,
          loaded: Math.max(existing?.loaded ?? 0, Math.min(loaded, total)),
          total,
          uploads: (existing?.uploads ?? 0) + uploadsCompleted,
          updatedAt: Date.now(),
        },
      };
    });
  };

  const getUploadMeta = (target: "carousel" | "portfolio" | "gallery" | "background" | "client" | "client-cover" | "service", groupIndex?: number, clientIndex?: number) => {
    if (target === "carousel") return { apiSection: "hero" as UploadSection, progressKey: "hero", label: "Main page carousel" };
    if (target === "portfolio") return { apiSection: "home-portfolio" as UploadSection, progressKey: "home-portfolio", label: "Homepage portfolio cards" };
    if (target === "background") return { apiSection: "client-login" as UploadSection, progressKey: "client-login", label: "Client login background" };
    if (target === "client-cover") {
      const client = content.clients[clientIndex ?? 0];
      return {
        apiSection: "client-cover" as UploadSection,
        progressKey: `client-cover-${client?.id || "default"}`,
        label: `Client cover${client?.name ? `: ${client.name}` : ""}`,
      };
    }
    if (target === "gallery") {
      const group = content.gallery[groupIndex ?? 0];
      const apiSection = resolveGallerySection(group?.key || "branding");
      return {
        apiSection,
        progressKey: `gallery-${group?.key || "branding"}`,
        label: `Gallery: ${group?.title || "Category"}`,
      };
    }
    if (target === "client") {
      const client = content.clients[clientIndex ?? 0];
      return {
        apiSection: "client-gallery" as UploadSection,
        progressKey: `client-gallery-${client?.id || "default"}`,
        label: `Client gallery${client?.name ? `: ${client.name}` : ""}`,
      };
    }

    return { apiSection: "home-portfolio" as UploadSection, progressKey: "other", label: "Uploads" };
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
    const removedSources = content.homeCarousel
      .filter((item) => selectedCarouselIds[item.id])
      .map((item) => item.src);
    removeManagedImages(removedSources);

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
    const removedSources = content.gallery[groupIndex].images
      .filter((image) => selectedForGroup[image.id])
      .map((image) => image.src);
    removeManagedImages(removedSources);

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
    const removedSources = content.clients[clientIndex].images
      .filter((image) => selectedForClient[image.id])
      .map((image) => image.src);
    removeManagedImages(removedSources);

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
    removeManagedImages([content.clientLoginBackground]);
    setContent((current) => ({ ...current, clientLoginBackground: SECTION_DEFAULT_IMAGE_SRC.clientLoginBackground }));
  };

  const resetClientCoverImage = (clientIndex: number) => {
    removeManagedImages([content.clients[clientIndex].coverImage]);
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      coverImage: DEFAULT_CLIENT_COVER_IMAGE,
    };
    updateClients(next);
  };

  const addCarouselSlide = () => {
    updateHomeCarousel([...content.homeCarousel, { id: createId("carousel"), src: SECTION_DEFAULT_IMAGE_SRC.hero[0], alt: "New slide" }]);
  };

  const addPortfolioItem = () => {
    if (content.homePortfolio.length >= 3) return;
    updatePortfolio([...content.homePortfolio, { id: createId("portfolio"), title: "New portfolio item", src: SECTION_DEFAULT_IMAGE_SRC.homePortfolio[0] }]);
  };

  const addGalleryImage = (groupIndex: number) => {
    const next = [...content.gallery];
    next[groupIndex] = {
      ...next[groupIndex],
      images: [...next[groupIndex].images, { id: createId("gallery"), src: defaultGallerySrcForGroup(next[groupIndex].key), alt: "New image" }],
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
        coverImage: DEFAULT_CLIENT_COVER_IMAGE,
        images: [],
      },
    ]);
  };

  const addClientImage = (clientIndex: number) => {
    const next = [...content.clients];
    next[clientIndex] = {
      ...next[clientIndex],
      images: [...next[clientIndex].images, { id: createId("client-image"), src: "", alt: "New client image" }],
    };
    updateClients(next);
  };

  const handleClientBulkUpload = async (files: FileList | null, clientIndex: number) => {
    if (!files?.length) return;
    try {
      const items = Array.from(files);
      const totalBytes = items.reduce((sum, file) => sum + file.size, 0);
      const uploadMeta = getUploadMeta("client", undefined, clientIndex);
      const section = beginSectionProgress(uploadMeta.progressKey, uploadMeta.label, totalBytes);
      const startedAt = Date.now();
      uploadStatRef.current = { lastLoaded: 0, lastAt: startedAt, speedBps: 0 };
      setUploadProgress({ label: `${uploadMeta.label}: uploading ${items.length} image${items.length === 1 ? "" : "s"}...`, loaded: 0, total: totalBytes, startedAt, speedBps: 0, etaSeconds: null });

      const uploads: Array<{ src: string; warning?: string }> = [];
      let completedBytes = 0;
      for (const file of items) {
        const result = await uploadImageFileWithProgress(file, uploadMeta.apiSection, (loaded, total) => {
          setUploadProgress((current) => {
            if (!current) return current;
            const nextLoaded = Math.min(totalBytes, completedBytes + Math.min(loaded, total || file.size));
            const now = Date.now();
            const deltaBytes = Math.max(0, nextLoaded - uploadStatRef.current.lastLoaded);
            const deltaMs = Math.max(1, now - uploadStatRef.current.lastAt);
            const instantBps = (deltaBytes * 1000) / deltaMs;
            const smoothedBps = uploadStatRef.current.speedBps
              ? uploadStatRef.current.speedBps * 0.7 + instantBps * 0.3
              : instantBps;
            uploadStatRef.current = { lastLoaded: nextLoaded, lastAt: now, speedBps: smoothedBps };
            const remaining = Math.max(0, totalBytes - nextLoaded);
            return {
              ...current,
              loaded: nextLoaded,
              total: totalBytes,
              speedBps: smoothedBps,
              etaSeconds: smoothedBps > 0 ? remaining / smoothedBps : null,
            };
          });

          updateSectionProgress(
            uploadMeta.progressKey,
            uploadMeta.label,
            section.baseLoaded + Math.min(totalBytes, completedBytes + Math.min(loaded, total || file.size)),
            section.nextTotal
          );
        });
        uploads.push(result);
        completedBytes += file.size;
        setUploadProgress((current) => {
          if (!current) return current;
          const nextLoaded = Math.min(totalBytes, completedBytes);
          const remaining = Math.max(0, totalBytes - nextLoaded);
          const speed = uploadStatRef.current.speedBps;
          return {
            ...current,
            loaded: nextLoaded,
            total: totalBytes,
            speedBps: speed,
            etaSeconds: speed > 0 ? remaining / speed : null,
          };
        });

        updateSectionProgress(
          uploadMeta.progressKey,
          uploadMeta.label,
          section.baseLoaded + Math.min(totalBytes, completedBytes),
          section.nextTotal
        );
      }

      finishSectionProgress(uploadMeta.progressKey, uploadMeta.label, section.baseLoaded + totalBytes, section.nextTotal, items.length);

      const firstWarning = uploads.find((entry) => entry.warning)?.warning;
      if (firstWarning) {
        setMessage(firstWarning);
      }

      const next = [...content.clients];
      next[clientIndex] = {
        ...next[clientIndex],
        images: [
          ...next[clientIndex].images,
          ...uploads.map((entry, index) => ({ id: createId(`client-image-${index}`), src: entry.src, alt: `Client image ${next[clientIndex].images.length + index + 1}` })),
        ],
      };
      updateClients(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload images.");
    } finally {
      setUploadProgress(null);
    }
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
    const uploadMeta = getUploadMeta(target, groupIndex, clientIndex);
    const section = beginSectionProgress(uploadMeta.progressKey, uploadMeta.label, file.size);

    try {
      const startedAt = Date.now();
      uploadStatRef.current = { lastLoaded: 0, lastAt: startedAt, speedBps: 0 };
      setUploadProgress({ label: `${uploadMeta.label}: uploading image...`, loaded: 0, total: file.size, startedAt, speedBps: 0, etaSeconds: null });
      const uploaded = await uploadImageFileWithProgress(file, uploadMeta.apiSection, (loaded, total) => {
        setUploadProgress((current) => {
          if (!current) return current;
          const nextLoaded = Math.min(loaded, total || file.size);
          const now = Date.now();
          const deltaBytes = Math.max(0, nextLoaded - uploadStatRef.current.lastLoaded);
          const deltaMs = Math.max(1, now - uploadStatRef.current.lastAt);
          const instantBps = (deltaBytes * 1000) / deltaMs;
          const smoothedBps = uploadStatRef.current.speedBps
            ? uploadStatRef.current.speedBps * 0.7 + instantBps * 0.3
            : instantBps;
          uploadStatRef.current = { lastLoaded: nextLoaded, lastAt: now, speedBps: smoothedBps };
          const size = total || file.size;
          const remaining = Math.max(0, size - nextLoaded);
          return {
            ...current,
            loaded: nextLoaded,
            total: size,
            speedBps: smoothedBps,
            etaSeconds: smoothedBps > 0 ? remaining / smoothedBps : null,
          };
        });

        updateSectionProgress(
          uploadMeta.progressKey,
          uploadMeta.label,
          section.baseLoaded + Math.min(loaded, total || file.size),
          section.nextTotal
        );
      });

      finishSectionProgress(uploadMeta.progressKey, uploadMeta.label, section.baseLoaded + file.size, section.nextTotal, 1);

      if (uploaded.warning) {
        setMessage(uploaded.warning);
      }
      const dataUrl = uploaded.src;

      if (target === "carousel") {
        const next = [...content.homeCarousel];
        removeManagedImages([next[index ?? 0]?.src]);
        next[index ?? 0] = { ...next[index ?? 0], src: dataUrl };
        updateHomeCarousel(next);
        return;
      }
      if (target === "portfolio") {
        const next = [...content.homePortfolio];
        removeManagedImages([next[index ?? 0]?.src]);
        next[index ?? 0] = { ...next[index ?? 0], src: dataUrl };
        updatePortfolio(next);
        return;
      }
      if (target === "background") {
        removeManagedImages([content.clientLoginBackground]);
        setContent((current) => ({ ...current, clientLoginBackground: dataUrl }));
        return;
      }
      if (target === "client") {
        const next = [...content.clients];
        const previous = next[clientIndex ?? 0]?.images[index ?? 0]?.src;
        removeManagedImages([previous]);
        next[clientIndex ?? 0] = {
          ...next[clientIndex ?? 0],
          images: next[clientIndex ?? 0].images.map((img, imgIndex) => (imgIndex === index ? { ...img, src: dataUrl } : img)),
        };
        updateClients(next);
        return;
      }
      if (target === "client-cover") {
        const next = [...content.clients];
        removeManagedImages([next[clientIndex ?? 0]?.coverImage]);
        next[clientIndex ?? 0] = {
          ...next[clientIndex ?? 0],
          coverImage: dataUrl,
        };
        updateClients(next);
        return;
      }
      if (target === "gallery") {
        const next = [...content.gallery];
        const previous = next[groupIndex ?? 0]?.images[index ?? 0]?.src;
        removeManagedImages([previous]);
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to upload image.");
    } finally {
      setUploadProgress(null);
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
      {showProgressPanel && (
        <div className={`fixed bottom-5 right-5 z-50 w-full max-w-sm rounded-2xl border border-[#071018]/10 bg-white/95 p-4 shadow-xl backdrop-blur transition-opacity duration-400 ${fadeProgressPanel ? "opacity-0" : "opacity-100"}`}>
          {uploadProgress && (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#071018]">{uploadProgress.label}</p>
                <p className="text-xs font-medium text-[#4d5561]">
                  {uploadProgress.total > 0
                    ? `${Math.min(100, Math.round((uploadProgress.loaded / uploadProgress.total) * 100))}%`
                    : "0%"}
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d8cbb1]/40">
                <div
                  className="h-full rounded-full bg-[#071018] transition-all"
                  style={{
                    width: `${uploadProgress.total > 0 ? Math.min(100, Math.round((uploadProgress.loaded / uploadProgress.total) * 100)) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-[#4d5561]">
                {formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)} · {(uploadElapsedMs / 1000).toFixed(1)}s
              </p>
              <p className="mt-1 text-xs text-[#4d5561]">
                {uploadProgress.speedBps > 0 ? `${formatBytes(uploadProgress.speedBps)}/s` : "Calculating speed..."}
                {" · ETA "}
                {uploadProgress.etaSeconds === null ? "--" : formatEta(uploadProgress.etaSeconds)}
              </p>
            </>
          )}

          {Object.values(sectionProgress)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 6)
            .map((entry) => {
              const percent = entry.total > 0 ? Math.min(100, Math.round((entry.loaded / entry.total) * 100)) : 0;
              return (
                <div key={entry.key} className="mt-3 border-t border-[#d8cbb1]/35 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#071018]">{entry.label}</p>
                    <p className="text-[11px] text-[#4d5561]">{percent}%</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#d8cbb1]/40">
                    <div className="h-full rounded-full bg-[#9b7746] transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <p className="mt-1 text-[11px] text-[#4d5561]">
                    {formatBytes(entry.loaded)} / {formatBytes(entry.total)} · {entry.uploads} upload{entry.uploads === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
        </div>
      )}
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
                <PreviewImage src={slide.src} alt={slide.alt || ""} width={1200} height={440} className="h-44 w-full rounded-2xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" eager={index === 0} />
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
                  <button type="button" onClick={() => { removeManagedImages([slide.src]); updateHomeCarousel(content.homeCarousel.filter((item) => item.id !== slide.id)); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
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
                <PreviewImage src={item.src} alt={item.title} width={1200} height={400} className="h-40 w-full rounded-2xl object-cover" sizes="(max-width: 768px) 100vw, 33vw" eager={index === 0} />
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
                      <PreviewImage src={image.src} alt={image.alt || ""} width={1200} height={400} className="h-40 w-full rounded-2xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
                        <button type="button" onClick={() => { removeManagedImages([image.src]); const next = [...content.gallery]; next[groupIndex] = { ...next[groupIndex], images: next[groupIndex].images.filter((entry) => entry.id !== image.id) }; updateGallery(next); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
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
            <PreviewImage src={content.clientLoginBackground} alt="Client login background" width={1400} height={560} className="h-56 w-full object-cover" sizes="100vw" eager />
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
                    <PreviewImage src={client.coverImage || DEFAULT_CLIENT_COVER_IMAGE} alt={`${client.name} cover`} width={1200} height={400} className="h-40 w-full object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
                      <PreviewImage src={image.src} alt={image.alt || ""} width={1200} height={400} className="h-40 w-full rounded-2xl object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
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
                        <button type="button" onClick={() => { removeManagedImages([image.src]); const next = [...content.clients]; next[clientIndex] = { ...next[clientIndex], images: next[clientIndex].images.filter((entry) => entry.id !== image.id) }; updateClients(next); }} className="rounded-full border border-[#071018]/10 px-3 py-2 text-sm text-[#071018] transition hover:bg-[#071018] hover:text-white">Remove</button>
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
