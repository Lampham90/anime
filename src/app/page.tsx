"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; // Bắt buộc phải có dòng này cho Cloudflare Pages

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

// Chỉ khởi tạo trên trình duyệt
if (typeof window !== "undefined") {
  init({ throttle: 50 });
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

const CONFIG = {
  WORKER: process.env.NEXT_PUBLIC_WORKER || "https://ch.3ks.workers.dev",
  ORIGIN_IMG: "https://img.ophim.live/uploads/movies/",
  COLS: 7,
  ITEMS_PER_PAGE: 14 
};

// --- COMPONENT: MOVIE CARD ---
const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);

  const { ref, focused } = useFocusable({
    focusKey: `MOVIE_${movie.slug}`,
    onEnterPress: () => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_slug", movie.slug);
        sessionStorage.setItem("last_page", currentPage.toString());
      }
      router.push(`/phim/${movie.slug}`);
    },
    onArrowPress: (dir) => {
      if (dir === 'up' && index < CONFIG.COLS) {
        if (currentPage > 1) { 
            onPageChange(currentPage - 1, 'BOTTOM', index); 
            return false; 
        }
        router.push('/search'); 
        return false;
      }
      if (dir === 'down' && index >= CONFIG.COLS) {
        if (currentPage < totalPages) { 
            onPageChange(currentPage + 1, 'TOP', index - CONFIG.COLS); 
            return false; 
        }
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
    const raw = movie.thumb_url || movie.poster_url || "";
    const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=280&fit=cover&output=webp&q=70&sharp=1`;
  }, [movie.slug, movie.thumb_url, movie.poster_url]);

  const badges = useMemo(() => {
    const ep = movie.episode_current?.toLowerCase() || "";
    const isFull = ep.includes("full") || ep.includes("hoàn tất") || ep === "1/1" || ep === "";
    const lang = movie.lang?.toUpperCase() || "";
    let cleanLang = null;
    if (lang.includes("THUYẾT MINH") || lang.includes("TM")) cleanLang = "TM";
    else if (lang.includes("LỒNG TIẾNG") || lang.includes("LT")) cleanLang = "LT";
    return { ep: !isFull ? movie.episode_current : null, lang: cleanLang };
  }, [movie.episode_current, movie.lang]);

  return (
    <div ref={ref} className={`relative flex flex-col transition-all duration-150 ease-out transform-gpu cursor-pointer ${focused ? "scale-105 z-50 opacity-100" : "scale-100 opacity-40"}`}>
      <div className={`aspect-[2/3] w-full rounded-2xl overflow-hidden relative bg-zinc-900 transition-all duration-300 ${focused ? "ring-[5px] ring-white shadow-[0_0_40px_rgba(255,255,255,0.4)]" : "border-2 border-white/5"}`}>
        <img 
          src={imgUrl} 
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
          alt={movie.name}
        />
        <div className="absolute top-2 right-2 flex gap-1 z-10 pointer-events-none font-black">
            {badges.ep && <div className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded shadow-md uppercase">{badges.ep}</div>}
            {badges.lang && <div className="bg-white text-black text-[9px] px-2 py-0.5 rounded shadow-md">{badges.lang}</div>}
        </div>
      </div>
      <div className="mt-2 h-5 overflow-hidden text-center">
        <p className={`text-[10px] uppercase italic truncate transition-colors ${focused ? 'text-white font-black' : 'text-zinc-400 font-bold'}`}>
          {movie.name}
        </p>
      </div>
    </div>
  );
});

// --- MAIN COMPONENT ---
export default function HoatHinhHome() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    setIsClient(true);
    const controller = new AbortController();
    
    const fetchData = async () => {
        try {
            const r = await fetch(`${CONFIG.WORKER}/v1/api/danh-sach/hoat-hinh?limit=280`, { signal: controller.signal });
            const res = await r.json();
            const items = res?.data?.items || [];
            setAllMovies(items);
            setLoading(false);
            
            // Xử lý Focus sau khi data đã render
            setTimeout(() => {
                const lastSlug = sessionStorage.getItem("last_slug");
                const lastPage = sessionStorage.getItem("last_page");
                
                if (lastSlug && lastPage) {
                    setCurrentPage(parseInt(lastPage));
                    setFocus(`MOVIE_${lastSlug}`);
                    sessionStorage.removeItem("last_slug");
                } else if (items.length > 0) {
                    setFocus(`MOVIE_${items[0].slug}`);
                }
            }, 100);
        } catch (e) {
            if (e instanceof Error && e.name !== 'AbortError') setLoading(false);
        }
    };

    fetchData();
    return () => controller.abort();
  }, []);

  const currentItems = useMemo(() => {
    const s = (currentPage - 1) * CONFIG.ITEMS_PER_PAGE;
    return allMovies.slice(s, s + CONFIG.ITEMS_PER_PAGE);
  }, [allMovies, currentPage]);

  const totalPages = Math.ceil(allMovies.length / CONFIG.ITEMS_PER_PAGE);

  const changePage = useCallback((p: number, pos: 'TOP' | 'BOTTOM', col: number) => {
    setCurrentPage(p);
    setTimeout(() => {
      const s = (p - 1) * CONFIG.ITEMS_PER_PAGE;
      const target = allMovies[s + (pos === 'TOP' ? col : col + CONFIG.COLS)] || allMovies[s];
      if (target) setFocus(`MOVIE_${target.slug}`);
    }, 50);
  }, [allMovies]);

  if (!isClient) return <div className="fixed inset-0 bg-[#020202]" />;

  if (loading) return (
    <div className="fixed inset-0 bg-[#020202] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-red-600 font-black italic animate-pulse tracking-widest text-xs">VUI LÒNG ĐỢI...</span>
        </div>
    </div>
  );

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-12 pt-12 pb-6 overflow-hidden selection:bg-transparent`}>
        {/* Row 1 */}
        <div className="grid grid-cols-7 gap-6">
          {currentItems.slice(0, 7).map((m, i) => (
            <MovieCard key={m.slug} movie={m} index={i} currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
          ))}
        </div>

        {/* Page Indicator */}
        <div className="flex-1 flex items-center justify-center">
            <div className="px-10 py-1.5 bg-zinc-900/50 border border-white/5 rounded-full backdrop-blur-md shadow-2xl">
                <span className="text-[10px] font-black italic tracking-[6px] text-red-600">
                    PHIM MỚI <span className="text-zinc-500 mx-2">|</span> TRANG {currentPage} / {totalPages}
                </span>
            </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-7 gap-6">
          {currentItems.slice(7, 14).map((m, i) => (
            <MovieCard key={m.slug} movie={m} index={i + 7} currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} />
          ))}
        </div>
      </main>
    </FocusContext.Provider>
  );
}