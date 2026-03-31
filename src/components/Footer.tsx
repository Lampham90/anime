"use client";

import Link from 'next/link';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700'] });

export default function Footer() {
  return (
    <footer className={`${montserrat.className} bg-[#050505] border-t border-white/5 pt-16 pb-8`}>
      <div className="max-w-[1920px] mx-auto px-6 md:px-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Cột 1: Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/">
              <h2 className="text-2xl font-black italic tracking-tighter text-white mb-6">
                MY<span className="text-red-600">STREAM</span>
              </h2>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed italic">
              2026 MyStream Project - Đây là dự án Demo, học tập 
            </p>
          </div>

          {/* Cột 2: Danh mục */}
          <div>
            <h3 className="text-white font-bold uppercase text-[11px] tracking-[0.2em] mb-6">Khám Phá</h3>
            <ul className="space-y-4 text-white/50 text-sm font-medium">
              <li><Link href="/danh-sach/phim-moi" className="hover:text-red-500 transition-colors">Phim Mới</Link></li>
              <li><Link href="/danh-sach/phim-le" className="hover:text-red-500 transition-colors">Phim Lẻ</Link></li>
              <li><Link href="/danh-sach/phim-bo" className="hover:text-red-500 transition-colors">Phim Bộ</Link></li>
            </ul>
          </div>

          {/* Cột 3: Hỗ trợ */}
          <div>
            <h3 className="text-white font-bold uppercase text-[11px] tracking-[0.2em] mb-6">Thông Tin</h3>
            <ul className="space-y-4 text-white/50 text-sm font-medium">
              <li><Link href="#" className="hover:text-red-500 transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link href="#" className="hover:text-red-500 transition-colors">Chính sách bản quyền</Link></li>
              <li><Link href="#" className="hover:text-red-500 transition-colors">Khiếu nại</Link></li>
            </ul>
          </div>

          {/* Cột 4: Liên hệ */}
          <div>
            <h3 className="text-white font-bold uppercase text-[11px] tracking-[0.2em] mb-6">Kết Nối</h3>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 transition-all">
                <span className="text-white text-xs">FB</span>
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 transition-all">
                <span className="text-white text-xs">TG</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bản quyền */}
        <div className="border-t border-white/5 pt-8 text-center">
          <p className="text-white/20 text-[10px] uppercase tracking-[0.3em] font-bold">
            © {new Date().getFullYear()} MYSTREAM. 
          </p>
        </div>
      </div>
    </footer>
  );
}