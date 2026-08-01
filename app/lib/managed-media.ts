import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const PUBLIC_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const PUBLIC_REGION = process.env.S3_REGION;
const PUBLIC_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const PUBLIC_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const PUBLIC_ENDPOINT = process.env.S3_ENDPOINT;
const PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;
const PUBLIC_PREFIX = (process.env.S3_UPLOAD_PREFIX || "assets").replace(/^\/+|\/+$/g, "") || "assets";

const PRIVATE_BUCKET_NAME = process.env.S3_PRIVATE_BUCKET_NAME;
const PRIVATE_REGION = process.env.S3_PRIVATE_REGION || PUBLIC_REGION;
const PRIVATE_ACCESS_KEY_ID = process.env.S3_PRIVATE_ACCESS_KEY_ID || PUBLIC_ACCESS_KEY_ID;
const PRIVATE_SECRET_ACCESS_KEY = process.env.S3_PRIVATE_SECRET_ACCESS_KEY || PUBLIC_SECRET_ACCESS_KEY;
const PRIVATE_ENDPOINT = process.env.S3_PRIVATE_ENDPOINT || PUBLIC_ENDPOINT;
const PRIVATE_PREFIX = (process.env.S3_PRIVATE_PREFIX || "private-media").replace(/^\/+|\/+$/g, "") || "private-media";

const LOCAL_PUBLIC_DIR = path.join(process.cwd(), "public");
const LOCAL_PRIVATE_DIR = path.join(process.cwd(), "storage");

export type ManagedImageUploadResult = {
  src: string;
  originalKey: string;
};

export type ManagedMediaBody = {
  body: Buffer;
  contentType: string;
  filename: string;
};

function getPublicS3Client() {
  if (!PUBLIC_BUCKET_NAME || !PUBLIC_REGION || !PUBLIC_ACCESS_KEY_ID || !PUBLIC_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: PUBLIC_REGION,
    endpoint: PUBLIC_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: PUBLIC_ACCESS_KEY_ID,
      secretAccessKey: PUBLIC_SECRET_ACCESS_KEY,
    },
  });
}

function getPrivateS3Client() {
  if (!PRIVATE_BUCKET_NAME || !PRIVATE_REGION || !PRIVATE_ACCESS_KEY_ID || !PRIVATE_SECRET_ACCESS_KEY) {
    return null;
  }

  return new S3Client({
    region: PRIVATE_REGION,
    endpoint: PRIVATE_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: PRIVATE_ACCESS_KEY_ID,
      secretAccessKey: PRIVATE_SECRET_ACCESS_KEY,
    },
  });
}

function sanitizeFileStem(value?: string) {
  const raw = (value || "").trim();
  const base = raw.replace(/\.[^.]+$/, "").trim();
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return cleaned || `image-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

function buildFileName(originalFileName?: string) {
  const stem = sanitizeFileStem(originalFileName);
  const suffix = crypto.randomBytes(4).toString("hex");
  return `${stem}-${suffix}`;
}

function buildManagedKey(prefix: string, sectionPath: string[], fileName: string) {
  return [prefix, ...sectionPath, fileName].join("/");
}

function buildPublicUrl(key: string) {
  const base = (PUBLIC_BASE_URL || getDefaultPublicBaseUrl() || "").replace(/\/+$/, "");
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL is required when using custom S3 endpoints.");
  }

  return `${base}/${key}`;
}

function getDefaultPublicBaseUrl() {
  if (!PUBLIC_BUCKET_NAME || !PUBLIC_REGION) return null;
  return `https://${PUBLIC_BUCKET_NAME}.s3.${PUBLIC_REGION}.amazonaws.com`;
}

