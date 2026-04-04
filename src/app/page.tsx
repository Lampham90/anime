"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ throttle: 12, blockScroll: true, visualDebug: false }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['900'] });

const CONFIG = {
  WORKER: process.env.NEXT_PUBLIC_WORKER || "https://ch.3ks.workers.dev",
  ORIGIN_IMG: "https://img.ophim.live/uploads/movies/", 
  COLS: 7,
  ITEMS_PER_PAGE: 14 
};

const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();

  const handlePress = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("last_slug", movie.slug);
      sessionStorage.setItem("last_page", currentPage.toString());
    }
    router.push(`/phim/${movie.slug}`);
  }, [movie.slug, currentPage, router]);

  const { ref, focused } = useFocusable({
    focusKey: `MOVIE_${movie.slug}`,
    onEnterPress: handlePress,
    onArrowPress: (dir) => {
      if (dir === 'up' && index < CONFIG.COLS && currentPage > 1) {
        onPageChange(currentPage - 1, 'BOTTOM', index); return false;
      }
      if (dir === 'down' && index >= CONFIG.COLS && currentPage < totalPages) {
        onPageChange(currentPage + 1, 'TOP', index - CONFIG.COLS); return false;
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
    const raw = movie.thumb_url || movie.poster_url || ""; 
    if (!raw) return "";
    const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=200&fit=cover&output=webp&q=60`;
  }, [movie.thumb_url]);

  // FIX LỖI "2525": Tách lấy số tập chuẩn
  const badge = useMemo(() => {
    const lang = movie.lang?.toLowerCase() || "";
    const rawEp = movie.episode_current || "";
    
    let label = "";
    if (lang.includes("lồng tiếng")) label = "LT";
    else if (lang.includes("thuyết minh")) label = "TM";

    // Logic mới: Tìm số đầu tiên trong chuỗi (ví dụ "25/25" -> "25", "Tập 12" -> "12")
    const match = rawEp.match(/\d+/);
    const epNumber = match ? match[0] : "";

    return { label, ep: epNumber };
  }, [movie.lang, movie.episode_current]);

  return (
    <div 
      ref={ref} 
      className="relative flex flex-col items-center"
      style={{ 
        transform: focused ? 'scale3d(1.1, 1.1, 1)' : 'scale3d(1, 1, 1)',
        transition: 'transform 0.15s ease-out',
        willChange: 'transform',
        zIndex: focused ? 10 : 1
      }}
    >
      <div className={`relative aspect-[2/3] w-full rounded-[25px] overflow-hidden bg-zinc-900 border-2 transition-all duration-300 ${
        focused ? "border-white opacity-100 shadow-2xl" : "border-transparent opacity-70"
      }`}>
        <img src={imgUrl} decoding="async" className="w-full h-full object-cover" alt="" />
        
        {/* Nhãn góc phải */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {badge.label && <span className="bg-red-600 text-white font-black px-2 py-0.5 rounded italic text-[9px] shadow-md">{badge.label}</span>}
          {badge.ep && <span className="bg-black/80 text-white font-black px-2 py-0.5 rounded text-[9px] border border-white/10 shadow-md">TẬP {badge.ep}</span>}
        </div>
      </div>

      {/* Tựa phim to rõ tiếng Việt */}
      <div className="mt-3 h-10 w-full overflow-hidden">
        <p className={`uppercase italic font-black tracking-tighter text-center line-clamp-2 px-1 transition-all duration-200 ${
          focused ? 'text-white text-[13px] leading-tight scale-105' : 'text-zinc-600 text-[11px] leading-tight'
        }`}>
          {movie.name}
        </p>
      </div>
    </div>
  );
});
MovieCard.displayName = "MovieCard";

export default function Home() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    fetch(`${CONFIG.WORKER}/v1/api/danh-sach/hoat-hinh?limit=280`)
      .then(r => r.json())
      .then(res => {
        const items = res?.data?.items || [];
        setAllMovies(items);
        setLoading(false);
        requestAnimationFrame(() => {
          const lastSlug = sessionStorage.getItem("last_slug");
          if (lastSlug) {
            setCurrentPage(parseInt(sessionStorage.getItem("last_page") || "1"));
            setTimeout(() => setFocus(`MOVIE_${lastSlug}`), 20);
            sessionStorage.removeItem("last_slug");
          } else if (items.length > 0) {
            setFocus(`MOVIE_${items[0].slug}`);
          }
        });
      });
  }, []);

  const currentItems = useMemo(() => {
    const s = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    return allMovies.slice(s, s + CONFIG.ITEMS_PER_PAGE);
  }, [allMovies, currentPage]);

  const changePage = useCallback((p: number, pos: 'TOP' | 'BOTTOM', col: number) => {
    setCurrentPage(p);
    const s = (p - 1) * CONFIG.ITEMS_PER_PAGE;
    const target = allMovies[s + (pos === 'TOP' ? col : col + CONFIG.COLS)] || allMovies[s];
    if (target) setFocus(`MOVIE_${target.slug}`);
  }, [allMovies]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-[12px] font-black italic text-red-600 tracking-[0.5em] uppercase">Đang khởi động...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-16 py-10 overflow-hidden`}>
        
        <header className="mb-10 flex items-baseline justify-between">
          <h1 className="text-6xl font-black italic uppercase tracking-tighter border-l-[12px] border-red-600 pl-8 leading-none">
            Anime
          </h1>
          <div className="flex gap-6 items-center opacity-40 text-[11px] font-black uppercase tracking-[0.4em]">
             <span>Trang {currentPage}</span>
             <div className="w-1.5 h-1.5 bg-red-600 rounded-full"></div>
             <span>Turbo Engine v3.1</span>
          </div>
        </header>

        <div className="grid grid-cols-7 gap-10 flex-1 content-start">
          {currentItems.map((m, i) => (
            <MovieCard key={m.slug} movie={m} index={i} currentPage={currentPage} totalPages={20} onPageChange={changePage} />
          ))}
        </div>
      </main>
    </FocusContext.Provider>
  );
}