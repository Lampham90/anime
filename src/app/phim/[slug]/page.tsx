"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback, useMemo, memo, use as reactUse } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ throttle: 0, blockScroll: true, bypassUserAgentCheck: true }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

// --- [COMPONENT: HIỂN THỊ TIẾN TRÌNH PHIM - KHÓA] ---
const TimeDisplay = memo(({ currentTime, duration }: { currentTime: number, duration: number }) => {
  const format = (s: number) => {
    if (isNaN(s) || s < 0) return "00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
  };
  return (
    <div className="flex justify-between mb-4 font-black italic uppercase tracking-tighter items-end w-full text-white">
      <div className="flex flex-col text-left">
        <span className="text-white/30 text-[10px] mb-1 tracking-widest uppercase">Đang xem</span>
        <span className="text-red-600 text-4xl leading-none">{format(currentTime)}</span>
      </div>
      <div className="flex flex-col text-right">
        <span className="text-white/30 text-[10px] mb-1 tracking-widest uppercase">Thời lượng</span>
        <span className="text-white/60 text-xl leading-none">{format(duration)}</span>
      </div>
    </div>
  );
});

// --- [COMPONENT: NÚT BẤM TV - HIỆU ỨNG NHẬN DIỆN MẠNH] ---
const TVButton = memo(({ name, onClick, focusKey: fk, isActive, isPrimary }: any) => {
  const { ref, focused } = useFocusable({ 
    focusKey: fk, 
    onEnterPress: (props, e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      onClick();
    }
  });

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [focused]);

  return (
    <button
      ref={ref}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`relative px-5 py-2.5 rounded-xl font-black transition-all duration-200 outline-none border-[3px] text-[10px] uppercase tracking-tighter transform-gpu ${
        focused 
          ? "bg-white text-black scale-115 z-[100] border-red-500 shadow-[0_0_40px_rgba(255,255,255,0.6)] ring-4 ring-red-600/30" 
          : isActive 
            ? "bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.4)]" 
            : isPrimary 
              ? "bg-zinc-100 text-black border-white/20" 
              : "bg-white/5 text-zinc-400 border-white/5"
      }`}
      style={{ willChange: 'transform' }}
    >
      {focused && <span className="absolute inset-0 rounded-lg animate-pulse bg-white/20 pointer-events-none" />}
      {name}
    </button>
  );
});

