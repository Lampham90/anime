"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback, useMemo, memo, use as reactUse } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

// Tối ưu cho Smart TV
if (typeof window !== "undefined") {
  init({ throttle: 5, bypassUserAgentCheck: true }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });
const CONFIG = { ORIGIN_IMG: "https://img.ophim.live/uploads/movies/" };

const TimeDisplay = memo(({ currentTime, duration }: { currentTime: number, duration: number }) => {
  const format = (s: number) => {
    if (isNaN(s) || s < 0) return "00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
  };
  return (
    <div className="flex justify-between mb-4 font-black italic text-sm uppercase tracking-tighter">
      <div className="flex flex-col text-left">
        <span className="text-red-600 text-3xl">{format(currentTime)}</span>
        <span className="text-white/20 text-[10px]">TIẾN ĐỘ</span>
      </div>
      <span className="text-white/40 self-end text-xl">{format(duration)}</span>
    </div>
  );
});
TimeDisplay.displayName = "TimeDisplay";

const TVButton = memo(({ name, onClick, focusKey: fk, isActive, isPrimary }: any) => {
  const { ref, focused } = useFocusable({ focusKey: fk, onEnterPress: onClick });
  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [focused]);
  return (
    <div className="relative w-fit transform-gpu"> 
      {focused && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-[100] pointer-events-none">
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600 animate-bounce" />
        </div>
      )}
      <button
        ref={ref}
        onClick={onClick}
        className={`px-7 py-3 rounded-2xl font-black transition-all duration-150 outline-none border-2 text-[11px] uppercase tracking-tighter flex items-center justify-center transform-gpu ${
          isActive ? "bg-red-600 text-white border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]" : 
          focused ? "bg-white text-black scale-105 shadow-[0_0_40px_rgba(255,255,255,0.7)] z-50 border-white" : 
          isPrimary ? "bg-zinc-100 text-black border-white" : "bg-zinc-900/60 text-zinc-400 border-white/10"
        }`}
      >
        {name}
      </button>
    </div>
  );
});
TVButton.displayName = "TVButton";

