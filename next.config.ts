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
  async headers() {
    return [
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/api/admin/content",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/api/media",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3000, s-maxage=3000",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [68, 70, 75, 100],
    deviceSizes: [360, 390, 414, 480, 640, 750, 828, 960, 1080, 1200, 1366, 1440, 1536, 1920, 2048, 2560, 3200, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512, 640, 750, 828, 1080, 1200],
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
