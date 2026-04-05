"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ throttle: 0, blockScroll: true, visualDebug: false }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['900'] });

// --- SEARCH BAR: Siêu nhỏ gọn ở góc ---
const SearchBar = memo(() => {
  const { ref, focused } = useFocusable({ focusKey: 'SEARCH_INPUT' });

  return (
    <div 
      ref={ref}
      className={`flex items-center justify-center rounded-xl transition-all duration-100 border-2 ${
        focused ? "bg-white border-white scale-110 w-10 h-10" : "bg-white/5 border-transparent w-9 h-9"
      }`}
    >
      <span className={`text-base ${focused ? "text-black" : "text-white/20"}`}>🔍</span>
    </div>
  );
});

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
    if (!raw) return "";
    let fullUrl = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    fullUrl = fullUrl.replace("http://", "https://");
    return `https://wsrv.nl/?url=${encodeURIComponent(fullUrl)}&w=320&fit=cover&output=webp&q=60`;
  }, [movie.slug]);

  return (
    <div 
      ref={ref} 
      className="relative flex flex-col items-center w-full outline-none"
      style={{ 
        // Giảm scale xuống 1.05 để tránh tràn mép khi focus
        transform: focused ? 'translate3d(0, 0, 0) scale3d(1.05, 1.05, 1)' : 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
        transition: 'transform 0.1s ease-out',
        willChange: 'transform',
        zIndex: focused ? 10 : 1,
        contain: 'layout paint'
      }}
    >
      <div className={`relative aspect-[2/3] w-full rounded-[12px] overflow-hidden bg-zinc-900 border-[3px] transition-opacity duration-100 ${
        focused ? "border-white opacity-100 shadow-[0_0_25px_rgba(255,255,255,0.3)]" : "border-transparent opacity-70"
      }`}>
        <img 
          src={imgUrl} 
          loading="lazy" 
          className="w-full h-full object-cover" 
          alt="" 
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            const rawPath = movie.poster_url || movie.thumb_url;
            if (rawPath && !target.src.includes('ophim1')) {
               target.src = `https://img.ophim1.com/uploads/movies/${rawPath}`;
            }
          }}
        />
      </div>
      <p className={`mt-2 uppercase italic font-black text-center line-clamp-1 w-full px-1 tracking-tighter ${
        focused ? 'text-white text-[10px]' : 'text-zinc-600 text-[9px]'
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
            if (items[0]) setFocus(`MOVIE_${items[0]?.slug}`);
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
    const targetIdx = (p - 1) * 12 + (pos === 'TOP' ? col : col + 6);
    const target = allMovies[targetIdx];
    if (target) setTimeout(() => setFocus(`MOVIE_${target.slug}`), 0);
  }, [allMovies]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center font-black text-red-600 animate-pulse uppercase italic text-2xl">Loading...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      {/* Tăng px-12 để ép nội dung vào giữa, tránh tràn 2 bên mép */}
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-12 pt-4 overflow-hidden`}>
        
        {/* Header tối giản */}
        <header className="flex items-center justify-between h-12 px-2 mb-2 flex-shrink-0">
          <SearchBar />
          <div className="flex items-center gap-2 opacity-20">
            <span className="text-[10px] font-black uppercase italic">Page</span>
            <span className="text-xl font-black italic">{currentPage}</span>
          </div>
        </header>

        {/* Lưới phim: dùng gap-8 để poster nhỏ lại và thoáng hơn */}
        <div className="grid grid-cols-6 gap-8 flex-1 overflow-hidden content-start h-full">
          {currentItems.map((m, i) => (
            <MovieCard 
              key={m.slug} 
              movie={m} 
              index={i} 
              currentPage={currentPage} 
              totalPages={Math.ceil(allMovies.length / 12)} 
              onPageChange={changePage} 
            />
          ))}
        </div>
      </main>
    </FocusContext.Provider>
  );
}