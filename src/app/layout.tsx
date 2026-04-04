import { Montserrat } from 'next/font/google';
import "./globals.css";
import { TVProvider } from "./tv-provider"; // Lát nữa mình tạo file này sau

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const montserrat = Montserrat({ 
  subsets: ['vietnamese'], 
  weight: ['400', '700', '900'] 
});

export const metadata = {
  title: 'TV Hoạt Hình - Xem Phim Trên TV',
  description: 'Ứng dụng xem phim hoạt hình tối ưu cho điều khiển TV',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://img.ophim.live" />
        <link rel="preconnect" href="https://images.weserv.nl" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`${montserrat.className} antialiased bg-[#020202] text-white`}>
        {/* Bọc TVProvider ở đây để xử lý logic Remote TV */}
        <TVProvider>
          <div className="min-h-screen flex flex-col overflow-hidden relative">
            {/* NỀN TRANG TRÍ */}
            <div className="fixed inset-0 z-[-10] pointer-events-none">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full"></div>
              <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-zinc-900/20 blur-[100px] rounded-full"></div>
            </div>

            <main className="relative z-10 flex-grow">
              {children}
            </main>
          </div>
        </TVProvider>
      </body>
    </html>
  );
}