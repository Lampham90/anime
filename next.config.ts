import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // THÊM DÒNG NÀY VÀO:
  runtime: 'edge', 
};

export default nextConfig;