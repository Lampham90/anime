"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ throttle: 80, bypassInitHasFocusTimer: true });
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

const CONFIG = {
  WORKER: process.env.NEXT_PUBLIC_WORKER || "https://ch.3ks.workers.dev",
  ORIGIN_IMG: "https://img.ophim.live/uploads/movies/",
  ITEMS_PER_PAGE: 3, 
  KEYBOARD: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "KHOẢNG CÁCH", "XÓA", "LÀM MỚI"]
};

// --- Sub Components ---

const KeyItem = memo(({ char, onPress }: { char: string, onPress: (c: string) => void }) => {
  const { ref, focused } = useFocusable({
    focusKey: `KEY_${char}`,
    onEnterPress: () => onPress(char)
  });
  return (
    <div ref={ref} className={`flex items-center justify-center rounded-lg font-black transition-all cursor-pointer ${
      focused ? "bg-white text-black scale-110 shadow-xl z-50 border-2 border-white" : "bg-zinc-800 text-zinc-300 border border-white/20"
    }`} style={{ height: '42px' }}>
      <span className={char.length > 1 ? "text-[7px]" : "text-sm"}>{char}</span>
    </div>
  );
});

const SearchResultItem = memo(({ movie, index, page }: any) => {
  const router = useRouter();
  const [isLoaded, setIsLoaded] = useState(false);
  const { ref, focused } = useFocusable({
    focusKey: `POSTER_${page}_${index}`,
    onEnterPress: () => router.push(`/phim/${movie.slug}`),
  });

  const imgUrl = useMemo(() => {
    const raw = movie.thumb_url || movie.poster_url || "";
    if (!raw) return "";
    let finalPath = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    finalPath = finalPath.replace("http://", "https://");
    return `https://wsrv.nl/?url=${encodeURIComponent(finalPath)}&w=180&output=jpg&q=50&il&atyp=vips`;
  }, [movie.slug]);

  return (
    <div ref={ref} className={`flex flex-col transition-all duration-200 ${focused ? "scale-105 z-50 opacity-100" : "opacity-70 scale-95"}`}>
      <div className={`aspect-[2/3] w-full rounded-xl overflow-hidden relative bg-[#0a0a0a] border-2 transition-all duration-300 ${
        focused ? "border-white shadow-[0_0_25px_rgba(255,255,255,0.4)]" : "border-white/5"
      }`}>
        <img 
          src={imgUrl} 
          loading="eager" 
          // @ts-ignore
          fetchpriority="high"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
          onLoad={() => setIsLoaded(true)}
          onError={(e: any) => { e.target.src = `${CONFIG.ORIGIN_IMG}${movie.thumb_url}`; setIsLoaded(true); }}
        />
      </div>
      <p className={`mt-3 text-[13px] font-black uppercase italic px-1 leading-tight tracking-tight ${focused ? "text-white" : "text-zinc-500"}`}>
        {movie.name}
      </p>
    </div>
  );
});

// --- Main Page ---

export default function SearchPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  const { ref: pageRef, focusKey } = useFocusable({ isFocusBoundary: true });

  const handleKeypress = useCallback((char: string) => {
    if (char === "XÓA") setQuery(prev => prev.slice(0, -1));
    else if (char === "LÀM MỚI") { setQuery(""); setResults([]); setPage(1); }
    else if (char === "KHOẢNG CÁCH") setQuery(prev => prev + " ");
    else if (query.length < 25) { setQuery(prev => prev + char); setPage(1); }
  }, [query]);

  useEffect(() => {
    if (!isClient || query.trim().length < 2) { setResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${CONFIG.WORKER}/v1/api/tim-kiem?keyword=${query}&limit=120`).then(r => r.json());
        setResults(res?.data?.items || res?.items || []);
      } catch (err) { setResults([]); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [query, isClient]);

  const totalPages = Math.ceil(results.length / CONFIG.ITEMS_PER_PAGE);
  const displayItems = useMemo(() => {
    const start = (page - 1) * CONFIG.ITEMS_PER_PAGE;
    return results.slice(start, start + CONFIG.ITEMS_PER_PAGE);
  }, [results, page]);

  useEffect(() => {
    if (isClient) { setTimeout(() => setFocus("KEY_A"), 500); }
  }, [isClient]);

  if (!isClient) return <div className="h-screen bg-black" />;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-black text-white flex overflow-hidden selection:bg-transparent`}>
        
        {/* Sidebar Bàn phím */}
        <div className="w-[380px] bg-[#0A0A0A] p-8 flex flex-col border-r border-white/10 z-50 shadow-2xl">
          <div className="mb-8">
             <p className="text-[10px] font-black text-red-600 tracking-[4px] uppercase mb-3 italic">TÌM KIẾM TV</p>
             <div className="h-16 w-full bg-zinc-900 rounded-2xl border-2 border-white/20 flex items-center px-6 overflow-hidden shadow-inner">
               <span className="text-2xl font-black italic uppercase truncate text-white">
                 {query}<span className="animate-pulse ml-1 text-red-600">|</span>
               </span>
             </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-8">
            {CONFIG.KEYBOARD.map(k => <KeyItem key={k} char={k} onPress={handleKeypress} />)}
          </div>

          <div className="mt-auto flex flex-col gap-3">
             <div className="grid grid-cols-2 gap-3">
                <SideBtn label="TRƯỚC" active={page > 1} onClick={() => setPage(p => p - 1)} fk="BTN_PREV" />
                <SideBtn label="TIẾP THEO" active={page < totalPages} onClick={() => setPage(p => p + 1)} fk="BTN_NEXT" />
             </div>
             <SideBtn label="← QUAY LẠI" active={true} onClick={() => router.push('/')} fk="BTN_BACK_HOME" isRed />
          </div>
        </div>

        {/* Khu vực kết quả (3 Cột) */}
        <div className="flex-1 flex flex-col bg-[#050505] p-12 relative">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">
              {searching ? "ĐANG TÌM..." : results.length > 0 ? "KẾT QUẢ" : "NHẬP TÊN PHIM"}
            </h2>
            {totalPages > 0 && (
              <span className="text-[12px] font-black italic text-white uppercase tracking-widest bg-red-600 px-4 py-2 rounded-xl shadow-lg">
                TRANG {page} / {totalPages}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {results.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-12 gap-y-12 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                {displayItems.map((m: any, index: number) => (
                  <SearchResultItem key={`${m.slug}-${page}-${index}`} movie={m} index={index} page={page} />
                ))}
              </div>
            ) : !searching && (
              <div className="h-full w-full flex items-center justify-center opacity-10">
                <p className="text-7xl font-black italic uppercase -rotate-3 tracking-tighter text-center">GÕ TÊN PHIM ĐỂ TÌM</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </FocusContext.Provider>
  );
}

const SideBtn = memo(({ label, active, onClick, fk, isRed }: any) => {
  const { ref, focused } = useFocusable({ focusKey: fk, onEnterPress: onClick });
  if (!active) return <div className="h-12 rounded-xl bg-zinc-900/40 flex items-center justify-center text-[8px] font-black text-zinc-700 opacity-30 uppercase">{label}</div>;
  return (
    <div ref={ref} className={`h-12 rounded-xl flex items-center justify-center text-[10px] font-black italic border-2 cursor-pointer transition-all ${
      focused ? "bg-white text-black scale-105 border-white shadow-[0_0_30px_rgba(255,255,255,0.3)]" : isRed ? "bg-red-600 text-white border-red-500" : "bg-zinc-800 text-zinc-100 border-white/10"
    }`}>{label}</div>
  );
});