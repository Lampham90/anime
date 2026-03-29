"use client";

import { useState, useEffect, useRef, memo, useCallback } from 'react';
import Link from 'next/link';
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

// --- CONFIGURATION ---
const WORKERS = [
  "https://pro1.pl9.workers.dev",
  "https://pro2.phuonglam56973.workers.dev",
  "https://pro3.pplam5697.workers.dev",
  "https://pro4.phuonglam56971.workers.dev",
  "https://pro5.phuonglam56972.workers.dev"
];

const ORIGIN_IMG = "https://img.ophim.live/uploads/movies/";

const TRENDING_SLUGS = [
  "truc-ngoc", "one-piece-phan-2", "chu-thuat-hoi-chien", "luat-su-bong-ma",
  "frieren-phap-su-tien-tang-phan-2", "chu-thuat-hoi-chien-phan-3",
  "boyfriend-on-demand", "mua-mua-khuynh-thanh", "van-phuc-kim-an", "cai-ten-an-danh",
];

const QUICK_TAGS = [
  { title: "Việt Nam", slug: "viet-nam", type: "quoc-gia", bg: "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)" },
  { title: "Hàn Quốc", slug: "han-quoc", type: "quoc-gia", bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
  { title: "Trung Quốc", slug: "trung-quoc", type: "quoc-gia", bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)" },
  { title: "Âu Mỹ", slug: "au-my", type: "quoc-gia", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
  { title: "Thái Lan", slug: "thai-lan", type: "quoc-gia", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
  { title: "Cine Rạp", slug: "phim-chieu-rap", type: "danh-sach", bg: "linear-gradient(135deg, #f83600 0%, #f9d423 100%)" },
  { title: "Lồng Tiếng", slug: "phim-long-tieng", type: "danh-sach", bg: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)" },
  { title: "Thuyết Minh", slug: "phim-thuyet-minh", type: "danh-sach", bg: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)" },
];

const ALL_CATEGORIES = [
  { title: "Trending Now", type: "danh-sach", slug: "phim-moi-cap-nhat", url: "/v1/api/danh-sach/phim-moi-cap-nhat?limit=40" },
  { title: "Phim Chiếu Rạp", type: "danh-sach", slug: "phim-chieu-rap", url: "/v1/api/danh-sach/phim-chieu-rap?limit=40" },
  { title: "Anime hot new", type: "danh-sach", slug: "hoat-hinh", url: "/v1/api/danh-sach/hoat-hinh?limit=40" },
  { title: "Top 10 Phim Bộ Hot", type: "danh-sach", slug: "phim-bo", url: "/v1/api/danh-sach/phim-bo?limit=24" },
  { title: "Phim Việt Nam Mới", type: "quoc-gia", slug: "viet-nam", url: "/v1/api/quoc-gia/viet-nam?limit=40" },
  { title: "Siêu Phẩm Phim Lẻ", type: "danh-sach", slug: "phim-le", url: "/v1/api/danh-sach/phim-le?limit=40" },
  { title: "Thế Giới Phim Hài", type: "the-loai", slug: "hai-huoc", url: "/v1/api/the-loai/hai-huoc?limit=40" },
  { title: "Ám Ảnh Kinh Dị", type: "the-loai", slug: "kinh-di", url: "/v1/api/the-loai/kinh-di?limit=40" },
];

// --- HELPERS ---
const fetchWithRetry = async (urlSuffix: string) => {
  const shuffledWorkers = [...WORKERS].sort(() => Math.random() - 0.5);
  for (const worker of shuffledWorkers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${worker}${urlSuffix}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) return await res.json();
    } catch (err) { console.warn(`Server ${worker} lỗi...`); }
  }
  throw new Error("Tất cả server đều sập!");
};

interface Movie {
  slug: string;
  name: string;
  origin_name?: string;
  thumb_url: string;
  poster_url: string;
  episode_current?: string;
  year?: number;
  lang?: string;
  status?: string;
  content?: string;
}

interface SectionData {
  title: string;
  type: string;
  slug: string;
  items: Movie[];
}

const getImageUrl = (movie: Movie, isBanner = false) => {
  if (!movie) return "";
  const path = isBanner ? (movie.poster_url || movie.thumb_url) : (movie.thumb_url || movie.poster_url);
  const imgFullUrl = path?.startsWith('http') ? path : `${ORIGIN_IMG}${path}`;
  return `https://images.weserv.nl/?url=${encodeURIComponent(imgFullUrl)}&w=${isBanner ? 1920 : 300}&fit=cover&output=webp&q=80`;
};

// --- CUSTOM HOOK: SUPER SMOOTH DRAG ---
const useDraggableScroll = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const frameId = useRef<number>(0);
  const state = useRef({ isDown: false, startX: 0, scrollLeft: 0, velX: 0, lastX: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    state.current.isDown = true;
    state.current.startX = e.pageX - el.offsetLeft;
    state.current.scrollLeft = el.scrollLeft;
    state.current.velX = 0;
    el.style.scrollBehavior = 'auto';
    el.style.scrollSnapType = 'none';
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!state.current.isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - state.current.startX) * 1.6;
      state.current.velX = x - state.current.lastX;
      state.current.lastX = x;

      cancelAnimationFrame(frameId.current);
      frameId.current = requestAnimationFrame(() => {
        el.scrollLeft = state.current.scrollLeft - walk;
      });

      if (Math.abs(walk) > 10) setIsDragging(true);
    };

    const handleMouseUp = () => {
      if (!state.current.isDown) return;
      state.current.isDown = false;
      setTimeout(() => setIsDragging(false), 50);

      const momentum = () => {
        if (Math.abs(state.current.velX) < 0.2) {
            el.style.scrollSnapType = 'x mandatory';
            return;
        }
        el.scrollLeft -= state.current.velX * 1.5;
        state.current.velX *= 0.92;
        requestAnimationFrame(momentum);
      };
      requestAnimationFrame(momentum);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(frameId.current);
    };
  }, []);

  return { ref, onMouseDown, isDragging };
};

