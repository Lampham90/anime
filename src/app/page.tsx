"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

// Tăng tốc độ nhận diện phím lên mức tối đa
if (typeof window !== "undefined") {
  init({ 
    throttle: 0, 
    blockScroll: true, 
    visualDebug: false 
  }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['900'] });

// --- SEARCH BAR: Tối ưu memo để không re-render khi di chuyển phim ---
const SearchBar = memo(() => {
  const { ref, focused } = useFocusable({
    focusKey: 'SEARCH_INPUT',
  });

  return (
    <div 
      ref={ref}
      className={`mb-8 w-full max-w-xl flex items-center gap-4 px-6 py-3 rounded-2xl transition-all duration-150 border-[4px] ${
        focused ? "bg-white border-white translate-y-[-4px]" : "bg-zinc-900 border-transparent opacity-60"
      }`}
      style={{ transform: focused ? 'scale(1.02)' : 'scale(1)', willChange: 'transform' }}
    >
      <div className={`text-2xl font-black italic uppercase ${focused ? "text-black" : "text-zinc-500"}`}>
        🔍 NHẤN OK ĐỂ TÌM KIẾM...
      </div>
    </div>
  );
});

// --- MOVIE CARD: Tối ưu Hardware Acceleration ---
const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();

  const { ref, focused } = useFocusable({
    focusKey: `MOVIE_${movie.slug}`,
    onEnterPress: () => {
      sessionStorage.setItem("last_slug", movie.slug);
      sessionStorage.setItem("last_page", currentPage.toString());
      router.push(`/phim/${movie.slug}`);
    },
    onArrowPress: (dir) => {
      if (dir === 'up' && index < 6) {
        if (currentPage === 1) { setFocus('SEARCH_INPUT'); return false; }
        else { onPageChange(currentPage - 1, 'BOTTOM', index); return false; }
      }
      if (dir === 'down' && index >= 6 && currentPage < totalPages) {
        onPageChange(currentPage + 1, 'TOP', index - 6); return false;
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
    const raw = movie.thumb_url || movie.poster_url || ""; 
    const base = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=320&fit=cover&output=webp&q=50`;
  }, [movie.thumb_url]);

  return (
    <div 
      ref={ref} 
      className="relative flex flex-col items-center w-full outline-none"
      style={{ 
        // ÉP DÙNG GPU ĐỂ MƯỢT HƠN
        transform: focused ? 'translate3d(0, 0, 0) scale3d(1.08, 1.08, 1)' : 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
        transition: 'transform 0.12s ease-out',
        willChange: 'transform',
        zIndex: focused ? 10 : 1,
        contain: 'layout paint' // Cực kỳ quan trọng để tăng tốc render
      }}
    >
      <div className={`relative aspect-[2/3] w-full rounded-[20px] overflow-hidden bg-zinc-900 border-[4px] transition-opacity duration-150 ${
        focused ? "border-white opacity-100" : "border-transparent opacity-80"
      }`}>
        <img src={imgUrl} loading="lazy" className="w-full h-full object-cover" alt="" />
      </div>
      <p className={`mt-3 uppercase italic font-black text-center line-clamp-1 w-full px-2 ${
        focused ? 'text-white text-[15px]' : 'text-zinc-500 text-[13px]'
      }`}>
        {movie.name}
      </p>
    </div>
  );
});

export default function LightspeedHome() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    fetch(`https://ch.3ks.workers.dev/v1/api/danh-sach/hoat-hinh?limit=240`)
      .then(r => r.json())
      .then(res => {
        const items = res?.data?.items || [];
        setAllMovies(items);
        setLoading(false);
        
        requestAnimationFrame(() => {
          const lastSlug = sessionStorage.getItem("last_slug");
          if (lastSlug) {
            setCurrentPage(parseInt(sessionStorage.getItem("last_page") || "1"));
            setTimeout(() => setFocus(`MOVIE_${lastSlug}`), 10);
            sessionStorage.removeItem("last_slug");
          } else {
            setFocus(`MOVIE_${items[0]?.slug}`);
          }
        });
      });
  }, []);

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * 12;
    return allMovies.slice(start, start + 12);
  }, [allMovies, currentPage]);

  const changePage = useCallback((p, pos, col) => {
    setCurrentPage(p);
    const target = allMovies[(p - 1) * 12 + (pos === 'TOP' ? col : col + 6)];
    if (target) setTimeout(() => setFocus(`MOVIE_${target.slug}`), 0);
  }, [allMovies]);

  // Header được memo để không bị giật khi di chuyển bên dưới
  const Header = useMemo(() => (
    <header className="flex flex-col mb-8">
      <SearchBar />
      <div className="flex items-baseline gap-4 border-l-[10px] border-red-600 pl-6">
        <h1 className="text-6xl font-black italic uppercase tracking-tighter">ANIME</h1>
        <span className="text-zinc-700 font-bold uppercase text-xs tracking-widest">Trang {currentPage}</span>
      </div>
    </header>
  ), [currentPage]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-black text-red-600 animate-pulse uppercase italic">Loading...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-10 py-8 overflow-hidden`}>
        {Header}

        <div className="grid grid-cols-6 gap-6 flex-1 content-start">
          {currentItems.map((m, i) => (
            <MovieCard 
              key={m.slug} 
              movie={m} 
              index={i} 
              currentPage={currentPage} 
              totalPages={20} 
              onPageChange={changePage} 
            />
          ))}
        </div>
      </main>
    </FocusContext.Provider>
  );
}