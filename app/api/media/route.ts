import { NextRequest, NextResponse } from "next/server";
import { isS3Configured, isS3Source, presignS3Url } from "../../lib/server-storage";

// Pre-signed URL TTL: 1 hour. Browser redirect cache matches this.
const PRESIGN_TTL = 3600;

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }

  if (!isS3Configured() || !isS3Source(src)) {
    return NextResponse.json({ error: "invalid media source" }, { status: 400 });
  }

  try {
    const signedUrl = await presignS3Url(src, PRESIGN_TTL);
    if (!signedUrl) {
      return NextResponse.json({ error: "media not found" }, { status: 404 });
    }

    // Redirect browser directly to S3 — no data proxied through this server.
    // Cache for ~50 min so browsers reuse the redirect before the signed URL expires.
    return NextResponse.redirect(signedUrl, {
      status: 302,
      headers: {
        "Cache-Control": `public, max-age=3000, s-maxage=3000`,
      },
    });
  } catch {
    return NextResponse.json({ error: "unable to load media" }, { status: 500 });
  }
}
