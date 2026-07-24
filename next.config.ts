import type { NextConfig } from "next";

function getRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
  const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
  const s3Bucket = process.env.S3_BUCKET_NAME;
  const s3Region = process.env.S3_REGION;

  const addPatternFromUrl = (value?: string) => {
    if (!value) return;

    try {
      const parsed = new URL(value);
      patterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port || "",
      });
    } catch {
      // Ignore malformed URLs and keep remaining patterns.
    }
  };

  addPatternFromUrl(s3PublicBaseUrl);

  if (s3Bucket && s3Region) {
    addPatternFromUrl(`https://${s3Bucket}.s3.${s3Region}.amazonaws.com`);
  }

  return patterns;
}

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 2678400,
    localPatterns: [
      {
        pathname: "/assets/**",
      },
      {
        pathname: "/uploads/**",
      },
      {
        pathname: "/api/media",
      },
    ],
    remotePatterns: getRemotePatterns(),
  },
};

export default nextConfig;
