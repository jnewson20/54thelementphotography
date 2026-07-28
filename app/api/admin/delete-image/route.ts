import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { deleteS3Source, isS3Configured, isS3Source } from "../../../lib/server-storage";

type DeletePayload = {
  src?: string;
};

const PUBLIC_DIR = path.join(process.cwd(), "public");
const MANAGED_ASSET_PREFIXES = [
  "/assets/hero/",
  "/assets/home-portfolio/",
  "/assets/home%20portfolio/",
  "/assets/home portfolio/",
  "/assets/gallery/portrait/",
  "/assets/gallery/wedding/",
  "/assets/gallery/branding-media/",
  "/assets/gallery/branding%3Amedia/",
  "/assets/gallery/branding:media/",
  "/assets/client-login/",
  "/assets/client%20login/",
  "/assets/client login/",
];

function resolveManagedLocalPath(src: string) {
  if (!src.startsWith("/")) {
    return null;
  }

  const normalized = src.trim();
  const isManagedAsset = MANAGED_ASSET_PREFIXES.some((prefix) => normalized.startsWith(prefix));
  if (!isManagedAsset) {
    return null;
  }

  let decodedPath = normalized;
  try {
    decodedPath = decodeURIComponent(normalized);
  } catch {
    return null;
  }
  const absolutePath = path.resolve(PUBLIC_DIR, `.${decodedPath}`);
  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return absolutePath;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeletePayload;
    const src = body?.src;

    if (!src) {
      return NextResponse.json({ error: "src is required" }, { status: 400 });
    }

    if (isS3Configured() && isS3Source(src)) {
      await deleteS3Source(src).catch(() => null);
      return NextResponse.json({ ok: true });
    }

    const targetPath = resolveManagedLocalPath(src);
    if (!targetPath) {
      return NextResponse.json({ error: "invalid src" }, { status: 400 });
    }

    await fs.unlink(targetPath).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to remove image." }, { status: 500 });
  }
}
