export function toMediaSrc(src: string) {
  // S3 bucket is public — return the URL directly for maximum performance.
  // The /api/media proxy is kept as a fallback path but no longer needed for delivery.
  return src || "";
}
