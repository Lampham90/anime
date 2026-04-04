/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // Thêm dòng này để xử lý trailing slash, tránh lỗi 404 khi truy cập /phim thay vì /phim/
  trailingSlash: true, 

  // Quan trọng: Đảm bảo không có dòng output: 'export' ở đây!
};

export default nextConfig;