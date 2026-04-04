"use client";

export const dynamic = 'force-dynamic';
import { useState, useEffect, memo, useCallback, useMemo, useRef } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';

let SpatialNav: any;
if (typeof window !== "undefined") {
  SpatialNav = require("@noriginmedia/norigin-spatial-navigation");
  SpatialNav.init({ throttle: 80, bypassInitHasFocusTimer: true });
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

const CONFIG = {
  // Ưu tiên lấy link từ biến môi trường NEXT_PUBLIC_WORKER đã cài trên Cloudflare
  // Nếu không tìm thấy (ví dụ chạy ở máy cá nhân) thì mới dùng link mặc định
  WORKER: process.env.NEXT_PUBLIC_WORKER || "https://ch.3ks.workers.dev",
  
  ORIGIN_IMG: "https://img.ophim.live/uploads/movies/",
  ITEMS_PER_PAGE: 12, 
  KEYBOARD: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "KHOẢNG CÁCH", "XÓA", "LÀM MỚI"]
};

export default function SearchHoatHinh() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const lastKeyRef = useRef("KEY_A");

  const { ref: pageRef, focusKey } = SpatialNav.useFocusable({
    isFocusBoundary: true, 
  });

  // Xử lý nút Back trên Remote
  useEffect(() => {
    const handleBackBtn = (e: KeyboardEvent) => {
      if (['Escape', 'Backspace'].includes(e.key) || [27, 8, 10009, 461].includes(e.keyCode)) {
        router.push('/');
      }
    };
    window.addEventListener('keydown', handleBackBtn);
    return () => window.removeEventListener('keydown', handleBackBtn);
  }, [router]);

  const handleKeypress = useCallback((char: string) => {
    lastKeyRef.current = `KEY_${char}`;
    if (char === "XÓA") setQuery(prev => prev.slice(0, -1));
    else if (char === "LÀM MỚI") { setQuery(""); setResults([]); setPage(1); }
    else if (char === "CÁCH") setQuery(prev => prev + " ");
    else if (query.length < 25) { setQuery(prev => prev + char); setPage(1); }
    setTimeout(() => { SpatialNav.setFocus(lastKeyRef.current); }, 5);
  }, [query]);

  // Search API
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${CONFIG.WORKER}/v1/api/tim-kiem?keyword=${query}&limit=120`).then(r => r.json());
        setResults(res?.data?.items || res?.items || []);
      } catch (err) { setResults([]); } finally { setSearching(false); }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const { ref: gridRef } = SpatialNav.useFocusable({
    focusKey: 'RESULTS_GRID',
    trackChildren: true,
    isFocusBoundary: true,
  });

  useEffect(() => {
    setTimeout(() => SpatialNav.setFocus("KEY_A"), 500);
  }, []);

  const totalPages = Math.ceil(results.length / CONFIG.ITEMS_PER_PAGE);
  const displayItems = useMemo(() => {
    const start = (page - 1) * CONFIG.ITEMS_PER_PAGE;
    return results.slice(start, start + CONFIG.ITEMS_PER_PAGE);
  }, [results, page]);

  return (
    <SpatialNav.FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-black text-white flex overflow-hidden`}>
        
        {/* BÀN PHÍM TIẾNG VIỆT */}
        <div className="w-[360px] bg-[#0A0A0A] p-8 flex flex-col border-r border-white/20 z-50 shadow-2xl">
          <HomeButton /> 

          <div className="mb-6">
            <p className="text-[10px] font-black text-red-600 tracking-[4px] uppercase mb-2 italic">TÌM KIẾM</p>
            <div className="h-14 w-full bg-black rounded-xl border-2 border-white/30 flex items-center px-5 overflow-hidden">
              <span className="text-xl font-black italic uppercase truncate text-white">
                {query}<span className="animate-pulse ml-1 text-red-600">|</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-8">
            {CONFIG.KEYBOARD.map(k => <KeyItem key={k} char={k} onPress={handleKeypress} />)}
          </div>

          {totalPages > 1 && (
            <div className="mt-auto grid grid-cols-2 gap-3">
              <PageBtn label="TRƯỚC" active={page > 1} onClick={() => setPage(p => p - 1)} />
              <PageBtn label="TIẾP THEO" active={page < totalPages} onClick={() => setPage(p => p + 1)} />
            </div>
          )}
        </div>

        {/* KẾT QUẢ */}
        <div className="flex-1 flex flex-col bg-[#050505] p-12 overflow-hidden">
          <div className="flex justify-between items-end mb-8">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">
              {searching ? "ĐANG TÌM..." : "KẾT QUẢ"}
            </h2>
            {totalPages > 0 && (
              <span className="text-[11px] font-black italic text-white uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                TRANG {page} / {totalPages}
              </span>
            )}
          </div>

          <div className="flex-1 flex items-center">
            {results.length > 0 ? (
              <div ref={gridRef} className="grid grid-cols-6 gap-x-6 gap-y-12 w-full">
                {displayItems.map((m: any, index: number) => (
                  <SearchResultItem key={`${m.slug}-${page}-${index}`} movie={m} index={index} page={page} />
                ))}
              </div>
            ) : !searching && (
              <div className="w-full text-center opacity-20">
                <p className="text-5xl font-black italic uppercase">NHẬP TÊN PHIM</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </SpatialNav.FocusContext.Provider>
  );
}

