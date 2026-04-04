"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo, use as reactUse } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus } from "@noriginmedia/norigin-spatial-navigation";

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });
const CONFIG = { ORIGIN_IMG: "https://img.ophim.live/uploads/movies/" };

const GlobalStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .shimmer-box { background: linear-gradient(90deg, #0a0a0a 25%, #1a1a1a 50%, #0a0a0a 75%); background-size: 200% 100%; animation: shimmer 2s infinite linear; }
    .ambient-glow { filter: blur(60px); transition: transform 0.6s ease, opacity 0.6s ease; opacity: 0.25; pointer-events: none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .video-layer { position: fixed; inset: 0; z-index: 9999; background: #000; display: flex; visibility: visible; }
  `}} />
);

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
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-[99]">
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-red-600 animate-bounce" />
        </div>
      )}
      <button
        ref={ref}
        onClick={onClick}
        className={`px-5 py-2 rounded-xl font-black transition-all duration-150 outline-none border-2 text-[10px] uppercase flex items-center justify-center ${
          isActive ? "bg-red-600 text-white border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.5)]" : 
          focused ? "bg-white text-black scale-105 shadow-[0_0_40px_rgba(255,255,255,0.8)] z-50 border-white" : 
          isPrimary ? "bg-zinc-100 text-black border-white shadow-lg" : "bg-zinc-900/40 text-zinc-400 border-white/5"
        }`}
      >
        {name}
      </button>
    </div>
  );
});

export default function MovieDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimer = useRef<any>(null);

  const [movie, setMovie] = useState<any>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState(0);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isImgLoaded, setIsImgLoaded] = useState(false);

  const [duration, setDuration] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  
  const { ref: pageRef, focusKey } = useFocusable({ trackChildren: true });

  useEffect(() => {
    // Tìm dòng fetch trong useEffect
fetch(`${process.env.NEXT_PUBLIC_WORKER || 'https://ch.3ks.workers.dev'}/v1/api/phim/${slug}`)
      .then(r => r.json())
      .then(json => {
        const item = json?.data?.item;
        if (item) {
          setMovie(item);
          setServers(item.episodes || []);
          const saved = localStorage.getItem(`last_ep_${slug}`);
          if (saved) {
            const { epIdx, svIdx } = JSON.parse(saved);
            setCurrentEpIndex(epIdx);
            setActiveServer(svIdx);
          }
        }
        setIsLoading(false);
        setTimeout(() => setFocus("MAIN_PLAY_BTN"), 100);
      });
  }, [slug]);

  const exitPlayer = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.currentTime > 5) {
        localStorage.setItem(`progress_${slug}_${currentEpIndex}`, videoRef.current.currentTime.toString());
      }
      videoRef.current.pause();
      videoRef.current.src = "";
      videoRef.current.load();
    }
    if (hlsRef.current) {
      hlsRef.current.detachMedia();
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
    }
    setIsPlaying(false);
    setShowQuickMenu(false);
    setShowControls(false);
    setTimeout(() => setFocus("MAIN_PLAY_BTN"), 200);
  }, [slug, currentEpIndex]);

  useEffect(() => {
    const handleFSChange = () => {
      if (isPlaying && !document.fullscreenElement) exitPlayer();
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("webkitfullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("webkitfullscreenchange", handleFSChange);
    };
  }, [isPlaying, exitPlayer]);

  const startPlay = useCallback(() => {
    const link = servers[activeServer]?.server_data[currentEpIndex]?.link_m3u8;
    if (!link || !videoRef.current) return;
    localStorage.setItem(`last_ep_${slug}`, JSON.stringify({ epIdx: currentEpIndex, svIdx: activeServer }));

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({
  capLevelToPlayerSize: true,
  maxBufferLength: 10, // Giảm xuống 10 giây để nhẹ RAM
  maxBufferSize: 30 * 1000 * 1000, // Giới hạn 30MB buffer
  lowLatencyMode: true,
});
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

  useEffect(() => { if (isPlaying) startPlay(); }, [isPlaying, currentEpIndex, activeServer, startPlay]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTimeUpdate = () => setDisplayTime(v.currentTime);
    const onLoadedMetadata = () => setDuration(v.duration);
    const onEnded = () => {
      if (currentEpIndex < servers[activeServer]?.server_data?.length - 1) {
        setCurrentEpIndex(prev => prev + 1);
      } else { exitPlayer(); }
    };
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate);
      v.removeEventListener('loadedmetadata', onLoadedMetadata);
      v.removeEventListener('ended', onEnded);
    };
  }, [isPlaying, currentEpIndex, activeServer, servers, exitPlayer]);

  const handleSeek = (amount: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.currentTime + amount, duration));
    videoRef.current.currentTime = newTime;
    setDisplayTime(newTime);
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isBack = e.key === "Backspace" || e.key === "Escape" || e.keyCode === 10009;
      if (isPlaying) {
        if (isBack) {
          e.preventDefault();
          if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => exitPlayer());
          } else { exitPlayer(); }
          return;
        }
        if (showQuickMenu) return;
        if (e.key === "ArrowRight") { e.preventDefault(); handleSeek(30); }
        if (e.key === "ArrowLeft") { e.preventDefault(); handleSeek(-30); }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          setShowQuickMenu(true);
          setTimeout(() => setFocus(`QUICK_EP_${currentEpIndex}`), 50);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause();
          setShowControls(true);
        }
      } else if (isBack) {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPlaying, showQuickMenu, currentEpIndex, duration, router, exitPlayer]);

  const finalImgUrl = useMemo(() => {
    if (!movie) return "";
    const raw = movie.thumb_url || movie.poster_url || ""; 
    const base = raw.startsWith('http') ? raw : `${CONFIG.ORIGIN_IMG}${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=400&fit=cover&output=webp`;
  }, [movie]);

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center text-red-600 font-black italic">LOADING...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <GlobalStyles />
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white overflow-hidden p-12 relative flex justify-center selection:bg-transparent`}>
        
        {!isPlaying && (
          <div className="fixed inset-0 z-0 opacity-10 blur-[100px] scale-125 transform-gpu pointer-events-none">
            <img src={finalImgUrl} className="w-full h-full object-cover" />
          </div>
        )}

        {isPlaying && (
          <div ref={playerContainerRef} className="video-layer">
            <video ref={videoRef} className="w-full h-full object-contain" />
            {showControls && !showQuickMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[70%] bg-zinc-900/90 p-6 rounded-[30px] border border-white/5 shadow-2xl backdrop-blur-md">
                  <div className="flex justify-between mb-3 font-black text-xl text-red-600">
                      <span>{formatTime(displayTime)}</span>
                      <span className="text-white/40">{formatTime(duration)}</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-100" style={{ width: `${(displayTime / duration) * 100}%` }} />
                  </div>
              </div>
            )}
            {showQuickMenu && (
              <div className="absolute inset-0 bg-black/95 flex flex-col justify-center px-24 z-[100] animate-in fade-in duration-300">
                <h2 className="text-white font-black text-4xl mb-10 italic uppercase border-l-4 border-red-600 pl-6">Chọn tập nhanh</h2>
                <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto no-scrollbar py-4">
                  {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
                    <TVButton key={`q-${i}`} focusKey={`QUICK_EP_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setShowQuickMenu(false); }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isPlaying && (
          <div className="relative z-10 w-[85vw] max-w-7xl pt-6">
            <div className="flex gap-16 items-start w-full">
              <div className="w-[300px] flex-shrink-0 relative group">
                <div className="absolute inset-0 bg-red-600/40 ambient-glow rounded-full scale-75 group-focus-within:scale-110" />
                <div className="relative z-10 rounded-[30px] overflow-hidden border-2 border-white/10 shadow-2xl bg-zinc-900 group-focus-within:scale-105 transition-transform duration-300">
                   {!isImgLoaded && <div className="absolute inset-0 shimmer-box" />}
                   <img src={finalImgUrl} onLoad={() => setIsImgLoaded(true)} className={`w-full aspect-[2/3] object-cover transition-opacity duration-700 ${isImgLoaded ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </div>

              <div className="flex-1">
                <div className="mb-6 w-28 opacity-40 hover:opacity-100"><TVButton focusKey="BACK_HOME" name="← TRANG CHỦ" onClick={() => router.push("/")} /></div>
                <h1 className="text-5xl font-black mb-6 italic uppercase tracking-tighter text-white drop-shadow-2xl">{movie?.name}</h1>
                <div className="mb-12">
                  <TVButton 
                    focusKey="MAIN_PLAY_BTN" 
                    name={currentEpIndex > 0 ? `TIẾP TỤC TẬP ${servers[activeServer]?.server_data[currentEpIndex]?.name}` : "XEM PHIM NGAY"} 
                    isPrimary 
                    onClick={() => setIsPlaying(true)} 
                  />
                </div>
                <div className="space-y-10">
                  <div>
                    {/* ĐÃ ĐỔI THÀNH AUDIO */}
                    <h3 className="text-white/20 font-black mb-3 uppercase text-[8px] tracking-[0.4em] italic">Audio</h3>
                    <div className="flex flex-wrap gap-2">
                      {servers.map((s, i) => (
                        <TVButton 
                          key={`sv-${i}`} 
                          focusKey={`SV_BTN_${i}`} 
                          // ĐÃ BỎ #1 VÀ CHUẨN HÓA TÊN
                          name={s.server_name.toUpperCase().includes('VIET') ? 'VIỆT SUB' : 'THUYẾT MINH'} 
                          isActive={activeServer === i} 
                          onClick={() => { setActiveServer(i); setCurrentEpIndex(0); }} 
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-red-600/40 font-black mb-3 uppercase text-[8px] tracking-[0.4em] italic">Danh sách tập</h3>
                    <div className="flex flex-wrap gap-2 bg-white/[0.02] p-5 rounded-3xl border border-white/5 max-h-[35vh] overflow-y-auto no-scrollbar shadow-inner transform-gpu">
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
      </main>
    </FocusContext.Provider>
  );
}

const formatTime = (s: number) => {
    if (isNaN(s)) return "00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
};