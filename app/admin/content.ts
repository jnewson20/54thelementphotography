export type AdminImage = {
  id: string;
  src: string;
  alt: string;
};

export type AdminPortfolioItem = {
  id: string;
  title: string;
  src: string;
};

export type AdminServicePackage = {
  id: string;
  title: string;
  price: string;
  duration: string;
  bullets: string[];
  note: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
};

export type AdminServiceGroup = {
  key: string;
  title: string;
  description: string;
  packages: AdminServicePackage[];
};

export type AdminClient = {
  id: string;
  name: string;
  username: string;
  password: string;
  galleryTitle: string;
  coverImage: string;
  images: AdminImage[];
};

export type AdminPageContent = {
  homeCarousel: AdminImage[];
  homePortfolio: AdminPortfolioItem[];
  gallery: Array<{
    key: string;
    title: string;
    images: AdminImage[];
  }>;
  clientLoginBackground: string;
  clients: AdminClient[];
  services: AdminServiceGroup[];
};

const STORAGE_KEY = "54th-element-admin-content-v1";
const CLIENT_AUTH_STORAGE_KEY = "54th-element-admin-client-auth-v1";
const CONTENT_API_PATH = "/api/admin/content";

type ClientAuthSnapshot = {
  id: string;
  name: string;
  username: string;
  password: string;
  galleryTitle: string;
  coverImage: string;
};

function isValidImageSrc(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (!src.trim()) return false;
  return src.startsWith("/") || src.startsWith("data:image/") || src.startsWith("https://") || src.startsWith("http://");
}

function sanitizePortfolio(
  incoming: Partial<AdminPortfolioItem>[] | undefined,
  fallback: AdminPortfolioItem[]
): AdminPortfolioItem[] {
  const next = Array.isArray(incoming) ? incoming.slice(0, 3) : [];

  const safe = [0, 1, 2].map((index) => {
    const candidate = next[index];
    const base = fallback[index];

    return {
      id: candidate?.id || base.id,
      title: candidate?.title || base.title,
      src: isValidImageSrc(candidate?.src) ? candidate.src : base.src,
    };
  });

  return safe;
}

function toClientAuthSnapshot(clients: AdminClient[]): ClientAuthSnapshot[] {
  return clients.map((client) => ({
    id: client.id,
    name: client.name,
    username: client.username,
    password: client.password,
    galleryTitle: client.galleryTitle,
    coverImage: client.coverImage || "/assets/about-1.jpg",
  }));
}

function readClientAuthSnapshot(): ClientAuthSnapshot[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(CLIENT_AUTH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClientAuthSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeClientsWithAuth(baseClients: AdminClient[], authClients: ClientAuthSnapshot[]): AdminClient[] {
  if (!authClients.length) return baseClients;

  const byId = new Map(baseClients.map((client) => [client.id, client]));
  const byUsername = new Map(baseClients.map((client) => [client.username, client]));

  const merged: AdminClient[] = [...baseClients];

  for (const authClient of authClients) {
    const existing = byId.get(authClient.id) ?? byUsername.get(authClient.username);

    if (existing) {
      const index = merged.findIndex((entry) => entry.id === existing.id);
      if (index !== -1) {
        merged[index] = {
          ...existing,
          id: authClient.id || existing.id,
          name: authClient.name || existing.name,
          username: authClient.username || existing.username,
          password: authClient.password || existing.password,
          galleryTitle: authClient.galleryTitle || existing.galleryTitle,
          coverImage: authClient.coverImage || existing.coverImage,
        };
      }
    } else {
      merged.push({
        id: authClient.id,
        name: authClient.name,
        username: authClient.username,
        password: authClient.password,
        galleryTitle: authClient.galleryTitle || authClient.name,
        coverImage: authClient.coverImage || "/assets/about-1.jpg",
        images: [],
      });
    }
  }

  return merged;
}

export function saveClientAuthSnapshot(clients: AdminClient[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CLIENT_AUTH_STORAGE_KEY, JSON.stringify(toClientAuthSnapshot(clients)));
  } catch {
    // Ignore, this is a best-effort fallback for client login reliability.
  }
}

async function compressDataUrl(src: string, options: { maxWidth?: number; quality?: number } = {}) {
  if (typeof window === "undefined" || !src.startsWith("data:image/")) {
    return src;
  }

  if (src.startsWith("data:image/svg+xml")) {
    return src;
  }

  const maxWidth = options.maxWidth ?? 1400;
  const quality = options.quality ?? 0.8;

  let image: HTMLImageElement;
  try {
    image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to process image"));
      img.src = src;
    });
  } catch {
    return src;
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.floor(image.naturalWidth * scale));
  const height = Math.max(1, Math.floor(image.naturalHeight * scale));

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return src;
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

