"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ 
    throttle: 0, 
    blockScroll: true, 
    visualDebug: false,
    useDeterministicFocus: true 
  }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['900'] });

const workerCode = `
  self.onmessage = function(e) {
    const { type, allMovies, page, limit } = e.data;
    if (type === 'PROCESS_PAGE') {
      const start = (page - 1) * limit;
      self.postMessage({ items: allMovies.slice(start, start + limit) });
    }
  };
`;

// --- COMPONENT TÌM KIẾM CHO TV ---
const SearchBar = memo(() => {
  const router = useRouter();
  const inputRef = useRef(null);
  const [searchValue, setSearchValue] = useState("");

  const { ref, focused } = useFocusable({ 
    focusKey: 'SEARCH_INPUT',
    onEnterPress: () => {
      inputRef.current?.focus(); // Kích hoạt bàn phím ảo TV
    },
    onArrowPress: (dir) => {
      if (dir === 'down') {
        setFocus('MOVIE_GRID_START'); // Xuống lại danh sách phim
        return false;
      }
      return true;
    }
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const query = searchValue.trim();
      if (query) {
        // Điều hướng sang trang search của ní
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <div 
      ref={ref}
      className={`flex items-center gap-4 px-6 py-3 rounded-2xl border-[3px] transition-all duration-150 mb-10 w-[450px] ${
        focused ? "bg-white border-white shadow-2xl scale-105" : "bg-white/5 border-transparent opacity-30"
      }`}
    >
      <span className={`text-xl ${focused ? "text-black" : "text-white"}`}>🔍</span>
      <input
        ref={inputRef}
        type="text"
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="NHẤP OK ĐỂ NHẬP TÊN PHIM..."
        className={`bg-transparent border-none outline-none w-full font-black italic uppercase text-sm tracking-tight ${
          focused ? "text-black placeholder-black/40" : "text-white/20 placeholder-white/10"
        }`}
      />
    </div>
  );
});

// --- COMPONENT THẺ PHIM TỐI ƯU TĨNH ---
const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();
  const isTop = index < 6;

  const { ref, focused } = useFocusable({
    focusKey: index === 0 ? 'MOVIE_GRID_START' : `MOVIE_${movie.slug}`,
    onEnterPress: () => {
      sessionStorage.setItem("last_slug", movie.slug);
      sessionStorage.setItem("last_page", currentPage.toString());
      router.push(`/phim/${movie.slug}`);
    },
    onArrowPress: (dir) => {
      if (dir === 'up' && isTop) {
        if (currentPage === 1) { 
          setFocus('SEARCH_INPUT'); // Lên ô tìm kiếm
        } else {
          onPageChange(currentPage - 1, 'BOTTOM', index); 
        }
        return false;
      }
      if (dir === 'down' && index >= 6 && currentPage < totalPages) {
        onPageChange(currentPage + 1, 'TOP', index - 6); return false;
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
    const raw = movie.poster_url || movie.thumb_url || ""; 
    const base = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(base.replace("http://", "https://"))}&w=350&output=webp&q=80&il`;
  }, [movie.slug]);

  return (
    <div ref={ref} className={`movie-card-static ${focused ? 'is-active' : ''}`}>
      <div className="poster-box">
        <img src={imgUrl} loading="lazy" alt="" className="img-content" />
        <div className="ep-tag">{movie.episode_current || 'HD'}</div>
        {focused && <div className="focus-border-glow" />}
      </div>
      <p className="title-text">{movie.name}</p>

      <style jsx>{`
        .movie-card-static { width: 100%; outline: none; contain: content; }
        .poster-box { position: relative; width: 100%; aspect-ratio: 2/3; border-radius: 12px; overflow: hidden; background: #111; }
        .img-content { width: 100%; height: 100%; object-fit: cover; opacity: 0.5; filter: grayscale(0.4) brightness(0.6); transition: all 0.1s ease; }
        .is-active .img-content { opacity: 1; filter: grayscale(0) brightness(1.1); }
        .focus-border-glow { position: absolute; inset: 0; border: 5px solid white; border-radius: 12px; z-index: 10; box-shadow: 0 0 25px rgba(255,255,255,0.3); }
        .ep-tag { position: absolute; top: 8px; right: 8px; background: #facc15; color: black; font-weight: 900; font-size: 10px; padding: 2px 6px; border-radius: 6px; z-index: 20; }
        .title-text { margin-top: 10px; text-transform: uppercase; font-weight: 900; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; color: #444; font-size: 13px; }
        .is-active .title-text { color: white; font-style: italic; font-size: 14px; }
      `}</style>
    </div>
  );
});

// --- TRANG CHỦ CHÍNH ---
export default function LightspeedHome() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    workerRef.current.onmessage = (e) => { setCurrentItems(e.data.items); setLoading(false); };

    fetch(`https://ch.3ks.workers.dev/v1/api/danh-sach/hoat-hinh?limit=600`)
      .then(r => r.json())
      .then(res => {
        const items = res?.data?.items || [];
        setAllMovies(items);
        const savedPage = parseInt(sessionStorage.getItem("last_page") || "1");
        setCurrentPage(savedPage);
        workerRef.current?.postMessage({ type: 'PROCESS_PAGE', allMovies: items, page: savedPage, limit: 12 });
        requestAnimationFrame(() => {
          const lastSlug = sessionStorage.getItem("last_slug");
          if (lastSlug) { setTimeout(() => setFocus(`MOVIE_${lastSlug}`), 0); }
          else if (items[0]) { setFocus('MOVIE_GRID_START'); }
        });
      });
    return () => workerRef.current?.terminate();
  }, []);

  const changePage = useCallback((p: number, pos: string, col: number) => {
    setCurrentPage(p);
    workerRef.current?.postMessage({ type: 'PROCESS_PAGE', allMovies: allMovies, page: p, limit: 12 });
    const targetIdx = (p - 1) * 12 + (pos === 'TOP' ? col : col + 6);
    const target = allMovies[targetIdx];
    if (target) setTimeout(() => setFocus(targetIdx % 12 === 0 ? 'MOVIE_GRID_START' : `MOVIE_${target.slug}`), 0);
  }, [allMovies]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic text-2xl uppercase">LIGHTSPEED...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main 
        ref={pageRef} 
        className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-[6%] pt-6 overflow-hidden relative`}
      >
        {/* Khu vực Tìm kiếm */}
        <div className="flex justify-start">
            <SearchBar />
        </div>

        {/* Lưới phim: Sát viền trên sau SearchBar, bự và mượt */}
        <div className="grid grid-cols-6 gap-x-8 gap-y-12 flex-1 content-start h-full overflow-hidden">
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

        <div className="absolute bottom-4 right-8 opacity-5 text-[10px] font-black italic">PAGE {currentPage}</div>
      </main>
    </FocusContext.Provider>
  );
}