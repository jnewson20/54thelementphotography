import { NextResponse } from "next/server";
import { getDefaultContent, type AdminPageContent } from "../../../admin/content";
import { loadContentServer, saveContentServer } from "../../../lib/content-server";

type ContentPayload = {
  content?: AdminPageContent;
};

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
    return NextResponse.json({ content: await loadContentServer() });
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

    await saveContentServer(body.content);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to save content." }, { status: 500 });
  }
}
