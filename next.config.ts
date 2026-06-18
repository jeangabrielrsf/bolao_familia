import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', '@napi-rs/canvas'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/webp'],
    qualities: [75],
    minimumCacheTTL: 2678400,
    imageSizes: [16, 32, 40, 48, 64, 80],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
};

export default nextConfig;
