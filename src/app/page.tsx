"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge'; 

import { useState, useEffect, memo, useMemo, useCallback, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { 
  useFocusable, 
  FocusContext, 
  setFocus, 
  init 
} from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ 
    throttle: 0, 
    blockScroll: true, 
    visualDebug: false,
    useDeterministicFocus: true 
  }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['900'] });

// --- COMPONENT THẺ PHIM (CẤU HÌNH SIÊU NHẸ CHO TV) ---
const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();
  const isTop = index < 6;
  const [isLoaded, setIsLoaded] = useState(false);

  const { ref, focused } = useFocusable({
    focusKey: `MOVIE_${movie.slug}`,
    onEnterPress: () => {
      sessionStorage.setItem("last_slug", movie.slug);
      sessionStorage.setItem("last_page", currentPage.toString());
      router.push(`/phim/${movie.slug}`);
    },
    onArrowPress: (dir) => {
      if (dir === 'up' && isTop) {
        if (currentPage === 1) { router.push('/search'); }
        else { onPageChange(currentPage - 1, 'BOTTOM', index); }
        return false;
      }
      if (dir === 'down' && index >= 6 && currentPage < totalPages) {
        onPageChange(currentPage + 1, 'TOP', index - 6); 
        return false;
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
    const path = movie.poster_url || movie.thumb_url || "";
    if (!path) return "";
    let finalPath = path.startsWith('http') ? path : `https://img.ophim.live/uploads/movies/${path}`;
    finalPath = finalPath.replace("http://", "https://");
    
    // TỐI ƯU CỰC HẠN: w=180 (nhẹ RAM), q=50 (giảm tải mạng), output=jpg (nhẹ CPU TV)
    return `https://wsrv.nl/?url=${encodeURIComponent(finalPath)}&w=180&output=jpg&q=50&il&atyp=vips`;
  }, [movie.slug]);

  return (
    <div ref={ref} className={`movie-card-static ${focused ? 'is-active' : ''}`}>
      <div className="poster-box">
        <img 
          key={movie.slug}
          src={imgUrl} 
          loading="eager" 
          // @ts-ignore
          fetchpriority="high"
          decoding="async" 
          alt="" 
          className={`img-content ${isLoaded ? 'loaded' : 'loading'}`}
          crossOrigin="anonymous"
          onLoad={() => setIsLoaded(true)}
          onError={(e: any) => { 
            e.target.src = `https://img.ophim.live/uploads/movies/${movie.thumb_url}`;
            setIsLoaded(true);
          }}
        />
        <div className="ep-tag">{movie.episode_current || 'HD'}</div>
        {focused && <div className="focus-border-glow" />}
      </div>
      
      <div className="title-container">
        <p className="title-text">{movie.name}</p>
      </div>

      <style jsx>{`
        .movie-card-static { 
          width: 100%; outline: none; contain: layout paint; 
          backface-visibility: hidden; transform: translateZ(0);
        }
        .poster-box { 
          position: relative; width: 100%; aspect-ratio: 2/3; 
          border-radius: 12px; overflow: hidden; background: #0a0a0a; 
          will-change: transform;
        }
        .img-content { 
          width: 100%; height: 100%; object-fit: cover; 
          opacity: 0;
          transition: opacity 0.2s ease-in;
        }
        .img-content.loaded { opacity: 0.75; }
        .is-active .img-content.loaded { opacity: 1; transform: scale(1.03); }

        .focus-border-glow { 
          position: absolute; inset: 0; border: 5px solid white; 
          border-radius: 12px; z-index: 10; 
          box-shadow: 0 0 15px rgba(255,255,255,0.4); 
        }
        .ep-tag { 
          position: absolute; top: 8px; right: 8px; background: #facc15; 
          color: black; font-weight: 900; font-size: 10px; 
          padding: 2px 6px; border-radius: 6px; z-index: 20; 
        }
        .title-container {
          margin-top: 10px; height: 36px; display: flex;
          align-items: flex-start; justify-content: center;
        }
        .title-text { 
          text-transform: uppercase; font-weight: 900; text-align: center; 
          width: 100%; color: #666; font-size: 12px; line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;  
          overflow: hidden; text-overflow: ellipsis; word-break: break-word;
        }
        .is-active .title-text { color: white; font-style: italic; }
      `}</style>
    </div>
  );
});

// --- TRANG CHỦ ---
export default function LightspeedHome() {
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(50);
  const [loading, setLoading] = useState(true);
  
  const { ref: pageRef, focusKey, focusSelf } = useFocusable({
    focusKey: 'HOME_PAGE',
    trackChildren: true,
    isFocusBoundary: true
  });

  const loadData = useCallback(async (page: number, targetPos?: { pos: string, col: number }) => {
    setLoading(true);
    try {
      // Dùng API chia trang để TV chỉ phải xử lý đúng 12 phim một lần
      const res = await fetch(`https://ch.3ks.workers.dev/v1/api/danh-sach/hoat-hinh?limit=12&page=${page}`).then(r => r.json());
      const items = res?.data?.items || [];
      
      if (res?.data?.params?.pagination?.totalItems) {
        setTotalPages(Math.ceil(res.data.params.pagination.totalItems / 12));
      }

      setCurrentItems(items);
      setLoading(false);

      requestAnimationFrame(() => {
        const lastSlug = sessionStorage.getItem("last_slug");
        if (lastSlug && !targetPos) {
          setFocus(`MOVIE_${lastSlug}`);
          sessionStorage.removeItem("last_slug");
        } else if (targetPos) {
          const targetIdx = targetPos.pos === 'TOP' ? targetPos.col : targetPos.col + 6;
          if (items[targetIdx]) setFocus(`MOVIE_${items[targetIdx].slug}`);
        } else if (items.length > 0) {
          setFocus(`MOVIE_${items[0].slug}`);
        }
      });
    } catch (e) {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedPage = parseInt(sessionStorage.getItem("last_page") || "1");
    setCurrentPage(savedPage);
    loadData(savedPage);
  }, [loadData]);

  useEffect(() => {
    if (!loading) focusSelf();
  }, [loading, focusSelf]);

  const changePage = useCallback((p: number, pos: string, col: number) => {
    setCurrentPage(p);
    loadData(p, { pos, col });
  }, [loadData]);

  return (
    <FocusContext.Provider value={focusKey}>
      <link rel="dns-prefetch" href="https://wsrv.nl" />
      <link rel="preconnect" href="https://wsrv.nl" crossOrigin="anonymous" />
      
      <main 
        ref={pageRef} 
        className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-[5%] pt-4 overflow-hidden relative`}
      >
        {!loading && (
          <div className="grid grid-cols-6 gap-x-8 gap-y-12 flex-1 content-start h-full overflow-hidden pt-2">
            {currentItems.map((m, i) => (
              <MovieCard 
                key={m.slug} 
                movie={m} 
                index={i} 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={changePage} 
              />
            ))}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center font-black italic text-xl uppercase">
            Loading...
          </div>
        )}

        {/* --- THANH TRẠNG THÁI 3 PHẦN (GIỮ NGUYÊN) --- */}
        {!loading && (
          <div className="absolute bottom-4 left-[5%] right-[5%] flex justify-between items-center opacity-20 font-black italic text-[11px] uppercase tracking-widest border-t border-white/5 pt-2">
            <div className="w-1/3 text-left">ANIME</div>
            <div className="w-1/3 text-center">TRANG {currentPage} / {totalPages}</div>
            <div className="w-1/3 text-right">NHẤN LÊN TRÊN ĐỂ TÌM KIẾM</div>
          </div>
        )}
      </main>
    </FocusContext.Provider>
  );
}