import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { isS3Configured, uploadImageToS3 } from "../../../lib/server-storage";

const ASSETS_DIR = path.join(process.cwd(), "public", "assets");

type UploadSection =
  | "hero"
  | "home-portfolio"
  | "gallery-portrait"
  | "gallery-wedding"
  | "gallery-branding"
  | "client-login"
  | "client-cover"
  | "client-gallery";

const LOCAL_SECTION_DIRS: Record<Exclude<UploadSection, "client-gallery">, string[]> = {
  hero: ["hero"],
  "home-portfolio": ["home-portfolio"],
  "gallery-portrait": ["gallery", "portrait"],
  "gallery-wedding": ["gallery", "wedding"],
  "gallery-branding": ["gallery", "branding-media"],
  "client-login": ["client-login"],
  "client-cover": ["client-login"],
};

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

function toAssetSrc(filePath: string) {
  const relative = path.relative(path.join(process.cwd(), "public"), filePath);
  const normalized = relative.split(path.sep).join("/");
  return `/${normalized.split("/").map((segment) => encodeURIComponent(segment)).join("/")}`;
}

async function saveToAssetSection(buffer: Buffer, mimeType: string, section: Exclude<UploadSection, "client-gallery">, originalFileName?: string) {
  const destinationDir = path.join(ASSETS_DIR, ...LOCAL_SECTION_DIRS[section]);
  await fs.mkdir(destinationDir, { recursive: true });

  let fileName: string;
  
  if (originalFileName && originalFileName.trim()) {
    fileName = originalFileName.trim();
  } else {
    const ext = extFromType(mimeType);
    fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  }

  let outputPath = path.join(destinationDir, fileName);
  
  // Handle filename collisions by appending counter
  let counter = 1;
  const nameWithoutExt = path.parse(fileName).name;
  const ext = path.parse(fileName).ext;
  
  while (counter < 1000) {
    try {
      await fs.access(outputPath);
      // File exists, try next name
      fileName = `${nameWithoutExt}-${counter}${ext}`;
      outputPath = path.join(destinationDir, fileName);
      counter++;
    } catch {
      // File does not exist, we can use this name
      break;
    }
  }

  await fs.writeFile(outputPath, buffer);

  return toAssetSrc(outputPath);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const uploaded = formData.get("file");
    const section = formData.get("section");

    if (!(uploaded instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    if (typeof section !== "string") {
      return NextResponse.json({ error: "section is required" }, { status: 400 });
    }

    const typedSection = section as UploadSection;
    if (
      typedSection !== "hero" &&
      typedSection !== "home-portfolio" &&
      typedSection !== "gallery-portrait" &&
      typedSection !== "gallery-wedding" &&
      typedSection !== "gallery-branding" &&
      typedSection !== "client-login" &&
      typedSection !== "client-cover" &&
      typedSection !== "client-gallery"
    ) {
      return NextResponse.json({ error: "invalid section" }, { status: 400 });
    }

    if (!uploaded.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    const arrayBuffer = await uploaded.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // On serverless platforms (e.g. Vercel), local filesystem uploads are not durable.
    // Prefer S3 for every section when configured so edits persist across deployments.
    if (isS3Configured()) {
      try {
        const src = await uploadImageToS3(buffer, uploaded.type);
        if (!src) {
          return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
        }

        return NextResponse.json({ src });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown S3 error.";
        return NextResponse.json({ error: `Unable to upload image to S3. ${message}` }, { status: 500 });
      }
    }

    if (typedSection === "client-gallery") {
      return NextResponse.json({ error: "S3 must be configured for client gallery uploads." }, { status: 500 });
    }

    const src = await saveToAssetSection(buffer, uploaded.type, typedSection, uploaded.name);
    return NextResponse.json({ src });
  } catch {
    return NextResponse.json({ error: "Unable to upload image." }, { status: 500 });
  }
}
