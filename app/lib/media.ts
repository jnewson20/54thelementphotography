export function toMediaSrc(src: string) {
  if (!src) return src;

  const isHttp = src.startsWith("http://") || src.startsWith("https://");
  const isS3Url = src.includes(".amazonaws.com/");

  if (isHttp && isS3Url) {
    return `/api/media?src=${encodeURIComponent(src)}`;
  }

  return src;
}
