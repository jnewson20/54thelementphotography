import { NextRequest, NextResponse } from "next/server";
import { loadContentServer } from "../../lib/content-server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionToken } from "../../lib/client-session-token";
import { isPrivateMediaConfigured, presignManagedOriginal, readManagedOriginal } from "../../lib/managed-media";

function normalizeUsername(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "";

  try {
    return decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

export async function GET(request: NextRequest) {
  const imageId = request.nextUrl.searchParams.get("imageId");
  if (!imageId) {
    return NextResponse.json({ error: "imageId is required" }, { status: 400 });
  }

  const token = request.cookies.get(CLIENT_SESSION_COOKIE)?.value || request.nextUrl.searchParams.get("token");
  const session = verifyClientSessionToken(token);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const content = await loadContentServer();
  const client = content.clients.find((entry) => normalizeUsername(entry.username) === normalizeUsername(session.username));
  if (!client) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const image = client.images.find((entry) => entry.id === imageId);
  if (!image) {
    return NextResponse.json({ error: "image not found" }, { status: 404 });
  }

  const originalKey = image.originalKey;
  if (!originalKey && !image.src) {
    return NextResponse.json({ error: "original image not available" }, { status: 404 });
  }

  if (originalKey && isPrivateMediaConfigured()) {
    const signedUrl = await presignManagedOriginal(originalKey, 300);
    if (!signedUrl) {
      return NextResponse.json({ error: "Unable to create download URL." }, { status: 500 });
    }

    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  if (originalKey) {
    const media = await readManagedOriginal(originalKey);
    if (media) {
      return new NextResponse(new Uint8Array(media.body), {
        status: 200,
        headers: {
          "Content-Type": media.contentType,
          "Content-Disposition": `attachment; filename="${media.filename}"`,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }
  }

  const fallbackUrl = new URL(image.src, request.url);
  const fallbackResponse = await fetch(fallbackUrl);
  if (!fallbackResponse.ok) {
    return NextResponse.json({ error: "original image not found" }, { status: 404 });
  }

  const bytes = new Uint8Array(await fallbackResponse.arrayBuffer());
  const filename = fallbackUrl.pathname.split("/").pop() || `${imageId}.jpg`;

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": fallbackResponse.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