// --- COMPONENTS ---

const InterestSection = () => {
  const { ref, onMouseDown } = useDraggableScroll();
  return (
    <div className="pl-6 md:pl-20 mb-16 relative z-30">
      <h2 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-white mb-6 text-left">Bạn đang quan tâm gì?</h2>
      <div ref={ref} onMouseDown={onMouseDown} className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide pr-10 cursor-grab active:cursor-grabbing select-none will-change-scroll">
        {QUICK_TAGS.map((tag, idx) => (
          <Link key={idx} href={`/${tag.type}/${tag.slug}`} className="min-w-[160px] md:min-w-[200px] aspect-[16/10] rounded-2xl relative overflow-hidden group transition-all duration-300 hover:scale-105 shadow-lg flex-shrink-0" style={{ background: tag.bg }} draggable={false}>
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            <div className="absolute inset-0 p-5 flex flex-col justify-end text-left">
              <h3 className="text-white font-black text-lg md:text-xl italic drop-shadow-md leading-tight">{tag.title}</h3>
              <div className="flex items-center gap-1 mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold uppercase text-white">Xem chủ đề</span>
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const MovieBadge = ({ movie }: { movie: Movie }) => {
  const displayLang = movie.lang?.toLowerCase().includes("lồng") ? "LT" : movie.lang?.toLowerCase().includes("thuyết") ? "TM" : "";
  const episode = movie.episode_current;
  return (
    <>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {displayLang && <div className="bg-red-600/80 backdrop-blur-md px-2 py-0.5 rounded-lg"><span className="text-[9px] font-black text-white">{displayLang}</span></div>}
        <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg"><span className="text-[9px] font-black text-white">{movie.year || '2026'}</span></div>
      </div>
      {episode && !["full", "1/1", "1"].includes(episode.toLowerCase()) && (
        <div className="absolute bottom-3 right-3 z-10">
          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg group-hover:bg-red-600 transition-colors"><span className="text-[9px] font-black text-white uppercase italic tracking-tighter">{episode}</span></div>
        </div>
      )}
    </>
  );
};

const RankedMovieRow = memo(({ section, isTrending = false }: { section: SectionData, isTrending?: boolean }) => {
  const { ref, onMouseDown, isDragging } = useDraggableScroll();
  return (
    <div className={`pl-6 md:pl-20 group/row relative ${isTrending ? 'mb-16' : 'mb-24'}`}>
      <div className="flex items-end justify-between pr-8 md:pr-24 mb-10 border-b border-white/[0.03] pb-3">
        <div className="flex flex-col text-left">
          <span className="text-[7.5px] font-black text-red-600 tracking-[0.5em] uppercase mb-1 italic">{isTrending ? "Must Watch" : "Daily Charts"}</span>
          <h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-white italic">{section.title}</h2>
        </div>
      </div>
      <div ref={ref} onMouseDown={onMouseDown} className="flex gap-4 md:gap-6 overflow-x-auto pb-10 scrollbar-hide snap-x pr-20 cursor-grab active:cursor-grabbing select-none will-change-scroll">
        {section.items.map((movie, index) => (
          <div key={movie.slug} className={`min-w-[170px] md:min-w-[calc(100%/5.5)] snap-start group relative flex flex-col ${isDragging ? 'pointer-events-none' : ''}`}>
            <Link href={`/phim/${movie.slug}`} className="relative aspect-[2/3] w-full rounded-[1.5rem] overflow-hidden border border-white/5 bg-[#0a0a0a] transition-all duration-700 group-hover:-translate-y-3 shadow-2xl" draggable={false}>
              <img src={getImageUrl(movie)} alt={movie.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" loading="lazy" draggable={false} />
              <MovieBadge movie={movie} />
            </Link>
            <div className="mt-5 flex gap-3 items-start pr-2">
              <span className={`text-[35px] md:text-[50px] font-black italic leading-[0.8] ${isTrending ? 'text-red-600' : 'text-yellow-500/80'} group-hover:scale-110 transition-transform`}>{index + 1}</span>
              <div className="flex flex-col pt-1 w-full text-left">
                <h3 className="text-[10px] md:text-[12px] font-black uppercase text-white/90 group-hover:text-red-600 italic transition-colors leading-tight line-clamp-2">{movie.name}</h3>
                <p className="text-[8px] font-bold text-white/30 uppercase mt-1 italic line-clamp-1">{movie.origin_name}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const MovieRow = memo(({ section }: { section: SectionData }) => {
  const { ref, onMouseDown, isDragging } = useDraggableScroll();
  return (
    <div className="pl-6 md:pl-20 group/row relative mb-14">
      <div className="flex items-end justify-between pr-8 md:pr-24 mb-6 border-b border-white/[0.03] pb-3">
        <div className="flex flex-col text-left"><span className="text-[7.5px] font-black text-red-600 tracking-[0.5em] uppercase mb-1 italic">Collection</span><h2 className="text-lg md:text-2xl font-black uppercase tracking-tighter text-white italic leading-none">{section.title}</h2></div>
        <Link href={`/${section.type}/${section.slug}`} className="text-[8.5px] font-black text-white/20 hover:text-white uppercase tracking-[0.3em] transition-all">View All +</Link>
      </div>
      <div ref={ref} onMouseDown={onMouseDown} className="flex gap-4 md:gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x pr-20 cursor-grab active:cursor-grabbing select-none will-change-scroll">
        {section.items.map((movie) => (
          <div key={movie.slug} className={`min-w-[140px] md:min-w-[calc(100%/8.5)] snap-start group relative flex flex-col items-center ${isDragging ? 'pointer-events-none' : ''}`}>
            <Link href={`/phim/${movie.slug}`} className="relative aspect-[2/3] w-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0a0a0a] transition-all duration-700 group-hover:-translate-y-2 group-hover:shadow-[0_15px_40px_rgba(220,38,38,0.2)]" draggable={false}>
              <img src={getImageUrl(movie)} alt={movie.name} className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-700" loading="lazy" draggable={false} />
              <MovieBadge movie={movie} />
            </Link>
            <div className="mt-4 text-center w-full px-2"><h3 className="text-[10px] font-black uppercase text-white/80 group-hover:text-white italic line-clamp-2 leading-tight">{movie.name}</h3></div>
          </div>
        ))}
      </div>
    </div>
  );
});

// --- MAIN PAGE ---
export default function Home() {
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [trendingManual, setTrendingManual] = useState<SectionData | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [currentHero, setCurrentHero] = useState(0);
  const isFetching = useRef(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const heroTimerRef = useRef<NodeJS.Timeout | null>(null);

  const startHeroTimer = useCallback(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    heroTimerRef.current = setInterval(() => setCurrentHero(p => (p + 1) % 8), 7000);
  }, []);

  const fetchTrendingManual = useCallback(async () => {
    try {
      const results = await Promise.all(TRENDING_SLUGS.map(slug => fetchWithRetry(`/v1/api/phim/${slug}`).catch(() => null)));
      const validItems = results
        .filter(r => {
          if (r?.status !== "success" || !r?.data?.item) return false;
          const itm = r.data.item;
          return itm.status !== "trailer" && itm.episodes?.[0]?.server_data?.[0]?.link_m3u8 !== "";
        })
        .map(r => r.data.item);
      if (validItems.length > 0) setTrendingManual({ title: "Top Trending 2026", type: "manual", slug: "trending", items: validItems.slice(0, 14) });
    } catch (e) { console.error(e); }
  }, []);

  const fetchCategory = useCallback(async (index: number) => {
    if (index >= ALL_CATEGORIES.length || isFetching.current) return;
    isFetching.current = true;
    try {
      const cat = ALL_CATEGORIES[index];
      const json = await fetchWithRetry(cat.url);
      const rawItems = json.data?.items || json.items || [];
      const processedItems = rawItems
        .filter((m: any) => {
          const n = m.name?.toLowerCase() || "";
          const s = m.status?.toLowerCase() || "";
          const e = m.episode_current?.toLowerCase() || "";
          return !(n.includes('trailer') || s === "trailer" || e.includes('trailer')) && m.slug;
        })
        .map((m: any) => ({ ...m, thumb_url: m.thumb_url || m.poster_url, year: m.year ? parseInt(m.year) : 2026 }))
        .sort((a: any, b: any) => (b.year || 0) - (a.year || 0));

      if (processedItems.length > 0) {
        if (index === 0) {
          const top8 = processedItems.slice(0, 8);
          setHeroMovies(top8);
          const detailed = await Promise.all(top8.map(async (m: Movie) => {
            try {
              const res = await fetchWithRetry(`/v1/api/phim/${m.slug}`);
              return { ...m, content: res.data?.item?.content?.replace(/<[^>]*>/g, '') || "" };
            } catch { return m; }
          }));
          setHeroMovies(detailed);
        }
        setSections(prev => [...prev, { ...cat, items: processedItems.slice(0, 14) }]);
      }
      setLoadedCount(prev => prev + 1);
    } catch (e) { console.error(e); setLoadedCount(prev => prev + 1); } finally { isFetching.current = false; }
  }, []);

  useEffect(() => { fetchTrendingManual(); fetchCategory(0); }, [fetchCategory, fetchTrendingManual]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !isFetching.current && loadedCount < ALL_CATEGORIES.length) fetchCategory(loadedCount);
    }, { threshold: 0.1, rootMargin: '400px' });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [fetchCategory, loadedCount]);

  useEffect(() => {
    if (heroMovies.length > 0) startHeroTimer();
    return () => { if (heroTimerRef.current) clearInterval(heroTimerRef.current); };
  }, [heroMovies.length, startHeroTimer]);

  return (
    <main className={`${montserrat.className} min-h-screen bg-[#050505] text-white overflow-x-hidden`}>
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .text-shadow-netflix {
          text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.5);
        }
      `}</style>

      {heroMovies.length > 0 && (
        <section className="relative w-full h-[85vh] md:h-[95vh] bg-black overflow-hidden mb-16 border-b border-white/5">
          {heroMovies.map((m, i) => (
            <div key={m.slug} className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${i === currentHero ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-105 pointer-events-none'}`}>
              <img src={getImageUrl(m, true)} className={`w-full h-full object-cover opacity-100 transition-transform duration-[10000ms] ${i === currentHero ? 'scale-110' : 'scale-100'}`} alt={m.name} draggable={false} />
              
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-black/30 z-10" />
              
              <div className="absolute inset-0 z-20 flex flex-col justify-center px-6 md:px-24 pt-20 text-left">
                <div className="max-w-4xl space-y-6">
                  <div className="flex items-center gap-3 drop-shadow-lg"><span className="w-12 h-[3px] bg-red-600 rounded-full"></span><span className="text-red-500 font-black text-[11px] tracking-[0.5em] uppercase italic text-shadow-netflix">Hot Premiere</span></div>
                  
                  <h1 className="text-4xl md:text-7xl font-black uppercase italic text-white leading-[0.95] tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.9)] text-shadow-netflix">{m.name}</h1>
                  
                  {/* PHẦN MÔ TẢ NỘI DUNG PHIM XỊN */}
                  {m.content ? (
                    <p className="text-white/80 font-medium text-sm md:text-base italic max-w-xl line-clamp-2 leading-relaxed text-shadow-netflix">
                      {m.content.slice(0, 150)}...
                    </p>
                  ) : (
                    <div className="h-4 w-48 bg-white/10 animate-pulse rounded" />
                  )}

                  <div className="flex items-center gap-5 text-white/90 font-black italic drop-shadow-md text-sm text-shadow-netflix">
                    <span className="text-yellow-400">★ {m.year || '2026'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    <span className="uppercase tracking-wider">{m.lang !== 'Vietsub' ? m.lang : ''}</span>
                  </div>

                  <div className="pt-6">
                    <Link href={`/phim/${m.slug}`} className="inline-flex items-center gap-3 bg-transparent border-2 border-white/80 hover:border-red-600 text-white hover:text-red-500 px-12 py-4 rounded-full font-black text-[12px] tracking-[0.3em] uppercase transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(220,38,38,0.3)] group hover:scale-105" draggable={false}>
                      <span className="text-xl transition-transform group-hover:scale-125 group-hover:text-red-600">▶</span> <span className="text-shadow-netflix">Xem Ngay</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="absolute bottom-12 left-6 md:left-24 z-30 flex gap-3 p-2 bg-black/20 backdrop-blur-sm rounded-full border border-white/5">
            {heroMovies.map((_, i) => (
              <button key={i} onClick={() => { setCurrentHero(i); startHeroTimer(); }} className={`h-2 transition-all duration-500 rounded-full ${i === currentHero ? 'w-16 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]' : 'w-4 bg-white/30 hover:bg-white/70'}`} />
            ))}
          </div>
        </section>
      )}

      <InterestSection />
      {trendingManual && <RankedMovieRow section={trendingManual} isTrending={true} />}
      <section className="relative z-30 space-y-10 pb-20">
        {sections.map((s) => (s.slug === "phim-bo" ? <RankedMovieRow key={s.slug} section={s} /> : <MovieRow key={s.slug} section={s} />))}
      </section>
      <div ref={loaderRef} className="h-40" />
    </main>
  );
}