export default function MovieDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  const [movie, setMovie] = useState<any>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  
  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (!isClient) return;
    (async () => {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_WORKER || 'https://ch.3ks.workers.dev'}/v1/api/phim/${slug}`);
        const json = await r.json();
        if (json?.data?.item) {
          setMovie(json.data.item);
          setServers(json.data.item.episodes || []);
          const saved = localStorage.getItem(`last_ep_${slug}`);
          if (saved) {
            const { epIdx, svIdx } = JSON.parse(saved);
            setCurrentEpIndex(epIdx);
            setActiveServer(svIdx);
          }
        }
      } catch (e) { console.error(e); }
      finally {
        setIsLoading(false);
        requestAnimationFrame(() => setTimeout(() => setFocus("MAIN_PLAY_BTN"), 200));
      }
    })();
  }, [slug, isClient]);

  // HÀM THOÁT PLAYER
  const exitPlayer = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.currentTime > 5) {
        localStorage.setItem(`progress_${slug}_${currentEpIndex}`, videoRef.current.currentTime.toString());
      }
      videoRef.current.pause();
    }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    
    setIsPlaying(false);
    setShowQuickMenu(false);
    setShowControls(false);

    if (document.fullscreenElement || (document as any).webkitIsFullScreen) {
      document.exitFullscreen().catch(() => {});
    }
    
    requestAnimationFrame(() => setTimeout(() => setFocus("MAIN_PLAY_BTN"), 200));
  }, [slug, currentEpIndex]);

  // FIX LỖI THOÁT FULLSCREEN (Sửa lỗi cú pháp onFSChange)
  useEffect(() => {
    const onFSChange = () => {
      const isFS = !!(document.fullscreenElement || (document as any).webkitIsFullScreen);
      if (!isFS && isPlaying) {
        exitPlayer();
      }
    };
    document.addEventListener("fullscreenchange", onFSChange);
    document.addEventListener("webkitfullscreenchange", onFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFSChange);
      document.removeEventListener("webkitfullscreenchange", onFSChange);
    };
  }, [isPlaying, exitPlayer]);

  const fastSeek = useCallback((amount: number) => {
    const v = videoRef.current;
    if (!v || isNaN(v.duration)) return;
    setShowControls(true);
    const targetTime = Math.max(0, Math.min(v.currentTime + amount, v.duration));
    requestAnimationFrame(() => {
      v.currentTime = targetTime;
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${targetTime / v.duration})`;
      }
    });
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const startPlay = useCallback(() => {
    const link = servers[activeServer]?.server_data[currentEpIndex]?.link_m3u8;
    if (!link || !videoRef.current) return;

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ capLevelToPlayerSize: true, backBufferLength: 30, maxBufferLength: 15, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(link);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const saved = localStorage.getItem(`progress_${slug}_${currentEpIndex}`);
        if (saved && videoRef.current) videoRef.current.currentTime = parseFloat(saved);
        videoRef.current?.play().catch(() => {});
        playerContainerRef.current?.requestFullscreen().catch(() => {});
      });
    }
  }, [servers, activeServer, currentEpIndex, slug]);

  useEffect(() => { if (isPlaying) startPlay(); }, [isPlaying, startPlay]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const syncUI = () => {
      setDisplayTime(v.currentTime);
      setDuration(v.duration);
      if (progressBarRef.current && v.duration) {
        progressBarRef.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
      }
    };
    v.addEventListener('timeupdate', syncUI);
    v.addEventListener('seeking', syncUI); 
    v.addEventListener('loadedmetadata', syncUI);
    const onEnd = () => {
      if (currentEpIndex < servers[activeServer]?.server_data?.length - 1) {
        setCurrentEpIndex(prev => prev + 1);
      } else { exitPlayer(); }
    };
    v.addEventListener('ended', onEnd);
    return () => {
      v.removeEventListener('timeupdate', syncUI);
      v.removeEventListener('seeking', syncUI);
      v.removeEventListener('loadedmetadata', syncUI);
      v.removeEventListener('ended', onEnd);
    };
  }, [isPlaying, currentEpIndex, activeServer, servers, exitPlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isBack = e.key === "Escape" || e.key === "Backspace" || e.keyCode === 10009 || e.keyCode === 461;
      
      if (isPlaying) {
        if (isBack) {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (showQuickMenu) { setShowQuickMenu(false); } 
          else { exitPlayer(); }
          return;
        }
        
        switch(e.key) {
          case "ArrowRight": e.preventDefault(); fastSeek(20); break;
          case "ArrowLeft": e.preventDefault(); fastSeek(-20); break;
          case "ArrowUp":
          case "ArrowDown":
            e.preventDefault(); 
            setShowQuickMenu(true);
            requestAnimationFrame(() => setTimeout(() => setFocus(`QUICK_EP_${currentEpIndex}`), 10));
            break;
          case "Enter":
            e.preventDefault();
            if (videoRef.current) {
              videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
              setShowControls(true);
              if (controlsTimer.current) clearTimeout(controlsTimer.current);
              controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
            }
            break;
        }
      } else if (isBack) {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isPlaying, showQuickMenu, currentEpIndex, router, exitPlayer, fastSeek]);

  const finalImgUrl = useMemo(() => {
    if (!movie) return "";
    const raw = movie.thumb_url || movie.poster_url || ""; 
    const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=400&fit=cover&output=webp&q=80`;
  }, [movie]);

  if (!isClient) return <div className="h-screen bg-black" />;
  if (isLoading) return <div className="h-screen bg-[#020202] flex items-center justify-center text-red-600 font-black italic animate-pulse tracking-widest uppercase text-xs">Loading Cinema...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white overflow-hidden relative flex justify-center transform-gpu`}>
        
        {/* BACKGROUND LAYER */}
        <div className="fixed inset-0 z-0 opacity-10 blur-[120px] scale-125 transform-gpu pointer-events-none transition-opacity duration-1000"
          style={{ opacity: isPlaying ? 0 : 0.1 }}>
          <img src={finalImgUrl} className="w-full h-full object-cover" alt="" />
        </div>

        {/* 1. DETAIL LAYER (Chỉ hiển thị khi KHÔNG phát phim) */}
        {!isPlaying && (
          <div className="relative z-10 w-[85vw] max-w-7xl pt-20 transition-all duration-700 animate-in fade-in zoom-in-95">
            <div className="flex gap-24 items-start w-full">
              <div className="w-[340px] flex-shrink-0 shadow-2xl rounded-[50px] overflow-hidden border-2 border-white/10">
                <img src={finalImgUrl} className="w-full aspect-[2/3] object-cover" alt="poster" />
              </div>
              <div className="flex-1 flex flex-col pt-4">
                <div className="mb-14 w-44 opacity-40 hover:opacity-100 transition-opacity">
                  <TVButton focusKey="BACK_HOME" name="← TRANG CHỦ" onClick={() => router.push("/")} />
                </div>
                <h1 className="text-7xl font-black mb-10 italic uppercase leading-[0.9] drop-shadow-2xl">{movie?.name}</h1>
                <div className="mb-20">
                  <TVButton focusKey="MAIN_PLAY_BTN" name={currentEpIndex > 0 ? `TIẾP TẬP ${servers[activeServer]?.server_data[currentEpIndex]?.name}` : `PHÁT PHIM`} isPrimary onClick={() => setIsPlaying(true)} />
                </div>
                <div className="space-y-14">
                  <div>
                    <h3 className="text-white/20 font-black mb-5 uppercase text-[10px] tracking-[0.6em] italic">Ngôn ngữ</h3>
                    <div className="flex flex-wrap gap-3">
                      {servers.map((s, i) => (
                        <TVButton key={`sv-${i}`} focusKey={`SV_BTN_${i}`} name={s.server_name.includes('Viet') ? 'VIỆT SUB' : 'THUYẾT MINH'} isActive={activeServer === i} onClick={() => { setActiveServer(i); setCurrentEpIndex(0); }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-red-600/40 font-black mb-5 uppercase text-[10px] tracking-[0.6em] italic">Danh sách tập</h3>
                    <div className="flex flex-wrap gap-2.5 bg-white/5 p-8 rounded-[35px] ring-1 ring-white/10 max-h-[35vh] overflow-y-auto no-scrollbar transform-gpu">
                      {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
                          <TVButton key={`ep-${i}`} focusKey={`PAGE_EP_BTN_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setIsPlaying(true); }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PLAYER LAYER (Đè lên toàn màn hình khi Play) */}
        {isPlaying && (
          <div 
            ref={playerContainerRef}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-500"
          >
            <video ref={videoRef} className="w-full h-full object-contain" />
            
            {showControls && !showQuickMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[80%] bg-black/70 backdrop-blur-3xl p-10 rounded-[50px] border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                  <TimeDisplay currentTime={displayTime} duration={duration} />
                  <div className="relative h-3 w-full bg-white/10 rounded-full overflow-hidden mt-4">
                      <div 
                          ref={progressBarRef} 
                          className="absolute inset-0 bg-red-600 origin-left transform-gpu transition-transform duration-150 ease-out"
                          style={{ transform: `scaleX(${duration ? displayTime / duration : 0})` }}
                      />
                  </div>
              </div>
            )}

            {showQuickMenu && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl flex flex-col justify-center px-24 z-[100] animate-in fade-in duration-200">
                <h2 className="text-white font-black text-6xl mb-12 italic border-l-8 border-red-600 pl-8 uppercase tracking-tighter">Chọn tập phim</h2>
                <div className="flex flex-wrap gap-4 p-4 max-h-[60vh] overflow-y-auto no-scrollbar transform-gpu">
                  {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
                    <TVButton key={`q-${i}`} focusKey={`QUICK_EP_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setShowQuickMenu(false); }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </main>
    </FocusContext.Provider>
  );
}