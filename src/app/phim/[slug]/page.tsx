"use client";
export const runtime = 'edge';
import { useState, useEffect, useRef, useCallback, use as reactUse } from "react";
import Link from "next/link";

const WORKERS = [
  "https://pro1.pl9.workers.dev",
  "https://pro2.phuonglam56973.workers.dev",
  "https://pro3.pplam5697.workers.dev",
  "https://pro4.phuonglam56971.workers.dev",
  "https://pro5.phuonglam56972.workers.dev"
];

const getRandomWorker = () => WORKERS[Math.floor(Math.random() * WORKERS.length)];

interface Movie {
  name: string;
  slug: string;
  content: string;
  thumb_url: string;
  poster_url: string;
  lang?: string;
  language?: string;
  year?: number;
  episode_current?: string;
}

export default function MovieDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
  const [currentLink, setCurrentLink] = useState<string | null>(null);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<any>({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fetchController = useRef<AbortController | null>(null);

  const getServerPriority = useCallback((name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("lồng tiếng")) return 3;
    if (lowerName.includes("thuyết minh")) return 2;
    return 1;
  }, []);

  const getImageUrl = useCallback((movieObj: any, isBanner = false) => {
    if (!movieObj) return null;
    const path = isBanner ? (movieObj.poster_url || movieObj.thumb_url) : (movieObj.thumb_url || movieObj.poster_url);
    if (!path) return null;
    const originalUrl = path.startsWith('http') ? path : `https://img.ophim.live/uploads/movies/${path}`;
    if (isBanner) return originalUrl;
    return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=300&h=450&fit=cover&output=webp&q=80`;
  }, []);

  const saveHistory = useCallback((epName: string, link: string, index: number) => {
    if (typeof window === "undefined" || !slug) return;
    const curH = JSON.parse(localStorage.getItem("movie_history") || "{}");
    curH[slug] = { epName, link, index, timestamp: Date.now() };
    localStorage.setItem("movie_history", JSON.stringify(curH));
    setHistory(curH);
  }, [slug]);

  const toggleFavorite = useCallback(() => {
    if (!movie) return;
    const movieDataToSave = {
      slug: movie.slug,
      name: movie.name,
      thumb_url: movie.thumb_url,
      year: movie.year || 2024,
      lang: movie.lang || movie.language || "N/A",
      episode_current: movie.episode_current || "Full"
    };
    const savedFavorites = JSON.parse(localStorage.getItem("movie_favorites") || "[]");
    const isExist = savedFavorites.find((m: any) => (m.slug === movie.slug || m === movie.slug));
    let updatedFavorites;
    if (isExist) {
      updatedFavorites = savedFavorites.filter((m: any) => (m.slug ? m.slug !== movie.slug : m !== movie.slug));
      setIsFavorite(false);
    } else {
      updatedFavorites = [movieDataToSave, ...savedFavorites];
      setIsFavorite(true);
    }
    localStorage.setItem("movie_favorites", JSON.stringify(updatedFavorites));
  }, [movie]);

  useEffect(() => {
    setMounted(true);
    if (!slug) return;
    window.scrollTo({ top: 0, behavior: 'instant' }); 
    setLoading(true);
    setIsPlaying(false);
    
    const favorites = JSON.parse(localStorage.getItem("movie_favorites") || "[]");
    setIsFavorite(!!favorites.find((m: any) => (m.slug === slug || m === slug)));
    setHistory(JSON.parse(localStorage.getItem("movie_history") || "{}"));

    fetchController.current = new AbortController();
    
    const fetchData = async () => {
      const SELECTED_PROXY = getRandomWorker();
      try {
        const [resMovie, resRelated] = await Promise.all([
          fetch(`${SELECTED_PROXY}/v1/api/phim/${slug}`, { signal: fetchController.current?.signal }),
          fetch(`${SELECTED_PROXY}/v1/api/danh-sach/phim-moi-cap-nhat?limit=12`, { signal: fetchController.current?.signal })
        ]);
        const [jsonMovie, jsonRelated] = await Promise.all([resMovie.json(), resRelated.json()]);
        const movieData = jsonMovie?.data?.item;
        const episodeData = movieData?.episodes || [];

        if (movieData) {
          setMovie(movieData);
          setServers(episodeData);
          setRelatedMovies(jsonRelated?.data?.items || []);
          const savedHistory = JSON.parse(localStorage.getItem("movie_history") || "{}");
          if (savedHistory[slug]) {
            const h = savedHistory[slug];
            const sIdx = episodeData.findIndex((s: any) => s.server_data.some((ep: any) => ep.link_embed === h.link));
            if (sIdx !== -1) {
              setActiveServer(sIdx);
              setCurrentLink(h.link);
              setCurrentEpIndex(h.index || 0);
            } else { setDefault(episodeData); }
          } else { setDefault(episodeData); }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const setDefault = (epData: any[]) => {
      if (epData.length > 0) {
        let bestIdx = 0, maxP = -1;
        epData.forEach((s: any, i: number) => {
          const p = getServerPriority(s.server_name);
          if (p > maxP) { maxP = p; bestIdx = i; }
        });
        setActiveServer(bestIdx);
        if (epData[bestIdx]?.server_data?.[0]) {
          setCurrentLink(epData[bestIdx].server_data[0].link_embed);
          setCurrentEpIndex(0);
        }
      }
    };
    fetchData();
    return () => fetchController.current?.abort();
  }, [slug, getServerPriority]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white antialiased selection:bg-red-600/30">
      
      {/* 1. PLAYER SECTION */}
      <section className="relative w-full h-[70vh] md:h-[90vh] bg-black overflow-hidden shadow-2xl border-b border-white/5">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : !isPlaying ? (
          <div className="absolute inset-0">
            {getImageUrl(movie, true) && (
              <img 
                src={getImageUrl(movie, true)!} 
                className="w-full h-full object-cover opacity-40 animate-slow-zoom" 
                alt="" 
                fetchPriority="high"
                loading="eager"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/20" />
            <div className="absolute bottom-10 md:bottom-24 left-0 w-full px-6 md:px-20 z-10 space-y-6">
              <h1 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,0,0.5)] max-w-5xl leading-none">
                {movie?.name}
              </h1>
              <div 
                className="max-w-2xl text-white/50 text-sm md:text-base line-clamp-3 font-medium leading-relaxed" 
                dangerouslySetInnerHTML={{ __html: movie?.content || "" }} 
              />
              <div className="flex items-center gap-4 pt-4">
                {/* NÚT XEM NGAY TRONG SUỐT */}
                <button 
                  onClick={() => setIsPlaying(true)} 
                  className="bg-white/5 backdrop-blur-md border border-white/20 text-white px-10 py-4 rounded-full font-black uppercase text-[12px] hover:bg-red-600 hover:border-red-500 hover:shadow-[0_0_30px_red] transition-all duration-500 outline-none"
                >
                   {history[slug!] ? `TIẾP TỤC TẬP ${history[slug!].epName}` : "XEM NGAY"}
                </button>
                <button 
                  onClick={toggleFavorite} 
                  className={`p-4 rounded-full backdrop-blur-md border transition-all duration-500 ${isFavorite ? "bg-red-600 border-red-400 shadow-[0_0_20px_red]" : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30"}`}
                >
                  <svg className={`w-6 h-6 ${isFavorite ? "fill-white" : "fill-none stroke-white stroke-2"}`} viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 bg-black animate-in fade-in duration-700">
            {currentLink && (
                <iframe src={currentLink} className="w-full h-full border-none" allowFullScreen allow="autoplay; encrypted-media"></iframe>
            )}
          </div>
        )}
        
        <Link href="/" className="absolute top-6 left-6 z-50 bg-black/40 backdrop-blur-xl border border-white/10 p-3 rounded-full hover:border-red-600 hover:shadow-[0_0_15px_red] transition-all group">
            <svg className="w-6 h-6 text-white group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
        </Link>
      </section>

      {/* 2. EPISODES SELECTION */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-20 py-16 space-y-20">
        {!loading && (
          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
                <div className="flex items-center gap-6">
                    {/* ĐỔI TIÊU ĐỀ THÀNH CHỌN AUDIO */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <span className="w-1.5 h-7 bg-red-600 rounded-full shadow-[0_0_15px_red]"></span>
                        <h3 className="text-[12px] font-black tracking-[0.4em] uppercase italic text-red-500">CHỌN AUDIO</h3>
                    </div>
                    <div className="relative inline-block" ref={dropdownRef}>
                        <button onClick={() => setIsOpen(!isOpen)} 
                          className={`bg-white/5 backdrop-blur-md border-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-4 transition-all outline-none
                          ${isOpen ? 'border-red-600 shadow-[0_0_20px_red]' : 'border-white/10 hover:border-white/20'}`}>
                            {(servers[activeServer]?.server_name || "Server").replace(/#\d+/g, '').trim()}
                            <svg className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                        </button>
                        {isOpen && (
                            <div className="absolute left-0 mt-2 min-w-full bg-[#0d0d0d]/95 backdrop-blur-xl border-2 border-red-600/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                                {servers.map((s, i) => (
                                    <button key={i} onClick={() => { setActiveServer(i); setIsOpen(false); }} 
                                      className={`flex items-center justify-between w-full px-5 py-4 text-[11px] font-bold uppercase transition-all ${activeServer === i ? "text-red-500 bg-red-600/10" : "hover:bg-white/5 text-white/40"}`}>
                                        {s.server_name.replace(/#\d+/g, '').trim()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-[10px] font-black tracking-widest text-red-500 bg-red-600/10 px-4 py-2 rounded-full border border-red-600/20 w-fit">
                    TẬP ĐANG XEM: {servers[activeServer]?.server_data[currentEpIndex]?.name || "1"}
                </div>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-10 lg:grid-cols-12 gap-4">
                {servers[activeServer]?.server_data.map((ep: any, i: number) => (
                    <button 
                        key={i} 
                        onClick={() => { 
                            setCurrentLink(ep.link_embed); 
                            setCurrentEpIndex(i); 
                            setIsPlaying(true); 
                            saveHistory(ep.name, ep.link_embed, i); 
                            window.scrollTo({ top: 0, behavior: 'smooth' }); 
                        }}
                        // ✅ KHÔI PHỤC GLOW VIỀN & NỀN TRONG SUỐT CHO TẬP PHIM
                        className={`py-4 rounded-xl text-xs font-black transition-all border-2 outline-none
                        ${currentEpIndex === i 
                          ? "bg-black border-red-600 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.8)] scale-105 z-10" 
                          : "bg-white/5 border-white/5 text-white/30 hover:border-red-600/60 hover:text-white"}`}
                    >
                        {ep.name}
                    </button>
                ))}
            </div>
          </section>
        )}

        {/* 3. RELATED MOVIES */}
        {relatedMovies.length > 0 && (
          <section className="space-y-10 pb-20">
            <h2 className="text-xs font-black tracking-[0.5em] text-white/20 uppercase italic flex items-center gap-5">
              <span className="w-14 h-[2px] bg-red-600 shadow-[0_0_10px_red]"></span> ĐỀ XUẤT CHO BẠN
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
              {relatedMovies.map((item: any) => (
                <Link href={`/phim/${item.slug}`} key={item.slug} className="group outline-none">
                  <div className="relative aspect-[2/3] rounded-3xl overflow-hidden border border-white/5 bg-[#0a0a0a] transition-all duration-500 group-hover:border-red-600 group-hover:shadow-[0_0_30px_rgba(220,38,38,0.3)] group-hover:-translate-y-2">
                    <img src={getImageUrl(item)!} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" alt="" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-white/40 group-hover:text-red-500 transition-colors line-clamp-1 italic">
                      {item.name}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <style jsx global>{`
        @keyframes slow-zoom { 0% { transform: scale(1); } 100% { transform: scale(1.15); } }
        .animate-slow-zoom { animation: slow-zoom 30s linear infinite alternate; }
      `}</style>
    </div>
  );
}