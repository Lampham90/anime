"use client";
export const runtime = 'edge';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import Header from '@/components/Header';

// ✅ HỆ THỐNG 5 WORKER CHIẾN THẦN
const WORKERS = [
  "https://pro1.pl9.workers.dev",
  "https://pro2.phuonglam56973.workers.dev",
  "https://pro3.pplam5697.workers.dev",
  "https://pro4.phuonglam56971.workers.dev",
  "https://pro5.phuonglam56972.workers.dev"
];
const ORIGIN_IMG = "https://img.ophim.live/uploads/movies/";

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = params.type as string; 
  const slug = params.slug as string;
  const currentPage = parseInt(searchParams.get('page') || '1');
  
  // Giữ proxy cố định cho mỗi lần render để tránh nhảy worker liên tục
  const proxy = useMemo(() => WORKERS[Math.floor(Math.random() * WORKERS.length)], [type, slug, currentPage]);
  const currentUrl = `${proxy}/v1/api/${type}/${slug}?page=${currentPage}`;

  const { data, isValidating } = useSWR(currentUrl, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000,
  });

  const { movies, totalPages, titlePage } = useMemo(() => {
    if (!data) return { movies: [], totalPages: 1, titlePage: "..." };
    
    let rawItems = data.data?.items || data.items || [];
    
    // 1. Lọc bỏ trailer & không có link
    const filteredMovies = rawItems.filter((m: any) => {
      const name = ((m.name || "") + (m.origin_name || "")).toLowerCase();
      const status = (m.episode_current || "").toLowerCase();
      return !name.includes('trailer') && !status.includes('trailer') && m.episode_current !== "";
    });

    // 2. Sắp xếp: Năm mới > Cập nhật mới
    const sortedMovies = [...filteredMovies].sort((a: any, b: any) => {
      const yearA = parseInt(a.year) || 0;
      const yearB = parseInt(b.year) || 0;
      if (yearB !== yearA) return yearB - yearA;
      return new Date(b.modified?.time || 0).getTime() - new Date(a.modified?.time || 0).getTime();
    });

    // 3. Phân trang logic
    const totalItems = data.data?.params?.pagination?.totalItems || 0;
    const itemsPerPage = data.data?.params?.pagination?.totalItemsPerPage || 6;
    const totalPagesCount = Math.ceil(totalItems / itemsPerPage);

    return {
      movies: sortedMovies.slice(0, 6), // Ép hiển thị 1 hàng 6 phim theo yêu cầu của bạn
      totalPages: totalPagesCount || 1,
      titlePage: data.data?.titlePage || "Danh Sách"
    };
  }, [data]);

  const getPaginationGroup = useCallback(() => {
    let start = Math.max(currentPage - 2, 1);
    let end = Math.min(start + 4, totalPages);
    if (end - start < 4) start = Math.max(end - 4, 1);
    const pages = [];
    for (let i = start; i <= end; i++) if (i > 0) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    const targetPage = Math.min(Math.max(1, page), totalPages);
    router.push(`/${type}/${slug}?page=${targetPage}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen w-full bg-[#050505] text-white flex flex-col select-none relative overflow-x-hidden">
      <Header />
      
      <div 
        className={`flex-1 flex flex-col px-6 md:px-12 max-w-[2000px] mx-auto w-full pt-32 pb-20 transition-all duration-500 ${isValidating ? 'opacity-40 scale-[0.99]' : 'opacity-100 scale-100'}`}
      >
        
        <div className="flex items-center gap-3 mb-12 px-2">
          <span className="w-[4px] h-8 bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.8)] rounded-full"></span>
          <h1 className="text-lg md:text-xl font-black uppercase tracking-[0.4em] italic text-white/90">
            {titlePage}
          </h1>
        </div>

        {/* Lưới 6 Phim / Hàng */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 xl:gap-8 items-start">
          {movies.map((movie, idx) => {
            const rawLang = movie.lang?.toLowerCase() || "";
            let displayLang = rawLang.includes("lồng") ? "LT" : rawLang.includes("thuyết") ? "TM" : "";
            const episode = movie.episode_current;
            const imgPath = movie.thumb_url.startsWith('http') ? movie.thumb_url : ORIGIN_IMG + movie.thumb_url;

            return (
              <Link 
                href={`/phim/${movie.slug}`} 
                key={movie.slug} 
                className="group flex flex-col items-center w-full outline-none transition-transform duration-300 hover:-translate-y-2"
              >
                <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden border border-white/5 group-hover:border-red-500 transition-all duration-500 bg-neutral-900 shadow-2xl">
                  <img 
                    src={`https://images.weserv.nl/?url=${encodeURIComponent(imgPath)}&w=400&fit=cover&output=webp&q=80`} 
                    alt={movie.name} 
                    loading="lazy"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-in-out"
                  />

                  {/* 🏷️ NHÃN TRÊN (LT/TM + Năm) */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    {displayLang && (
                      <div className="bg-red-600/80 backdrop-blur-md border border-red-500/20 px-2 py-0.5 rounded-lg shadow-xl">
                        <span className="text-[9px] font-black text-white">{displayLang}</span>
                      </div>
                    )}
                    <div className="bg-black/40 backdrop-blur-md border border-white/10 px-2 py-0.5 rounded-lg shadow-xl">
                      <span className="text-[9px] font-black text-white">{movie.year || "2024"}</span>
                    </div>
                  </div>

                  {/* 🏷️ NHÃN DƯỚI (Số tập) */}
                  {episode && !["full", "1/1", "1"].includes(episode.toLowerCase()) && (
                    <div className="absolute bottom-3 right-3 z-10">
                      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg transition-all group-hover:bg-red-600">
                        <span className="text-[9px] font-black text-white uppercase italic tracking-tighter">{episode}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                </div>

                <div className="mt-5 w-full px-2">
                  <h3 className="text-[12px] md:text-[13px] font-black uppercase text-white/90 tracking-widest text-center leading-snug group-hover:text-red-500 transition-colors line-clamp-2 min-h-[3.2em] flex items-center justify-center italic">
                    {movie.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Thanh phân trang Neon */}
        {totalPages > 1 && (
          <div className="mt-24 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 p-2 px-4 bg-[#0a0a0a]/60 backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl">
              <button 
                onClick={() => handlePageChange(currentPage - 5)}
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all group disabled:opacity-10"
              >
                <svg className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex items-center gap-2 mx-2">
                {getPaginationGroup().map(p => {
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`relative w-11 h-11 flex items-center justify-center rounded-xl font-black text-[14px] transition-all duration-500
                        ${isActive 
                          ? 'bg-transparent border-[2.5px] border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] text-red-500 scale-110 z-10' 
                          : 'bg-red-600 text-white hover:bg-red-500'}`}
                    >
                      {p}
                      {isActive && <span className="absolute inset-0 rounded-xl bg-red-500/10 animate-pulse"></span>}
                    </button>
                  );
                })}
              </div>

              <button 
                onClick={() => handlePageChange(currentPage + 5)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/5 transition-all group disabled:opacity-10"
              >
                <svg className="w-5 h-5 opacity-30 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 italic">
              {currentPage} / {totalPages} PAGES
            </p>
          </div>
        )}
      </div>
    </main>
  );
}