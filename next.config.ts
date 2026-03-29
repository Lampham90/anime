import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Các tùy chọn khác nếu bồ cần */
  images: {
    unoptimized: true, 
  },
  // Next.js 16 đôi khi kén chọn phần typescript/eslint config cũ
  // nên mình tạm thời ẩn chúng đi để nó build cho xong
};

export default nextConfig;