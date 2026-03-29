"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";

export default function FavoritesPage() {
  const [favoriteMovies, setFavoriteMovies] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load dữ liệu từ localStorage ngay khi component mount
  useEffect(() => {
    setMounted(true);
    const saved = JSON.parse(localStorage.getItem("movie_favorites") || "[]");
    setFavoriteMovies(saved);
  }, []);

  const removeFavorite = useCallback((e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const updated = favoriteMovies.filter((m) => m.slug !== slug);
    localStorage.setItem("movie_favorites", JSON.stringify(updated));
    setFavoriteMovies(updated);
  }, [favoriteMovies]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#050505] text-white select-none relative overflow-x-hidden">
      <Header />

      <div className="max-w-[2000px] mx-auto px-6 md:px-12 pt-32 pb-20">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8 border-b border-white/5 pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="w-2 h-10 bg-red-600 rounded-full shadow-[0_0_20px_red]"></span>
              <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
                Bộ sưu tập <span className="text-red-600">của tôi</span>
              </h1>
            </div>
            <p className="text-white/30 text-[10px] font-black tracking-[0.5em] uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              {favoriteMovies.length} Phim đã sẵn sàng xem
            </p>
          </div>
          
          <Link href="/" className="group flex items-center gap-3 bg-white/5 border border-white/10 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Quay lại trang chủ
          </Link>
        </header>

        {favoriteMovies.length === 0 ? (
          <div className="h-[40vh] flex flex-col items-center justify-center text-center space-y-8">
            <div className="relative p-10 rounded-full bg-white/5 border border-white/10 opacity-20">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">Danh sách yêu thích đang trống</p>
            <Link href="/" className="bg-red-600 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-110 active:scale-95 transition-all shadow-2xl">Khám phá phim mới</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {favoriteMovies.map((movie) => {
              const rawLang = movie.lang?.toLowerCase() || "";
              let displayLang = rawLang.includes("lồng") ? "LT" : rawLang.includes("thuyết") ? "TM" : "";
              const episode = movie.episode_current;
              const imgUrl = movie.thumb_url?.startsWith('http') ? movie.thumb_url : `https://img.ophim.live/uploads/movies/${movie.thumb_url}`;

              return (
                <div key={movie.slug} className="group relative">
                  {/* Nút xóa nhanh */}
                  <button 
                    onClick={(e) => removeFavorite(e, movie.slug)}
                    className="absolute -top-3 -right-3 z-[30] p-3 rounded-xl bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-2xl border-4 border-[#050505]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <Link href={`/phim/${movie.slug}`} className="block">
                    <div className="relative aspect-[2/3] rounded-[2.5rem] overflow-hidden border border-white/5 bg-[#0a0a0a] transition-all duration-500 group-hover:border-red-600/50 group-hover:-translate-y-3 shadow-2xl">
                      <img 
                        src={`https://images.weserv.nl/?url=${encodeURIComponent(imgUrl)}&w=400&fit=cover&output=webp&q=80`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" 
                        alt={movie.name} 
                      />

                      {/* Labels */}
                      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                        {displayLang && (
                          <div className="bg-red-600/80 backdrop-blur-md px-2 py-0.5 rounded-lg">
                            <span className="text-[9px] font-black text-white">{displayLang}</span>
                          </div>
                        )}
                        <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10">
                          <span className="text-[9px] font-black text-white">{movie.year}</span>
                        </div>
                      </div>

                      {/* Episode Badge */}
                      {episode && !["full", "1/1", "1"].includes(episode.toLowerCase()) && (
                        <div className="absolute bottom-4 right-4 z-10">
                          <div className="bg-black/60 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-lg group-hover:bg-red-600 transition-colors">
                            <span className="text-[9px] font-black uppercase italic tracking-tighter text-white">{episode}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                    </div>

                    <div className="mt-6 px-2">
                      <h3 className="text-[11px] md:text-[12px] font-black uppercase tracking-widest text-white/40 group-hover:text-red-600 transition-colors line-clamp-2 italic text-center leading-relaxed">
                        {movie.name}
                      </h3>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}