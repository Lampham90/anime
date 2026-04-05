"use client";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

import { useState, useEffect, useRef, useCallback, useMemo, memo, use as reactUse } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Montserrat } from 'next/font/google';
import { useFocusable, FocusContext, setFocus, init } from "@noriginmedia/norigin-spatial-navigation";

if (typeof window !== "undefined") {
  init({ throttle: 50, blockScroll: true, bypassUserAgentCheck: true }); 
}

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

// --- [COMPONENT: HIỂN THỊ TIẾN TRÌNH] ---
const TimeDisplay = memo(({ currentTime, duration }: { currentTime: number, duration: number }) => {
  const format = useCallback((s: number) => {
    if (isNaN(s) || s < 0) return "00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
  }, []);

  return (
    <div className="flex justify-between mb-4 font-black italic uppercase tracking-tighter items-end w-full text-white px-2 transform-gpu">
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

// --- [COMPONENT: NÚT BẤM TV TỐI ƯU] ---
const TVButton = memo(({ name, onClick, focusKey: fk, isActive, isPrimary }: any) => {
  const { ref, focused } = useFocusable({ 
    focusKey: fk, 
    onEnterPress: useCallback((props: any, e: any) => {
      if (e?.preventDefault) e.preventDefault();
      onClick();
    }, [onClick])
  });

  useEffect(() => {
    if (focused && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [focused]);

  return (
    <button
      ref={ref}
      onClick={useCallback((e: any) => { e.stopPropagation(); onClick(); }, [onClick])}
      className={`relative px-5 py-2.5 rounded-xl font-black outline-none border-[3px] text-[10px] uppercase tracking-tighter transform-gpu transition-[transform,background-color] duration-150 will-change-transform ${
        focused 
          ? "bg-white text-black scale-110 z-[100] border-red-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" 
          : isActive 
            ? "bg-red-600 text-white border-red-400" 
            : isPrimary 
              ? "bg-zinc-100 text-black border-white/20" 
              : "bg-white/5 text-zinc-400 border-white/5"
      }`}
    >
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

  // --- [LOGIC THOÁT PLAYER VỀ CHI TIẾT] ---
  const exitPlayer = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      if (video.currentTime > 5) {
        localStorage.setItem(`progress_${slug}_${currentEpIndex}`, video.currentTime.toString());
        localStorage.setItem(`last_ep_${slug}`, JSON.stringify({ epIdx: currentEpIndex, svIdx: activeServer }));
      }
      video.pause();
      video.removeAttribute('src'); 
      video.load();
    }
    
    if (hlsRef.current) { 
      hlsRef.current.destroy(); 
      hlsRef.current = null; 
    }

    setIsPlaying(false);
    setShowQuickMenu(false);
    setShowControls(false);

    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      const exitFs = document.exitFullscreen || (document as any).webkitExitFullscreen;
      if (exitFs) exitFs.call(document).catch(() => {});
    }

    setTimeout(() => setFocus("MAIN_PLAY_BTN"), 250);
  }, [slug, currentEpIndex, activeServer]);

  // --- [FULLSCREEN WATCHDOG] ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && isPlaying) {
        exitPlayer();
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [isPlaying, exitPlayer]);

  // --- [PLAYER CORE: TỐI ƯU HỦY BIẾN KỆT PHIM] ---
  useEffect(() => {
    let hls: Hls | null = null;
    const video = videoRef.current;

    if (isPlaying && servers[activeServer]?.server_data[currentEpIndex]?.link_m3u8 && video) {
      // Dọn dẹp video trước khi nạp
      video.pause();
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();

      hls = new Hls({ 
        enableWorker: true, 
        maxBufferLength: 20, 
        fastStartMaxDeferredLimit: 0.5,
        autoStartLoad: true
      });
      hlsRef.current = hls;

      hls.loadSource(servers[activeServer].server_data[currentEpIndex].link_m3u8);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const savedTime = localStorage.getItem(`progress_${slug}_${currentEpIndex}`);
        if (savedTime) video.currentTime = parseFloat(savedTime);
        video.play().catch(() => {});
        if (playerContainerRef.current) playerContainerRef.current.requestFullscreen().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR: hls?.startLoad(); break;
            case Hls.ErrorTypes.MEDIA_ERROR: hls?.recoverMediaError(); break;
            default: exitPlayer(); break;
          }
        }
      });
    }

    return () => {
      if (hls) {
        hls.detachMedia();
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [isPlaying, currentEpIndex, activeServer, slug, servers, exitPlayer]);

  // Remote Control Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isBackKey = e.key === "Escape" || e.key === "Backspace" || e.keyCode === 10009 || e.keyCode === 461 || e.keyCode === 4;

      if (isBackKey) {
        e.preventDefault();
        e.stopPropagation();
        if (isPlaying) {
          if (showQuickMenu) setShowQuickMenu(false);
          else exitPlayer();
        } else {
          router.push("/"); 
        }
        return;
      }

      if (isPlaying && !showQuickMenu) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          setShowControls(true);
          const step = e.key === "ArrowRight" ? 30 : -30;
          const nextTime = Math.max(0, Math.min(displayTime + step, duration));
          setDisplayTime(nextTime);
          if (seekTimeout.current) clearTimeout(seekTimeout.current);
          seekTimeout.current = setTimeout(() => {
            if (videoRef.current) videoRef.current.currentTime = nextTime;
          }, 300);
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          setShowQuickMenu(true);
          setTimeout(() => setFocus(`QUICK_EP_${currentEpIndex}`), 10);
        }
        if (e.key === "Enter") {
          if (videoRef.current?.paused) videoRef.current.play(); else videoRef.current?.pause();
          setShowControls(true);
        }
        if (controlsTimer.current) clearTimeout(controlsTimer.current);
        controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isPlaying, showQuickMenu, currentEpIndex, displayTime, duration, exitPlayer, router]);

  // Data Fetching
  useEffect(() => {
    fetch(`https://ch.3ks.workers.dev/v1/api/phim/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json?.data?.item) {
          const item = json.data.item;
          setMovie(item);
          const eps = item.episodes || [];
          setServers(eps);
          const last = localStorage.getItem(`last_ep_${slug}`);
          if (last) {
            const { epIdx, svIdx } = JSON.parse(last);
            setCurrentEpIndex(epIdx);
            setActiveServer(svIdx);
          }
          setIsLoading(false);
          setTimeout(() => setFocus("MAIN_PLAY_BTN"), 100);
        }
      });
  }, [slug]);

  // Time Sync & Auto Next
  useEffect(() => {
    const v = videoRef.current; if (!v) return;
    let frameId: number;
    const sync = () => {
      if (!seekTimeout.current) setDisplayTime(v.currentTime);
      setDuration(v.duration);
      frameId = requestAnimationFrame(sync);
    };
    if (isPlaying) frameId = requestAnimationFrame(sync);
    v.onended = () => {
      localStorage.removeItem(`progress_${slug}_${currentEpIndex}`);
      if (currentEpIndex < (servers[activeServer]?.server_data.length || 0) - 1) setCurrentEpIndex(p => p + 1);
      else exitPlayer();
    };
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, currentEpIndex, activeServer, servers, exitPlayer, slug]);

  // --- [XỬ LÝ POSTER: KHẮC PHỤC LỖI KHÔNG HIỂN THỊ] ---
  const finalImgUrl = useMemo(() => {
    if (!movie) return "";
    // Ưu tiên poster_url cho đẹp, thumb_url làm fallback
    const raw = movie.poster_url || movie.thumb_url || ""; 
    if (!raw) return "";
    
    // Kiểm tra nếu URL đã có domain chưa, nếu chưa thì thêm domain của OPhim
    let base = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    
    // Sử dụng proxy wsrv.nl để force HTTPS và tránh lỗi CORS/Mixed Content
    return `https://wsrv.nl/?url=${encodeURIComponent(base.replace("http://", "https://"))}&w=800&fit=cover&output=webp&q=80`;
  }, [movie]);

  const episodeList = useMemo(() => (
    servers[activeServer]?.server_data?.map((ep, i) => (
      <TVButton key={`ep-${i}`} focusKey={`PAGE_EP_BTN_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setIsPlaying(true); }} />
    ))
  ), [servers, activeServer, currentEpIndex]);

  const quickEpisodeList = useMemo(() => (
    servers[activeServer]?.server_data?.map((ep, i) => (
      <TVButton key={`q-${i}`} focusKey={`QUICK_EP_${i}`} name={ep.name} isActive={currentEpIndex === i} onClick={() => { setCurrentEpIndex(i); setShowQuickMenu(false); }} />
    ))
  ), [servers, activeServer, currentEpIndex]);

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center font-black text-red-600 italic uppercase">Loading...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-black text-white overflow-hidden relative flex items-center justify-center transform-gpu`}>
        
        {!isPlaying && (
          <>
            <div className="absolute inset-0 z-0">
              <img src={finalImgUrl} className="w-full h-full object-cover opacity-20 blur-[80px] transform-gpu" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
            </div>
            <div className="relative z-10 w-full max-w-[1100px] px-10 flex gap-12 items-center transform-gpu animate-in fade-in duration-700">
              <div className="w-[280px] flex-shrink-0 shadow-2xl rounded-[25px] overflow-hidden border border-white/10 aspect-[2/3] bg-zinc-900 transform-gpu">
                {finalImgUrl && <img src={finalImgUrl} className="w-full h-full object-cover" alt="poster" />}
              </div>
              <div className="flex-1">
                <div className="mb-4 opacity-50"><TVButton focusKey="BACK_HOME" name="← Trang chủ" onClick={() => router.push("/")} /></div>
                <h1 className="text-5xl font-black mb-4 italic uppercase tracking-tighter drop-shadow-2xl leading-tight">{movie?.name}</h1>
                <div className="mb-8 flex gap-4">
                  <TVButton 
                    focusKey="MAIN_PLAY_BTN" 
                    name={localStorage.getItem(`progress_${slug}_${currentEpIndex}`) ? `Tiếp tục tập ${currentEpIndex + 1}` : `Xem tập ${currentEpIndex + 1}`} 
                    isPrimary 
                    onClick={() => setIsPlaying(true)} 
                  />
                </div>
                <div className="space-y-4">
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-white/30 uppercase font-bold block mb-2 tracking-widest">Máy chủ</span>
                    <div className="flex flex-wrap gap-2">{servers.map((s, i) => (
                      <TVButton key={`sv-${i}`} focusKey={`SV_BTN_${i}`} name={s.server_name} isActive={activeServer === i} onClick={() => { setActiveServer(i); setCurrentEpIndex(0); }} />
                    ))}</div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <span className="text-[8px] text-red-600 uppercase font-bold block mb-2 tracking-widest">Danh sách tập</span>
                    <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto no-scrollbar">{episodeList}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {isPlaying && (
          <div ref={playerContainerRef} className="fixed inset-0 z-[99999] bg-black transform-gpu">
            <video ref={videoRef} playsInline className="w-full h-full object-contain" />
            {showControls && !showQuickMenu && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[85%] bg-zinc-900/90 p-8 rounded-[30px] border border-white/10 transform-gpu animate-in slide-in-from-bottom-5 duration-300">
                  <TimeDisplay currentTime={displayTime} duration={duration} />
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 origin-left transition-transform duration-150" style={{ transform: `scaleX(${duration ? displayTime / duration : 0})` }} />
                  </div>
              </div>
            )}
            {showQuickMenu && (
              <div className="absolute inset-0 bg-black/90 flex flex-col justify-center px-20 transform-gpu animate-in fade-in duration-200">
                <h2 className="text-white font-black text-3xl mb-6 italic border-l-8 border-red-600 pl-6 uppercase">Chọn tập nhanh</h2>
                <div className="flex flex-wrap gap-2 max-h-[60vh] overflow-y-auto no-scrollbar">{quickEpisodeList}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </FocusContext.Provider>
  );
}