// --- NÚT TRANG CHỦ ---
const HomeButton = memo(() => {
  const router = useRouter();
  const { ref, focused } = SpatialNav.useFocusable({
    focusKey: 'BTN_HOME',
    onEnterPress: () => router.push('/'),
    onArrowPress: (dir) => (dir === 'up' ? false : true)
  });
  return (
    <div ref={ref} className={`mb-6 h-10 w-40 rounded-lg flex items-center justify-center transition-all border-2 ${focused ? "bg-red-600 border-white scale-110 shadow-[0_0_25px_rgba(220,38,38,0.6)]" : "bg-zinc-900 border-white/10 opacity-60"}`}>
      <span className="text-[10px] font-black text-white uppercase tracking-tighter">← TRANG CHỦ</span>
    </div>
  );
});

// --- POSTER PHIM SIÊU SÁNG ---
const SearchResultItem = memo(({ movie, index, page }: any) => {
  const router = useRouter();
  const { ref, focused } = SpatialNav.useFocusable({
    focusKey: `POSTER_${page}_${index}`,
    onEnterPress: () => router.push(`/phim/${movie.slug}`),
    onArrowPress: (direction) => (direction === 'up' && index < 6 ? false : true)
  });

  const imgUrl = useMemo(() => {
    const raw = movie.thumb_url || movie.poster_url || "";
    const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=300&fit=cover&output=webp`;
  }, [movie]);

  return (
    <div ref={ref} className={`flex flex-col transition-all duration-300 ${focused ? "scale-110 z-50 opacity-100" : "opacity-75 scale-95"}`}>
      <div className={`aspect-[2/3] w-full rounded-xl overflow-hidden transition-all duration-500 ${
        focused ? "ring-[8px] ring-white drop-shadow-[0_0_50px_rgba(255,255,255,0.7)] brightness-125 contrast-110" : "border-2 border-white/10"
      }`}>
        <img src={imgUrl} className="w-full h-full object-cover" />
      </div>
      <p className={`mt-3 text-[10px] font-black uppercase italic truncate px-1 ${focused ? "text-white" : "text-zinc-200"}`}>
        {movie.name}
      </p>
    </div>
  );
});

// --- PHÍM BẤM BÀN PHÍM ---
const KeyItem = memo(({ char, onPress }: any) => {
  const { ref, focused } = SpatialNav.useFocusable({
    focusKey: `KEY_${char}`,
    onEnterPress: () => onPress(char)
  });
  return (
    <div ref={ref} className={`flex items-center justify-center rounded-lg font-black transition-all ${
      focused ? "bg-white text-black scale-110 shadow-xl z-50" : "bg-zinc-800 text-zinc-300 border border-white/20"
    }`} style={{ height: '42px' }}>
      <span className={char.length > 1 ? "text-[7px]" : "text-sm"}>{char}</span>
    </div>
  );
});

// --- NÚT PHÂN TRANG ---
const PageBtn = memo(({ label, active, onClick }: any) => {
  const { ref, focused } = SpatialNav.useFocusable({
    focusKey: `BTN_${label}`,
    onEnterPress: onClick,
  });
  if (!active) return <div className="h-12 rounded-lg bg-zinc-900/40 flex items-center justify-center text-[7px] font-black text-zinc-700 italic border border-white/10 uppercase opacity-30">{label}</div>;
  return (
    <div ref={ref} className={`h-12 rounded-lg flex items-center justify-center text-[9px] font-black italic transition-all border-2 ${
      focused ? "bg-red-600 text-white scale-105 border-red-500 shadow-lg" : "bg-zinc-900 text-zinc-100 border-white/20"
    }`}>{label}</div>
  );
});