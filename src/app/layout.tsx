"use client";

import { useEffect } from 'react';
import { init, useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { Montserrat } from 'next/font/google';
import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ['vietnamese'], 
  weight: ['400', '700', '900'] 
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ref, focusKey } = useFocusable();

  useEffect(() => {
    // Khởi tạo điều hướng cho TV
    init({
      debug: false,
      visualDebug: false,
    });
  }, []);

  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        {/* TỐI ƯU KẾT NỐI: Giúp load ảnh và phim nhanh như Youtube */}
        <link rel="preconnect" href="https://img.ophim.live" />
        <link rel="preconnect" href="https://images.weserv.nl" />
        <link rel="dns-prefetch" href="https://pro1.pl9.workers.dev" />
        
        {/* Meta cho TV để tránh bị zoom nhầm giao diện */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${montserrat.className} antialiased bg-[#020202] text-white selection:bg-red-600`}>
        
        <FocusContext.Provider value={focusKey}>
          <div ref={ref} className="min-h-screen flex flex-col overflow-hidden">
            
            {/* NỀN TRANG TRÍ (Gọn nhẹ, không gây lag TV) */}
            <div className="fixed inset-0 z-[-10] pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-zinc-900/20 blur-[100px] rounded-full"></div>
            </div>

            {/* NỘI DUNG CHÍNH (Đẩy sát mép trên) */}
            <main className="relative z-10 flex-grow">
              {children}
            </main>

          </div>
        </FocusContext.Provider>

      </body>
    </html>
  );
}