export default function MovieDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimer = useRef<any>(null);
  const seekTimeout = useRef<any>(null);

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

  const exitPlayer = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.currentTime > 5) {
        localStorage.setItem(`progress_${slug}_${currentEpIndex}`, videoRef.current.currentTime.toString());
        localStorage.setItem(`last_ep_${slug}`, JSON.stringify({ epIdx: currentEpIndex, svIdx: activeServer }));
      }
      videoRef.current.pause();
      videoRef.current.removeAttribute('src'); 
      videoRef.current.load();
    }
    setIsPlaying(false);
    setShowQuickMenu(false);
    setShowControls(false);
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setTimeout(() => setFocus("MAIN_PLAY_BTN"), 250);
  }, [slug, currentEpIndex, activeServer]);

  // --- [TỐI ƯU TỐC ĐỘ PHÁT & ÂM LƯỢNG MAX] ---
  useEffect(() => {
    if (isPlaying && servers[activeServer]?.server_data[currentEpIndex]?.link_m3u8 && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      
      // ÉP ÂM LƯỢNG 100% (1.0)
      videoRef.current.volume = 1.0;

      const hls = new Hls({ 
        enableWorker: true,
        maxBufferLength: 20,
        startLevel: -1,
        initialLiveManifestSize: 1,
      });
      hlsRef.current = hls;
      hls.loadSource(servers[activeServer].server_data[currentEpIndex].link_m3u8);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const saved = localStorage.getItem(`progress_${slug}_${currentEpIndex}`);
        if (saved && videoRef.current) videoRef.current.currentTime = parseFloat(saved);
        if (videoRef.current) videoRef.current.volume = 1.0; // Đảm bảo lại lần nữa khi bắt đầu chạy
        videoRef.current?.play().catch(() => {});
        playerContainerRef.current?.requestFullscreen().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else exitPlayer();
        }
      });
    }
  }, [isPlaying, currentEpIndex, activeServer, slug, servers, exitPlayer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isBackKey = e.key === "Escape" || e.key === "Backspace" || e.keyCode === 10009 || e.keyCode === 461;
      if (isPlaying) {
        if (isBackKey) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (showQuickMenu) setShowQuickMenu(false); else exitPlayer();
          return;
        }
        if (!showQuickMenu) {
          switch(e.key) {
            case "ArrowRight": case "ArrowLeft": {
              if (videoRef.current) {
                setShowControls(true);
                const step = e.key === "ArrowRight" ? 30 : -30;
                const nextTime = Math.max(0, Math.min(displayTime + step, duration));
                setDisplayTime(nextTime); 
                if (seekTimeout.current) clearTimeout(seekTimeout.current);
                seekTimeout.current = setTimeout(() => {
                  if (videoRef.current) videoRef.current.currentTime = nextTime;
                  seekTimeout.current = null;
                }, 400);
              }
              break;
            }
            case "ArrowUp": case "ArrowDown":
              setShowQuickMenu(true);
              setTimeout(() => setFocus(`QUICK_EP_${currentEpIndex}`), 50);
              break;
            case "Enter":
              if (videoRef.current) { videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause(); setShowControls(true); }
              break;
          }
          if (controlsTimer.current) clearTimeout(controlsTimer.current);
          controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
        }
      } else if (isBackKey) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isPlaying, showQuickMenu, currentEpIndex, displayTime, duration, exitPlayer, router]);

  useEffect(() => {
    fetch(`https://ch.3ks.workers.dev/v1/api/phim/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json?.data?.item) {
          setMovie(json.data.item);
          setServers(json.data.item.episodes || []);
          const saved = localStorage.getItem(`last_ep_${slug}`);
          if (saved) {
            const { epIdx, svIdx } = JSON.parse(saved);
            setCurrentEpIndex(epIdx);
            setActiveServer(svIdx);
          }
          setIsLoading(false);
          requestAnimationFrame(() => setTimeout(() => setFocus("MAIN_PLAY_BTN"), 150));
        }
      });
  }, [slug]);

  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    const sync = () => { if (!seekTimeout.current) { setDisplayTime(v.currentTime); setDuration(v.duration); } };
    v.addEventListener('timeupdate', sync);
    v.addEventListener('loadedmetadata', sync);
    v.addEventListener('ended', () => {
        localStorage.removeItem(`progress_${slug}_${currentEpIndex}`);
        if (currentEpIndex < (servers[activeServer]?.server_data.length || 0) - 1) {
            setCurrentEpIndex(p => p + 1);
        } else {
            exitPlayer();
        }
    });
    return () => { v.removeEventListener('timeupdate', sync); v.removeEventListener('loadedmetadata', sync); };
  }, [isPlaying, currentEpIndex, activeServer, servers, exitPlayer, slug]);

  const finalImgUrl = useMemo(() => {
    if (!movie) return "";
    const raw = movie.thumb_url || movie.poster_url || ""; 
    let base = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(base.replace("http://", "https://"))}&w=600&fit=cover&output=webp&q=80`;
  }, [movie]);

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center font-black text-red-600 animate-pulse italic uppercase tracking-[0.5em]">Loading...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white overflow-hidden relative flex items-center justify-center`}>
        
        {!isPlaying && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-30">
            <img src={finalImgUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover blur-[60px]" alt="" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black" />
          </div>
        )}

        {!isPlaying && (
          <div className="relative z-10 w-full max-w-[1100px] px-10 animate-in fade-in zoom-in-95 duration-500">
            <div className="flex gap-12 items-center">
              <div className="w-[280px] flex-shrink-0 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-[25px] overflow-hidden border-2 border-white/10 aspect-[2/3]">
                <img src={finalImgUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="poster" />
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <div className="mb-4 opacity-40 scale-90 origin-left">
                  <TVButton focusKey="BACK_HOME" name="← Trang chủ" onClick={() => router.push("/")} />
                </div>
                <h1 className="text-5xl font-black mb-4 italic uppercase leading-tight tracking-tighter text-white drop-shadow-2xl">{movie?.name}</h1>
                
                <div className="flex gap-4 mb-8 scale-110 origin-left">
                  <TVButton 
                    focusKey="MAIN_PLAY_BTN" 
                    name={currentEpIndex > 0 || localStorage.getItem(`progress_${slug}_${currentEpIndex}`) 
                      ? `Tiếp tục: ${servers[activeServer]?.server_data[currentEpIndex]?.name}` 
                      : `Xem phim ngay`} 
                    isPrimary 
                    onClick={() => setIsPlaying(true)} 
                  />
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <h3 className="text-white/30 font-black mb-2 uppercase text-[8px] tracking-[0.3em] italic">Máy chủ</h3>
                    <div className="flex flex-wrap gap-2">
                      {servers.map((s, i) => (
                        <TVButton key={`sv-${i}`} focusKey={`SV_BTN_${i}`} name={s.server_name} isActive={activeServer === i} onClick={() => { setActiveServer(i); setCurrentEpIndex(0); }} />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <h3 className="text-red-600 font-black mb-2 uppercase text-[8px] tracking-[0.3em] italic">Danh sách tập</h3>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 no-scrollbar">
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

        {isPlaying && (
          <div ref={playerContainerRef} className="fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden">
            {/* Thêm mặc định volume trực tiếp vào thẻ video */}
            <video ref={videoRef} playsInline className="w-full h-full object-contain" />
            {showControls && !showQuickMenu && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-[1000px] bg-black/80 backdrop-blur-3xl p-8 rounded-[40px] border border-white/10">
                  <TimeDisplay currentTime={displayTime} duration={duration} />
                  <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden mt-4">
                      <div className="absolute inset-0 bg-red-600 origin-left" style={{ transform: `scaleX(${duration ? displayTime / duration : 0})` }} />
                  </div>
              </div>
            )}
            {showQuickMenu && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col justify-center px-20 z-[100]">
                <div className="max-w-[1000px] mx-auto w-full">
                  <h2 className="text-white font-black text-4xl mb-6 italic border-l-[10px] border-red-600 pl-6 uppercase tracking-tighter">Chọn tập nhanh</h2>
                  <div className="flex flex-wrap gap-2 p-2 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
                      <TVButton key={`q-${i}`} focusKey={`QUICK_EP_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setShowQuickMenu(false); }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </FocusContext.Provider>
  );
}