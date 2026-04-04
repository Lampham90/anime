/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Tắt tối ưu ảnh của Next.js vì Cloudflare/Weserv sẽ lo vụ này
  images: { 
    unoptimized: true 
  },
  
  // 2. Bỏ qua các lỗi vặt khi Build để đẩy nhanh tốc độ deploy
  eslint: { 
    ignoreDuringBuilds: true 
  },
  typescript: { 
    ignoreBuildErrors: true 
  },

  // 3. QUAN TRỌNG: Cấu hình để Next.js hiểu môi trường Edge
  // Giúp các hàm như fetch, crypto, streaming chạy mượt trên Cloudflare Worker
  serverExternalPackages: ["@cloudflare/next-on-pages"],

  // 4. Cho phép gọi API từ các domain khác nếu cần (CORS)
  async headers() {
    return [
      {
        source: "/v1/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;