import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['canvas', '@napi-rs/canvas'],
};

export default nextConfig;
