import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { deleteS3Source, isS3Configured, isS3Source } from "../../../lib/server-storage";

type DeletePayload = {
  src?: string;
};

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function resolveUploadPath(src: string) {
  if (!src.startsWith("/uploads/")) {
    return null;
  }

  const fileName = path.basename(src);
  const resolved = path.join(UPLOADS_DIR, fileName);
  return resolved;
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

    const targetPath = resolveUploadPath(src);
    if (!targetPath) {
      return NextResponse.json({ error: "invalid src" }, { status: 400 });
    }

    await fs.unlink(targetPath).catch(() => null);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to remove image." }, { status: 500 });
  }
}
