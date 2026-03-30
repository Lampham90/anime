import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop"; // 1. Import component vào đây
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: "CineVip",
  description: "Hệ thống xem phim đẳng cấp, trải nghiệm điện ảnh 4K",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="scroll-smooth">
      <body className={`${montserrat.className} antialiased selection:bg-red-600 selection:text-white bg-[#050505] text-white`}>
        
        {/* NỀN TRANG TRÍ - HIỆU ỨNG NOISE & GRADIENT CHÌM */}
        <div className="fixed inset-0 z-[-10] pointer-events-none">
          <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full"></div>
        </div>

        {/* HEADER - LUÔN TRÊN CÙNG */}
        <Header />

        {/* NỘI DUNG CHÍNH */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>

        {/* FOOTER - CHÂN TRANG */}
        <Footer />

        {/* 2. CHÈN SCROLL TO TOP Ở ĐÂY */}
        <ScrollToTop />

      </body>
    </html>
  );
}