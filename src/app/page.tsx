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

const workerCode = `
  self.onmessage = function(e) {
    const { type, allMovies, page, limit } = e.data;
    if (type === 'PROCESS_PAGE') {
      const start = (page - 1) * limit;
      self.postMessage({ items: allMovies.slice(start, start + limit) });
    }
  };
`;

const MovieCard = memo(({ movie, index, currentPage, totalPages, onPageChange }: any) => {
  const router = useRouter();
  const isTop = index < 6;

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
        onPageChange(currentPage + 1, 'TOP', index - 6); return false;
      }
      return true;
    }
  });

  const imgUrl = useMemo(() => {
      const raw = movie.thumb_url || movie.poster_url || "";
      const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
      return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=300&fit=cover&output=webp`;
    }, [movie]);


  return (
    <div ref={ref} className={`movie-card-static ${focused ? 'is-active' : ''}`}>
      <div className="poster-box">
        <img 
          key={movie.slug}
          src={imgUrl} 
          loading="lazy" 
          alt="" 
          className="img-content"
          crossOrigin="anonymous"
          onError={(e: any) => { e.target.src = `https://img.ophim.live/uploads/movies/${movie.thumb_url}`; }}
        />
        <div className="ep-tag">{movie.episode_current || 'HD'}</div>
        {/* Viền trắng khi focus */}
        {focused && <div className="focus-border-glow" />}
      </div>
      <p className="title-text">{movie.name}</p>

      <style jsx>{`
        .movie-card-static { width: 100%; outline: none; contain: content; }
        
        .poster-box { 
          position: relative; 
          width: 100%; 
          aspect-ratio: 2/3; 
          border-radius: 12px; 
          overflow: hidden; 
          background: #1a1a1a; 
          transition: transform 0.1s ease;
        }

        .img-content { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
          /* TĂNG ĐỘ SÁNG TẠI ĐÂY */
          opacity: 0.75; 
          filter: grayscale(0.2) brightness(0.85); 
          transition: all 0.15s ease-in-out; 
        }

        .is-active .img-content { 
          opacity: 1; 
          filter: grayscale(0) brightness(1.1); 
        }

        .focus-border-glow { 
          position: absolute; 
          inset: 0; 
          border: 6px solid white; 
          border-radius: 12px; 
          z-index: 10; 
          /* Thêm bóng đổ lan tỏa ra ngoài cho đẹp */
          box-shadow: 0 0 30px rgba(255,255,255,0.5), inset 0 0 15px rgba(255,255,255,0.2); 
        }

        .ep-tag { 
          position: absolute; 
          top: 8px; 
          right: 8px; 
          background: #facc15; 
          color: black; 
          font-weight: 900; 
          font-size: 10px; 
          padding: 2px 6px; 
          border-radius: 6px; 
          z-index: 20; 
        }

        .title-text { 
          margin-top: 10px; 
          text-transform: uppercase; 
          font-weight: 900; 
          text-align: center; 
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          width: 100%; 
          color: #666; /* Tăng độ sáng tiêu đề phim không chọn */
          font-size: 13px; 
          transition: color 0.1s;
        }

        .is-active .title-text { 
          color: white; 
          font-style: italic; 
          font-size: 14px; 
        }
      `}</style>
    </div>
  );
});

export default function LightspeedHome() {
  const [allMovies, setAllMovies] = useState<any[]>([]);
  const [currentItems, setCurrentItems] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const workerRef = useRef<Worker | null>(null);
  
  // CHIÊU 1: Gán focusKey cho main để quản lý tập trung
  const { ref: pageRef, focusKey, focusSelf } = useFocusable({
    focusKey: 'HOME_PAGE',
    trackChildren: true,
    isFocusBoundary: true
  });

  useEffect(() => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    workerRef.current = new Worker(URL.createObjectURL(blob));
    
    workerRef.current.onmessage = (e) => { 
      setCurrentItems(e.data.items); 
      setLoading(false); 
      
      // CHIÊU 2: Sau khi có data, đợi DOM render xong rồi mới ép focus
      requestAnimationFrame(() => {
        const lastSlug = sessionStorage.getItem("last_slug");
        if (lastSlug) {
          setFocus(`MOVIE_${lastSlug}`);
          sessionStorage.removeItem("last_slug"); // Xóa để lần sau vào lại từ đầu
        } else if (e.data.items.length > 0) {
          setFocus(`MOVIE_${e.data.items[0].slug}`);
        }
      });
    };

    fetch(`https://ch.3ks.workers.dev/v1/api/danh-sach/hoat-hinh?limit=600`)
      .then(r => r.json())
      .then(res => {
        const items = res?.data?.items || [];
        setAllMovies(items);
        const savedPage = parseInt(sessionStorage.getItem("last_page") || "1");
        setCurrentPage(savedPage);
        workerRef.current?.postMessage({ type: 'PROCESS_PAGE', allMovies: items, page: savedPage, limit: 12 });
      });

    return () => workerRef.current?.terminate();
  }, []);

  // Đảm bảo focus không bị lạc trôi khi quay lại
  useEffect(() => {
    if (!loading) {
      focusSelf();
    }
  }, [loading, focusSelf]);

  const changePage = useCallback((p: number, pos: string, col: number) => {
    setCurrentPage(p);
    workerRef.current?.postMessage({ type: 'PROCESS_PAGE', allMovies: allMovies, page: p, limit: 12 });
    const targetIdx = (p - 1) * 12 + (pos === 'TOP' ? col : col + 6);
    const target = allMovies[targetIdx];
    if (target) setTimeout(() => setFocus(`MOVIE_${target.slug}`), 0);
  }, [allMovies]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center text-white font-black italic text-2xl uppercase">Loading...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main 
        ref={pageRef} 
        className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white flex flex-col px-[5%] pt-4 overflow-hidden relative`}
      >
        <div className="grid grid-cols-6 gap-x-8 gap-y-12 flex-1 content-start h-full overflow-hidden pt-2">
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
        <div className="absolute bottom-4 right-8 opacity-5 text-[10px] font-black italic uppercase">P.{currentPage}</div>
      </main>
    </FocusContext.Provider>
  );
}