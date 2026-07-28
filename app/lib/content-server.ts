import fs from "fs/promises";
import path from "path";
import { getDefaultContent, type AdminClient, type AdminPageContent, type AdminPortfolioItem } from "../admin/content";
import { isS3Configured, readS3ContentObject, writeS3ContentObject } from "./server-storage";

const DATA_DIR = path.join(process.cwd(), "storage");
const CONTENT_PATH = path.join(DATA_DIR, "admin-content.json");

function sanitizePortfolio(
  incoming: Partial<AdminPortfolioItem>[] | undefined,
  fallback: AdminPortfolioItem[]
): AdminPortfolioItem[] {
  const next = Array.isArray(incoming) ? incoming.slice(0, 3) : [];

  return [0, 1, 2].map((index) => {
    const candidate = next[index];
    const base = fallback[index];

    return {
      id: candidate?.id || base.id,
      title: candidate?.title || base.title,
      src: typeof candidate?.src === "string" && candidate.src.trim() ? candidate.src : base.src,
    };
  });
}

function sanitizeClients(incoming: Partial<AdminClient>[] | undefined, fallback: AdminClient[]): AdminClient[] {
  const next = Array.isArray(incoming) ? incoming : fallback;

  return next.map((client, index) => {
    const base = fallback[index] ?? fallback[0];
    return {
      id: client?.id || base.id,
      name: client?.name || base.name,
      username: client?.username || base.username,
      password: client?.password || base.password,
      galleryTitle: client?.galleryTitle || base.galleryTitle || client?.name || base.name,
      coverImage: client?.coverImage || base.coverImage || getDefaultContent().clientLoginBackground,
      images: Array.isArray(client?.images) ? client.images : Array.isArray(base.images) ? base.images : [],
    };
  });
}

function normalizeContent(parsed: Partial<AdminPageContent>): AdminPageContent {
  const base = getDefaultContent();

  return {
    homeCarousel: parsed.homeCarousel ?? base.homeCarousel,
    homePortfolio: sanitizePortfolio(parsed.homePortfolio as Partial<AdminPortfolioItem>[] | undefined, base.homePortfolio),
    gallery: parsed.gallery ?? base.gallery,
    clientLoginBackground: parsed.clientLoginBackground ?? base.clientLoginBackground,
    clients: sanitizeClients(parsed.clients as Partial<AdminClient>[] | undefined, base.clients),
    services: parsed.services ?? base.services,
  };
}

export async function loadContentServer(): Promise<AdminPageContent> {
  if (isS3Configured()) {
    try {
      const raw = await readS3ContentObject();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AdminPageContent>;
        return normalizeContent(parsed);
      }
    } catch {
      // Fall through to local file fallback.
    }
  }

  try {
    const raw = await fs.readFile(CONTENT_PATH, "utf8");
    if (!raw) {
      return getDefaultContent();
    }

    const parsed = JSON.parse(raw) as Partial<AdminPageContent>;
    return normalizeContent(parsed);
  } catch {
    return getDefaultContent();
  }
}

export async function saveContentServer(content: AdminPageContent): Promise<void> {
  const serialized = JSON.stringify(content, null, 2);

  if (isS3Configured()) {
    try {
      await writeS3ContentObject(serialized);
    } catch {
      // Continue to local write fallback.
    }
  }

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(CONTENT_PATH, serialized, "utf8");
  } catch {
    // Ignore local write failures on read-only deployments.
  }
}