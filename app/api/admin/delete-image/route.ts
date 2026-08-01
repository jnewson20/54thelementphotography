import { NextResponse } from "next/server";
import { loadContentServer } from "../../../lib/content-server";
import { deleteManagedImage } from "../../../lib/managed-media";

type DeletePayload = {
  src?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DeletePayload;
    const src = body?.src;

    if (!src) {
      return NextResponse.json({ error: "src is required" }, { status: 400 });
    }

    const content = await loadContentServer();
    const originalKey =
      content.homeCarousel.find((image) => image.src === src)?.originalKey ||
      content.homePortfolio.find((item) => item.src === src)?.originalKey ||
      content.gallery.flatMap((group) => group.images).find((image) => image.src === src)?.originalKey ||
      content.clients.flatMap((client) => client.images).find((image) => image.src === src)?.originalKey ||
      content.clients.find((client) => client.coverImage === src)?.coverImageOriginalKey;

    await deleteManagedImage(src, typeof originalKey === "string" && originalKey !== src ? originalKey : undefined);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to remove image." }, { status: 500 });
  }
}