async function normalizeContentForStorage(content: AdminPageContent, options: { maxWidth?: number; quality?: number } = {}) {
  const base = getDefaultContent();
  const normalizedPortfolio = sanitizePortfolio(content.homePortfolio, base.homePortfolio);

  const [homeCarousel, homePortfolio, gallery, clients, services] = await Promise.all([
    Promise.all(content.homeCarousel.map(async (image) => ({ ...image, src: await compressDataUrl(image.src, options) }))),
    Promise.all(normalizedPortfolio.map(async (item) => ({ ...item, src: await compressDataUrl(item.src, options) }))),
    Promise.all(content.gallery.map(async (group) => ({ ...group, images: await Promise.all(group.images.map(async (image) => ({ ...image, src: await compressDataUrl(image.src, options) }))) }))),
    Promise.all(
      content.clients.map(async (client) => ({
        ...client,
        // Preserve original quality for client delivery assets.
        coverImage: client.coverImage || "/assets/about-1.jpg",
        images: client.images.map((image) => ({ ...image })),
      }))
    ),
    Promise.all(content.services.map(async (group) => ({ ...group, packages: group.packages }))),
  ]);

  return {
    ...content,
    homeCarousel,
    homePortfolio,
    gallery,
    clients,
    services,
    clientLoginBackground: await compressDataUrl(content.clientLoginBackground, options),
  };
}

export async function compressImageDataUrl(src: string) {
  return compressDataUrl(src);
}

export function getDefaultContent(): AdminPageContent {
  return {
    homeCarousel: [
      { id: "hero-1", src: "/assets/about-1.jpg", alt: "Hero 1" },
      { id: "hero-2", src: "/assets/about-1.jpg", alt: "Hero 2" },
      { id: "hero-3", src: "/assets/about-1.jpg", alt: "Hero 3" },
    ],
    homePortfolio: [
      { id: "p-1", title: "Editorial Series", src: "/assets/about-1.jpg" },
      { id: "p-2", title: "Landscape Study", src: "/assets/about-1.jpg" },
      { id: "p-3", title: "Portrait Set", src: "/assets/about-1.jpg" },
    ],
    gallery: [
      {
        key: "portraits",
        title: "Portraits",
        images: [
          { id: "portrait-1", src: "/assets/about-1.jpg", alt: "Portrait 1" },
          { id: "portrait-2", src: "/assets/about-1.jpg", alt: "Portrait 2" },
          { id: "portrait-3", src: "/assets/about-1.jpg", alt: "Portrait 3" },
        ],
      },
      {
        key: "wedding",
        title: "Wedding",
        images: [
          { id: "wedding-1", src: "/assets/about-1.jpg", alt: "Wedding 1" },
          { id: "wedding-2", src: "/assets/about-1.jpg", alt: "Wedding 2" },
          { id: "wedding-3", src: "/assets/about-1.jpg", alt: "Wedding 3" },
        ],
      },
      {
        key: "branding",
        title: "Branding",
        images: [
          { id: "branding-1", src: "/assets/about-1.jpg", alt: "Branding 1" },
          { id: "branding-2", src: "/assets/about-1.jpg", alt: "Branding 2" },
          { id: "branding-3", src: "/assets/about-1.jpg", alt: "Branding 3" },
        ],
      },
    ],
    clientLoginBackground: "/assets/about-1.jpg",
    clients: [
      {
        id: "client-sample",
        name: "Sample Client",
        username: "client-a",
        password: "password123",
        galleryTitle: "Sample Client Gallery",
        coverImage: "/assets/about-1.jpg",
        images: [
          { id: "client-1", src: "/assets/about-1.jpg", alt: "Client sample 1" },
          { id: "client-2", src: "/assets/about-1.jpg", alt: "Client sample 2" },
        ],
      },
    ],
    services: [
      {
        key: "portraits",
        title: "Portraits",
        description: "Studio and environmental portrait sessions tailored to your style.",
        packages: [
          {
            id: "portrait-basic",
            title: "Express",
            price: "$150",
            duration: "30 min",
            bullets: ["1 location", "5 edited images", "Online gallery"],
            note: "",
            primaryButtonText: "Book",
            primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
            secondaryButtonText: "Inquire",
            secondaryButtonHref: "/#contact",
          },
          {
            id: "portrait-plus",
            title: "Leather",
            price: "$250",
            duration: "60 min",
            bullets: ["2 locations", "15 edited images", "Print release", "Styling advice"],
            note: "",
            primaryButtonText: "Book",
            primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
            secondaryButtonText: "Inquire",
            secondaryButtonHref: "/#contact",
          },
        ],
      },
      {
        key: "wedding",
        title: "Wedding",
        description: "Coverage and storytelling for your full wedding day or intimate elopements.",
        packages: [
          {
            id: "wedding-elopement",
            title: "Elopement",
            price: "$1,200",
            duration: "Up to 4 hours",
            bullets: ["Full coverage of ceremony & portraits", "200+ images (edited)", "Online gallery"],
            note: "",
            primaryButtonText: "Book",
            primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
            secondaryButtonText: "Inquire",
            secondaryButtonHref: "/#contact",
          },
        ],
      },
      {
        key: "branding",
        title: "Branding",
        description: "Creative brand sessions for founders, products, and campaigns.",
        packages: [
          {
            id: "branding-starter",
            title: "Starter",
            price: "$600",
            duration: "1 hour",
            bullets: ["10 styled images", "1 background", "Commercial usage"],
            note: "",
            primaryButtonText: "Book",
            primaryButtonHref: "https://54thelementphotography.pixieset.com/booking/",
            secondaryButtonText: "Inquire",
            secondaryButtonHref: "/#contact",
          },
        ],
      },
    ],
  };
}

