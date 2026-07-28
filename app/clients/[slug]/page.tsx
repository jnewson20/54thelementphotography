import { loadContentServer } from "../../lib/content-server";
import ClientPageClient from "./ClientPageClient";

export const dynamic = "force-dynamic";

function normalizeSlugValue(value?: string) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export default async function ClientPage({ params }: { params: Promise<{ slug?: string | string[] }> }) {
  const resolvedParams = await params;
  const rawSlug = resolvedParams?.slug;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;
  const normalizedSlug = normalizeSlugValue(slug);
  const content = await loadContentServer();
  const client = content.clients.find((entry) => normalizeSlugValue(entry.username) === normalizedSlug) ?? null;

  return <ClientPageClient client={client} />;
}
