import { NextRequest, NextResponse } from "next/server";
import { isS3Configured, isS3Source, readS3Source } from "../../lib/server-storage";

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src");
  if (!src) {
    return NextResponse.json({ error: "src is required" }, { status: 400 });
  }

  if (!isS3Configured() || !isS3Source(src)) {
    return NextResponse.json({ error: "invalid media source" }, { status: 400 });
  }

  try {
    const file = await readS3Source(src);
    if (!file) {
      return NextResponse.json({ error: "media not found" }, { status: 404 });
    }

    return new NextResponse(file.body, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "unable to load media" }, { status: 500 });
  }
}
