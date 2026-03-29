"use client";

import { useMemo, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import Header from '@/components/Header';

const WORKERS = [
  "https://pro1.pl9.workers.dev",
  "https://pro2.phuonglam56973.workers.dev",
  "https://pro3.pplam5697.workers.dev",
  "https://pro4.phuonglam56971.workers.dev",
  "https://pro5.phuonglam56972.workers.dev"
];

const ORIGIN_IMG = "https://img.ophim.live/uploads/movies/";
const fetcher = (url: string) => fetch(url).then(res => res.json());

// --- COMPONENT NHÃN PHIM (ĐỒNG BỘ TRANG CHỦ) ---
const MovieBadge = ({ movie }: { movie: any }) => {
  const rawLang = movie.lang?.toLowerCase() || "";
  const displayLang = rawLang.includes("lồng") ? "LT" : rawLang.includes("thuyết") ? "TM" : "";
  const episode = movie.episode_current;

  return (
    <>
      {/* Nhãn Ngôn ngữ & Năm ở góc trên bên phải */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {displayLang && (
          <div className="bg-red-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg shadow-lg">
            <span className="text-[9px] font-black text-white">{displayLang}</span>
          </div>
        )}
        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 shadow-lg">
          <span className="text-[9px] font-black text-white/90">{movie.year || '2026'}</span>
        </div>
      </div>

      {/* Nhãn Tập phim ở góc dưới bên trái (giống style trang chủ) */}
      {episode && !["full", "1/1", "1"].includes(episode.toLowerCase()) && (
        <div className="absolute bottom-3 left-3 z-10">
          <div className="bg-black/40 backdrop-blur-md border border-white/5 px-2 py-0.5 rounded-lg group-hover:bg-red-600 transition-all duration-300">
            <span className="text-[9px] font-black uppercase italic text-white/90">{episode}</span>
          </div>
        </div>
      )}
    </>
  );
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('keyword') || '';
  const currentPage = parseInt(searchParams.get('page') || '1');

  const proxy = useMemo(() => {
    return WORKERS[Math.floor(Math.random() * WORKERS.length)];
  }, [query]);

  const searchUrl = query ? `${proxy}/v1/api/tim-kiem?keyword=${query}&page=${currentPage}` : null;

  const { data, isValidating } = useSWR(searchUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const { movies, totalPages } = useMemo(() => {
    if (!data?.data?.items) return { movies: [], totalPages: 1 };
    
    const rawItems = data.data.items;
    const filtered = rawItems.filter((m: any) => {
      const name = ((m.name || "") + (m.origin_name || "")).toLowerCase();
      const status = (m.status || "").toLowerCase();
      const current = (m.episode_current || "").toLowerCase();
      return !name.includes('trailer') && status !== 'trailer' && current !== 'trailer';
    });

    const pagination = data.data.params?.pagination;
    const totalItems = pagination?.totalItems || 0;
    const itemsPerPage = pagination?.totalItemsPerPage || 24; // API thường trả 24
    
    return {
      movies: filtered, 
      totalPages: Math.ceil(totalItems / itemsPerPage)
    };
  }, [data]);

  const getPaginationGroup = useCallback(() => {
    let start = Math.max(currentPage - 2, 1);
    let end = Math.min(start + 4, totalPages);
    if (end - start < 4) start = Math.max(end - 4, 1);
    const pages = [];
    for (let i = start; i <= end; i++) { if (i > 0) pages.push(i); }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <main className="min-h-screen w-full bg-[#050505] text-white flex flex-col select-none relative overflow-x-hidden">
      <Header />
      
      {isValidating && (
        <div className="fixed top-0 left-0 right-0 h-[2px] z-[110] overflow-hidden">
          <div className="h-full bg-red-600 animate-loading-bar shadow-[0_0_15px_red]"></div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 md:px-16 max-w-[1800px] mx-auto w-full pt-32 pb-20 relative z-10">
        
        {query && (
          <div className="mb-16 flex flex-col items-start gap-2">
            <h1 className="text-[9px] font-black uppercase tracking-[0.5em] text-white/20 italic">
              SEARCH RESULTS FOR
            </h1>
            <div className="flex items-center gap-4">
               <span className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter text-white">
                 "{query}"
              </span>
              <span className="h-[2px] w-12 bg-red-600 shadow-[0_0_10px_red]"></span>
            </div>
          </div>
        )}

        <div className={`transition-all duration-700 ${isValidating ? 'opacity-40 blur-sm' : 'opacity-100 blur-0'}`}>
          {movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-6 gap-y-12">
              {movies.map((movie: any) => {
                const imgUrl = movie.thumb_url.startsWith('http') ? movie.thumb_url : ORIGIN_IMG + movie.thumb_url;
                
                return (
                  <Link 
                    href={`/phim/${movie.slug}`} 
                    key={movie.slug} 
                    className="group relative flex flex-col w-full"
                  >
                    {/* POSTER CONTAINER */}
                    <div className="relative aspect-[2/3] rounded-[2rem] overflow-hidden border border-white/5 bg-neutral-900 shadow-2xl transition-all duration-500 group-hover:border-red-600/50 group-hover:-translate-y-3 group-hover:shadow-[0_20px_50px_rgba(220,38,38,0.15)]">
                      <img 
                        src={`https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&w=400&fit=cover&output=webp&q=80`} 
                        alt={movie.name}
                        loading="lazy"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
                      />
                      
                      {/* SỬ DỤNG BADGE ĐỒNG BỘ */}
                      <MovieBadge movie={movie} />
                      
                      {/* Gradient phủ dưới ảnh cho nghệ */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    </div>

                    {/* Tên phim */}
                    <div className="mt-5 px-1">
                      <h3 className="text-[10px] md:text-[11px] font-black uppercase text-white/40 tracking-wider leading-tight group-hover:text-red-500 transition-colors line-clamp-2 text-center italic">
                        {movie.name}
                      </h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : query && !isValidating ? (
              <div className="flex flex-col items-center justify-center py-40 gap-6">
                <p className="font-black uppercase italic tracking-[0.5em] text-white/10 text-xs">No movies found</p>
              </div>
          ) : null}
        </div>

        {/* PHÂN TRANG */}
        {movies.length > 0 && totalPages > 1 && (
          <div className="mt-24 flex justify-center">
            <div className="flex items-center gap-2 p-2 bg-white/[0.02] backdrop-blur-3xl rounded-2xl border border-white/5 shadow-2xl">
              {getPaginationGroup().map(p => (
                <button
                  key={p}
                  onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      router.push(`/search?keyword=${query}&page=${p}`);
                  }}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl font-black text-[12px] italic transition-all
                    ${p === currentPage 
                        ? 'bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] scale-110' 
                        : 'text-white/20 hover:text-white hover:bg-white/5'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes loading-bar {
          0% { width: 0%; left: 0; }
          50% { width: 70%; left: 0; }
          100% { width: 100%; left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s infinite ease-in-out;
        }
      `}</style>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <SearchContent />
    </Suspense>
  );
}