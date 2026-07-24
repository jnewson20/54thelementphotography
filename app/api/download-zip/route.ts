import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

type DownloadZipRequest = { files: string[] };

function validateMockSession(req: NextRequest) {
  return { ok: true };
}

function dataUrlToBuffer(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  try {
    const buffer = Buffer.from(base64, "base64");
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

function extensionFromMimeType(mimeType: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/svg+xml": "svg",
  };

  return map[mimeType.toLowerCase()] || "bin";
}

function extensionFromPathname(pathname: string) {
  const ext = path.extname(pathname).replace(".", "").toLowerCase();
  if (!ext) return "bin";
  return ext;
}

export async function POST(req: NextRequest) {
  const validation = validateMockSession(req);
  if (!validation.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray((body as DownloadZipRequest).files)) {
    return NextResponse.json({ error: "files array required" }, { status: 400 });
  }

  const requestedFiles = (body as DownloadZipRequest).files.filter(
    (file): file is string => typeof file === "string"
  );

  if (requestedFiles.length === 0) {
    return NextResponse.json({ error: "no files selected" }, { status: 400 });
  }

  const publicDir = path.join(process.cwd(), "public");
  const zip = new JSZip();
  const usedNames = new Set<string>();

  function uniqueName(name: string) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }

    const extIndex = name.lastIndexOf(".");
    const base = extIndex > 0 ? name.slice(0, extIndex) : name;
    const ext = extIndex > 0 ? name.slice(extIndex) : "";
    let counter = 2;
    let next = `${base}-${counter}${ext}`;
    while (usedNames.has(next)) {
      counter += 1;
      next = `${base}-${counter}${ext}`;
    }
    usedNames.add(next);
    return next;
  }

  for (let index = 0; index < requestedFiles.length; index += 1) {
    const file = requestedFiles[index];

    if (file.startsWith("/assets/")) {
      const filePath = path.join(publicDir, file.replace(/^\//, ""));
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ error: `file not found: ${file}` }, { status: 404 });
      }

      const fileData = fs.readFileSync(filePath);
      zip.file(uniqueName(path.basename(filePath)), fileData);
      continue;
    }

    if (file.startsWith("data:image/")) {
      const decoded = dataUrlToBuffer(file);
      if (!decoded) {
        return NextResponse.json({ error: "invalid data image" }, { status: 400 });
      }

      const extension = extensionFromMimeType(decoded.mimeType);
      zip.file(uniqueName(`client-image-${index + 1}.${extension}`), decoded.buffer);
      continue;
    }

    if (file.startsWith("https://") || file.startsWith("http://")) {
      const remoteResponse = await fetch(file);
      if (!remoteResponse.ok) {
        return NextResponse.json({ error: `file not found: ${file}` }, { status: 404 });
      }

      const bytes = Buffer.from(await remoteResponse.arrayBuffer());
      const mimeType = remoteResponse.headers.get("content-type") || "application/octet-stream";
      const url = new URL(file);
      const ext = mimeType.startsWith("image/")
        ? extensionFromMimeType(mimeType)
        : extensionFromPathname(url.pathname);
      zip.file(uniqueName(`client-image-${index + 1}.${ext}`), bytes);
      continue;
    }

    return NextResponse.json({ error: "invalid file path" }, { status: 400 });
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const zipData = new Uint8Array(zipBuffer);

  return new NextResponse(zipData, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(zipData.length),
      "Content-Disposition": `attachment; filename="selected-images.zip"`,
    },
  });
}
