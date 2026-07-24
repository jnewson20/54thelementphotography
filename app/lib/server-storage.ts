import crypto from "crypto";
import { Readable } from "stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_REGION = process.env.S3_REGION;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL;
const S3_CONTENT_KEY = process.env.S3_CONTENT_KEY || "admin-content.json";
const S3_UPLOAD_PREFIX = (process.env.S3_UPLOAD_PREFIX || "uploads").replace(/^\/+|\/+$/g, "");

function getS3Client() {
  if (!isS3Configured()) {
    return null;
  }

  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: S3_ACCESS_KEY_ID as string,
      secretAccessKey: S3_SECRET_ACCESS_KEY as string,
    },
  });
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

async function streamToBuffer(body: unknown) {
  if (!body) return Buffer.from("");

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  return Buffer.from("");
}

function getDefaultS3PublicBaseUrl() {
  if (!S3_BUCKET_NAME || !S3_REGION) return null;
  return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com`;
}

function getS3PublicBaseUrl() {
  return (S3_PUBLIC_BASE_URL || getDefaultS3PublicBaseUrl() || "").replace(/\/+$/, "");
}

function buildS3Url(key: string) {
  const base = getS3PublicBaseUrl();
  if (!base) {
    throw new Error("S3_PUBLIC_BASE_URL is required when using custom S3 endpoints.");
  }

  return `${base}/${key}`;
}

function parseS3KeyFromUrl(src: string) {
  try {
    const url = new URL(src);
    const pathname = url.pathname.replace(/^\/+/, "");

    if (!pathname) return null;

    if (pathname === S3_CONTENT_KEY || pathname.startsWith(`${S3_UPLOAD_PREFIX}/`)) {
      return pathname;
    }

    if (S3_BUCKET_NAME && pathname.startsWith(`${S3_BUCKET_NAME}/`)) {
      const withoutBucket = pathname.slice(S3_BUCKET_NAME.length + 1);
      if (withoutBucket === S3_CONTENT_KEY || withoutBucket.startsWith(`${S3_UPLOAD_PREFIX}/`)) {
        return withoutBucket;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function isS3Configured() {
  return Boolean(S3_BUCKET_NAME && S3_REGION && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

export function isS3Source(src: string) {
  if (!src.startsWith("http://") && !src.startsWith("https://")) {
    return false;
  }

  return parseS3KeyFromUrl(src) !== null;
}

export async function readS3ContentObject() {
  const client = getS3Client();
  if (!client) return null;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: S3_CONTENT_KEY,
    })
  );

  const body = await streamToBuffer(response.Body);
  return body.toString("utf8");
}

export async function writeS3ContentObject(content: string) {
  const client = getS3Client();
  if (!client) return false;

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: S3_CONTENT_KEY,
      Body: content,
      ContentType: "application/json",
      CacheControl: "no-store",
    })
  );

  return true;
}

export async function uploadImageToS3(fileBuffer: Buffer, mimeType: string) {
  const client = getS3Client();
  if (!client) return null;

  const extension = extensionFromMimeType(mimeType);
  const objectKey = `${S3_UPLOAD_PREFIX}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return buildS3Url(objectKey);
}

export async function deleteS3Source(src: string) {
  const client = getS3Client();
  if (!client) return false;

  const key = parseS3KeyFromUrl(src);
  if (!key || key === S3_CONTENT_KEY) return false;

  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    })
  );

  return true;
}

export async function presignS3Url(src: string, expiresIn = 3600) {
  const client = getS3Client();
  if (!client) return null;

  const key = parseS3KeyFromUrl(src);
  if (!key) return null;

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: S3_BUCKET_NAME, Key: key }),
    { expiresIn }
  );

  return url;
}

export async function readS3Source(src: string) {
  const client = getS3Client();
  if (!client) return null;

  const key = parseS3KeyFromUrl(src);
  if (!key) return null;

  const response = await client.send(
    new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    })
  );

  const body = await streamToBuffer(response.Body);
  const contentType = response.ContentType || "application/octet-stream";

  return {
    body,
    contentType,
    key,
  };
}
