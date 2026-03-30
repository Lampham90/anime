import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

export const metadata: Metadata = {
  title: "CineVip - Cinema Experience",
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
        
        {/* NỀN TRANG TRÍ - ĐÃ FIX LỖI 403 NOISE */}
        <div className="fixed inset-0 z-[-10] pointer-events-none">
          {/* Lớp Noise dùng SVG trực tiếp, không sợ link chết */}
          <div 
            className="absolute inset-0 opacity-[0.02]" 
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
            }}
          ></div>
          
          {/* Đốm sáng đỏ trang trí */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/5 blur-[120px] rounded-full"></div>
        </div>

        {/* HEADER */}
        <Header />

        {/* NỘI DUNG CHÍNH */}
        <main className="relative z-10 min-h-screen">
          {children}
        </main>

        {/* FOOTER */}
        <Footer />

        {/* SCROLL TO TOP */}
        <ScrollToTop />

      </body>
    </html>
  );
}