import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isS3Configured, uploadImageToS3 } from "../../../lib/server-storage";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

function extFromType(type: string) {
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/svg+xml": ".svg",
  };

  return map[type.toLowerCase()] || ".bin";
}

async function saveLocally(buffer: Buffer, mimeType: string) {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  const ext = extFromType(mimeType);
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const outputPath = path.join(UPLOADS_DIR, fileName);

  await fs.writeFile(outputPath, buffer);

  return `/uploads/${fileName}`;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (!uploaded.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isS3Configured()) {
      try {
        const src = await uploadImageToS3(buffer, uploaded.type);
        if (!src) {
          return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
        }

        return NextResponse.json({ src });
      } catch (error) {
        const allowFallback = process.env.S3_UPLOAD_FALLBACK_TO_LOCAL !== "false";
        if (allowFallback) {
          const fallbackSrc = await saveLocally(buffer, uploaded.type);
          return NextResponse.json({
            src: fallbackSrc,
            warning: "S3 upload failed. Saved locally instead. Check AWS credentials to re-enable S3 uploads.",
          });
        }

        const message = error instanceof Error ? error.message : "Unknown S3 error.";
        return NextResponse.json({ error: `Unable to upload image to S3. ${message}` }, { status: 500 });
      }
    }

    const src = await saveLocally(buffer, uploaded.type);
    return NextResponse.json({ src });
  } catch {
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
