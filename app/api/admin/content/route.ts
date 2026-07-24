import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getDefaultContent, type AdminPageContent } from "../../../admin/content";
import { isS3Configured, readS3ContentObject, writeS3ContentObject } from "../../../lib/server-storage";

const DATA_DIR = path.join(process.cwd(), "storage");
const CONTENT_PATH = path.join(DATA_DIR, "admin-content.json");

type ContentPayload = {
  content?: AdminPageContent;
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function normalizeContent(parsed: Partial<AdminPageContent>): AdminPageContent {
  const base = getDefaultContent();

  return {
    homeCarousel: parsed.homeCarousel ?? base.homeCarousel,
    homePortfolio: parsed.homePortfolio ?? base.homePortfolio,
    gallery: parsed.gallery ?? base.gallery,
    clientLoginBackground: parsed.clientLoginBackground ?? base.clientLoginBackground,
    clients: parsed.clients ?? base.clients,
    services: parsed.services ?? base.services,
  };
}

export async function GET() {
  try {
    const raw = isS3Configured()
      ? await readS3ContentObject()
      : await fs.readFile(CONTENT_PATH, "utf8");
    if (!raw) {
      return NextResponse.json({ content: getDefaultContent() });
    }
    const parsed = JSON.parse(raw) as Partial<AdminPageContent>;
    return NextResponse.json({ content: normalizeContent(parsed) });
  } catch {
    return NextResponse.json({ content: getDefaultContent() });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContentPayload;
    if (!body?.content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    if (isS3Configured()) {
      await writeS3ContentObject(JSON.stringify(body.content, null, 2));
    } else {
      await ensureDataDir();
      await fs.writeFile(CONTENT_PATH, JSON.stringify(body.content, null, 2), "utf8");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save content." }, { status: 500 });
  }
}