export function loadContent(): AdminPageContent {
  if (typeof window === "undefined") return getDefaultContent();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultContent();
    const parsed = JSON.parse(raw) as Partial<AdminPageContent>;
    const base = getDefaultContent();
    const baseClients =
      parsed.clients?.map((client, index) => ({
        ...client,
        coverImage:
          (client as Partial<AdminClient>).coverImage ||
          base.clients[index]?.coverImage ||
          "/assets/about-1.jpg",
      })) ?? base.clients;
    const authClients = readClientAuthSnapshot();

    return {
      homeCarousel: parsed.homeCarousel ?? base.homeCarousel,
      homePortfolio: sanitizePortfolio(parsed.homePortfolio as Partial<AdminPortfolioItem>[] | undefined, base.homePortfolio),
      gallery: parsed.gallery ?? base.gallery,
      clientLoginBackground: parsed.clientLoginBackground ?? base.clientLoginBackground,
      clients: mergeClientsWithAuth(baseClients, authClients),
      services: parsed.services ?? base.services,
    };
  } catch {
    return getDefaultContent();
  }
}

export async function saveContent(content: AdminPageContent) {
  if (typeof window === "undefined") return;

  // Keep auth snapshot local for instant login reliability.
  saveClientAuthSnapshot(content.clients);

  const response = await fetch(CONTENT_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || "Unable to save content.");
  }

  // Maintain local fallback copy for offline convenience.
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
  } catch {
    // Ignore local fallback failures.
  }
}

export async function fetchContent(): Promise<AdminPageContent> {
  if (typeof window === "undefined") {
    return getDefaultContent();
  }

  try {
    const response = await fetch(CONTENT_API_PATH, { cache: "no-store" });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.content) {
      throw new Error(payload?.error || "Unable to load content.");
    }

    const parsed = payload.content as Partial<AdminPageContent>;
    const base = getDefaultContent();
    const baseClients =
      parsed.clients?.map((client, index) => ({
        ...client,
        coverImage:
          (client as Partial<AdminClient>).coverImage ||
          base.clients[index]?.coverImage ||
          "/assets/about-1.jpg",
      })) ?? base.clients;

    const normalized: AdminPageContent = {
      homeCarousel: parsed.homeCarousel ?? base.homeCarousel,
      homePortfolio: sanitizePortfolio(parsed.homePortfolio as Partial<AdminPortfolioItem>[] | undefined, base.homePortfolio),
      gallery: parsed.gallery ?? base.gallery,
      clientLoginBackground: parsed.clientLoginBackground ?? base.clientLoginBackground,
      clients: baseClients,
      services: parsed.services ?? base.services,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore local cache failures.
    }

    return normalized;
  } catch {
    return loadContent();
  }
}
