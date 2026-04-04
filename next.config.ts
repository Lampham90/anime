/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Ép Next.js hiểu môi trường Edge của Cloudflare
  serverExternalPackages: ["@cloudflare/next-on-pages"],
};

export default nextConfig;