function streamToBuffer(body: unknown) {
  if (!body) return Promise.resolve(Buffer.from(""));

  const readable = body as NodeJS.ReadableStream & { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof readable?.transformToByteArray === "function") {
    return readable.transformToByteArray().then((bytes) => Buffer.from(bytes));
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    readable.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

async function buildPreviewAndOriginal(buffer: Buffer) {
  const image = sharp(buffer).rotate();
  const original = await image.clone().jpeg({ quality: 95, mozjpeg: true }).toBuffer();
  const preview = await image
    .clone()
    .resize({ width: 1600, fit: "inside", withoutEnlargement: true })
    .avif({ quality: 30, effort: 8 })
    .toBuffer();

  return { original, preview };
}

async function ensureLocalDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function writeLocalFile(filePath: string, buffer: Buffer) {
  await ensureLocalDirectory(filePath);
  await fs.writeFile(filePath, buffer);
}

function sectionKeyPath(sectionPath: string[]) {
  return sectionPath.map((segment) => encodeURIComponent(segment)).join("/");
}

export function isPrivateMediaConfigured() {
  return Boolean(PRIVATE_BUCKET_NAME && PRIVATE_REGION && PRIVATE_ACCESS_KEY_ID && PRIVATE_SECRET_ACCESS_KEY);
}

export async function uploadManagedImage(input: {
  buffer: Buffer;
  originalFileName?: string;
  sectionPath: string[];
}) : Promise<ManagedImageUploadResult> {
  const { original, preview } = await buildPreviewAndOriginal(input.buffer);
  const fileName = buildFileName(input.originalFileName);
  const previewFileName = `${fileName}.avif`;
  const originalFileName = `${fileName}.jpg`;
  const publicKey = buildManagedKey(PUBLIC_PREFIX, input.sectionPath, previewFileName);
  const privateKey = buildManagedKey(PRIVATE_PREFIX, input.sectionPath, originalFileName);

  const publicClient = getPublicS3Client();
  if (publicClient) {
    await publicClient.send(
      new PutObjectCommand({
        Bucket: PUBLIC_BUCKET_NAME,
        Key: publicKey,
        Body: preview,
        ContentType: "image/avif",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
  } else {
    const localPublicPath = path.join(LOCAL_PUBLIC_DIR, publicKey);
    await writeLocalFile(localPublicPath, preview);
  }

  const privateClient = getPrivateS3Client();
  if (privateClient) {
    await privateClient.send(
      new PutObjectCommand({
        Bucket: PRIVATE_BUCKET_NAME,
        Key: privateKey,
        Body: original,
        ContentType: "image/jpeg",
        ContentDisposition: `attachment; filename="${originalFileName}"`,
        CacheControl: "private, max-age=31536000, immutable",
      })
    );
  } else {
    const localPrivatePath = path.join(LOCAL_PRIVATE_DIR, privateKey);
    await writeLocalFile(localPrivatePath, original);
  }

  return {
    src: publicClient ? buildPublicUrl(publicKey) : `/${publicKey}`,
    originalKey: privateKey,
  };
}

export async function deleteManagedImage(src?: string, originalKey?: string) {
  if (src) {
    try {
      const url = new URL(src);
      const publicClient = getPublicS3Client();
      if (publicClient) {
        const key = url.pathname.replace(/^\/+/, "");
        await publicClient.send(
          new DeleteObjectCommand({
            Bucket: PUBLIC_BUCKET_NAME,
            Key: key,
          })
        ).catch(() => null);
      } else if (url.pathname.startsWith("/assets/")) {
        const localPath = path.join(LOCAL_PUBLIC_DIR, decodeURIComponent(url.pathname.replace(/^\/+/, "")));
        await fs.unlink(localPath).catch(() => null);
      }
    } catch {
      if (src.startsWith("/assets/")) {
        const localPath = path.join(LOCAL_PUBLIC_DIR, decodeURIComponent(src.replace(/^\/+/, "")));
        await fs.unlink(localPath).catch(() => null);
      }
    }
  }

  if (originalKey) {
    const privateClient = getPrivateS3Client();
    if (privateClient) {
      await privateClient.send(
        new DeleteObjectCommand({
          Bucket: PRIVATE_BUCKET_NAME,
          Key: originalKey,
        })
      ).catch(() => null);
      return;
    }

    const localPrivatePath = path.join(LOCAL_PRIVATE_DIR, originalKey);
    await fs.unlink(localPrivatePath).catch(() => null);
  }
}

export async function presignManagedOriginal(originalKey: string, expiresIn = 3600) {
  const privateClient = getPrivateS3Client();
  if (!privateClient) return null;

  return getSignedUrl(
    privateClient,
    new GetObjectCommand({ Bucket: PRIVATE_BUCKET_NAME, Key: originalKey }),
    { expiresIn }
  );
}

export async function readManagedOriginal(originalKey: string): Promise<ManagedMediaBody | null> {
  const privateClient = getPrivateS3Client();
  if (privateClient) {
    const response = await privateClient.send(
      new GetObjectCommand({ Bucket: PRIVATE_BUCKET_NAME, Key: originalKey })
    );

    const body = await streamToBuffer(response.Body);
    return {
      body,
      contentType: response.ContentType || "image/jpeg",
      filename: path.basename(originalKey),
    };
  }

  const localPath = path.join(LOCAL_PRIVATE_DIR, originalKey);
  try {
    const body = await fs.readFile(localPath);
    return {
      body,
      contentType: "image/jpeg",
      filename: path.basename(originalKey),
    };
  } catch {
    return null;
  }
}

export function isManagedOriginalKey(key?: string) {
  return Boolean(key && (key.startsWith(`${PRIVATE_PREFIX}/`) || key.endsWith(".jpg")));
}

export function sectionSegmentsFromKey(key: string) {
  const cleaned = key.replace(/^\/+/, "");
  const parts = cleaned.split("/");
  if (parts[0] === PRIVATE_PREFIX || parts[0] === PUBLIC_PREFIX) {
    return parts.slice(1, -1);
  }

  return parts.slice(0, -1);
}

export function sectionKeyFromSegments(sectionPath: string[]) {
  return sectionKeyPath(sectionPath);
}
