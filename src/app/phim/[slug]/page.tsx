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

// --- HIỂN THỊ TIẾN TRÌNH PHIM ---
const TimeDisplay = memo(({ currentTime, duration }: { currentTime: number, duration: number }) => {
  const format = (s: number) => {
    if (isNaN(s) || s < 0) return "00:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${sec < 10 ? '0' + sec : sec}`;
  };
  return (
    <div className="flex justify-between mb-4 font-black italic uppercase tracking-tighter items-end w-full">
      <div className="flex flex-col text-left">
        <span className="text-white/30 text-[10px] mb-1 tracking-widest uppercase">Đang xem</span>
        <span className="text-red-600 text-5xl leading-none">{format(currentTime)}</span>
      </div>
      <div className="flex flex-col text-right">
        <span className="text-white/30 text-[10px] mb-1 tracking-widest uppercase">Thời lượng</span>
        <span className="text-white/60 text-2xl leading-none">{format(duration)}</span>
      </div>
    </div>
  );
});

// --- NÚT BẤM TV (FIX CRASH & BUBBLING) ---
const TVButton = memo(({ name, onClick, focusKey: fk, isActive, isPrimary }: any) => {
  const { ref, focused } = useFocusable({ 
    focusKey: fk, 
    onEnterPress: (props, e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
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
      className={`px-8 py-3.5 rounded-2xl font-black transition-all duration-150 outline-none border-[3px] text-[12px] uppercase tracking-tighter transform-gpu ${
        isActive ? "bg-red-600 text-white border-red-400 shadow-[0_0_25px_rgba(220,38,38,0.4)]" : 
        focused ? "bg-white text-black scale-110 z-50 border-white shadow-2xl" : 
        isPrimary ? "bg-zinc-100 text-black border-white" : "bg-white/5 text-zinc-400 border-white/5"
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

  // --- HÀM THOÁT PLAYER (FIX CHỐT) ---
  const exitPlayer = useCallback(() => {
    // 1. Dừng video & lưu tiến trình ngay
    if (videoRef.current) {
      if (videoRef.current.currentTime > 5) {
        localStorage.setItem(`progress_${slug}_${currentEpIndex}`, videoRef.current.currentTime.toString());
        localStorage.setItem(`last_ep_${slug}`, JSON.stringify({ epIdx: currentEpIndex, svIdx: activeServer }));
      }
      videoRef.current.pause();
      videoRef.current.removeAttribute('src'); // Giải phóng tài nguyên
      videoRef.current.load();
    }

    // 2. Tắt các lớp UI Player
    setIsPlaying(false);
    setShowQuickMenu(false);
    setShowControls(false);

    // 3. Hủy HLS hoàn toàn
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // 4. Thoát Fullscreen nếu TV chưa tự thoát
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // 5. Trả Focus về nút xem phim trên màn hình Detail
    setTimeout(() => setFocus("MAIN_PLAY_BTN"), 200);
  }, [slug, currentEpIndex, activeServer]);

  // --- LẮNG NGHE FULLSCREEN ĐỂ TỰ ĐỘNG THOÁT ---
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Nếu thoát Fullscreen mà vẫn đang ở mode Player -> Ép thoát về Detail
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

  // 1. LOAD DỮ LIỆU
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

  // 2. KHỞI TẠO HLS
  useEffect(() => {
    if (isPlaying && servers[activeServer]?.server_data[currentEpIndex]?.link_m3u8 && videoRef.current) {
      if (hlsRef.current) hlsRef.current.destroy();
      const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 20, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(servers[activeServer].server_data[currentEpIndex].link_m3u8);
      hls.attachMedia(videoRef.current);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const saved = localStorage.getItem(`progress_${slug}_${currentEpIndex}`);
        if (saved && videoRef.current) videoRef.current.currentTime = parseFloat(saved);
        videoRef.current?.play().catch(() => {});
        playerContainerRef.current?.requestFullscreen().catch(() => {});
      });
    }
  }, [isPlaying, currentEpIndex, activeServer, slug, servers]);

  // 3. LOGIC BẤM PHÍM (BACK & KHÓA TUA)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isBackKey = e.key === "Escape" || e.key === "Backspace" || e.keyCode === 10009 || e.keyCode === 461;

      if (isPlaying) {
        if (isBackKey) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          
          if (showQuickMenu) setShowQuickMenu(false);
          else exitPlayer();
          return;
        }

        // CHỈ TUA PHIM KHI MENU CHỌN TẬP ĐANG ĐÓNG
        if (!showQuickMenu) {
          switch(e.key) {
            case "ArrowRight": if(videoRef.current) videoRef.current.currentTime += 30; setShowControls(true); break;
            case "ArrowLeft": if(videoRef.current) videoRef.current.currentTime -= 30; setShowControls(true); break;
            case "ArrowUp":
            case "ArrowDown":
              setShowQuickMenu(true);
              setTimeout(() => setFocus(`QUICK_EP_${currentEpIndex}`), 50);
              break;
            case "Enter":
              if (videoRef.current) {
                videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
                setShowControls(true);
              }
              break;
          }
          if (controlsTimer.current) clearTimeout(controlsTimer.current);
          controlsTimer.current = setTimeout(() => setShowControls(false), 4000);
        }
      } else {
        if (isBackKey) {
          if (typeof e.preventDefault === 'function') e.preventDefault();
          router.push("/");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isPlaying, showQuickMenu, currentEpIndex, exitPlayer, router]);

  // Theo dõi thời gian & Chuyển tập
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => { setDisplayTime(v.currentTime); setDuration(v.duration); };
    v.addEventListener('timeupdate', sync);
    v.addEventListener('loadedmetadata', sync);
    v.addEventListener('ended', () => {
        if (currentEpIndex < (servers[activeServer]?.server_data.length || 0) - 1) setCurrentEpIndex(p => p + 1);
        else exitPlayer();
    });
    return () => { v.removeEventListener('timeupdate', sync); v.removeEventListener('loadedmetadata', sync); };
  }, [isPlaying, currentEpIndex, activeServer, servers, exitPlayer]);

  const finalImgUrl = useMemo(() => {
    if (!movie) return "";
    const raw = movie.thumb_url || movie.poster_url || ""; 
    const base = raw.startsWith('http') ? raw : `https://img.ophim.live/uploads/movies/${raw}`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(base)}&w=600&fit=cover&output=webp&q=70`;
  }, [movie]);

  if (isLoading) return <div className="h-screen bg-black flex items-center justify-center font-black text-red-600 animate-pulse italic uppercase tracking-[0.5em]">Loading Cinema...</div>;

  return (
    <FocusContext.Provider value={focusKey}>
      <main ref={pageRef} className={`${montserrat.className} h-screen w-screen bg-[#020202] text-white overflow-hidden relative`}>
        
        {/* NỀN CHI TIẾT */}
        {!isPlaying && (
          <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
            <img src={finalImgUrl} className="w-full h-full object-cover blur-[100px] scale-110" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-transparent to-[#020202]/60" />
          </div>
        )}

        {/* --- LỚP THÔNG TIN PHIM --- */}
        {!isPlaying && (
          <div className="relative z-10 h-full flex flex-col justify-center px-24 py-10 animate-in fade-in duration-500">
            <div className="flex gap-20 items-start">
              <div className="w-[380px] flex-shrink-0 shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-[45px] overflow-hidden border-2 border-white/5">
                <img src={finalImgUrl} className="w-full aspect-[2/3] object-cover" alt="poster" />
              </div>
              <div className="flex-1 pt-6">
                <div className="mb-10 opacity-50"><TVButton focusKey="BACK_HOME" name="← Trang chủ" onClick={() => router.push("/")} /></div>
                <h1 className="text-8xl font-black mb-8 italic uppercase leading-[0.85] tracking-tighter drop-shadow-2xl">{movie?.name}</h1>
                <div className="mb-16">
                  <TVButton focusKey="MAIN_PLAY_BTN" name={currentEpIndex > 0 ? `Tiếp tục tập ${servers[activeServer]?.server_data[currentEpIndex]?.name}` : `Xem phim ngay`} isPrimary onClick={() => setIsPlaying(true)} />
                </div>
                <div className="grid grid-cols-1 gap-12">
                  <div>
                    <h3 className="text-white/20 font-black mb-5 uppercase text-[10px] tracking-[0.4em] italic">Chọn máy chủ</h3>
                    <div className="flex gap-3">
                      {servers.map((s, i) => (
                        <TVButton key={`sv-${i}`} focusKey={`SV_BTN_${i}`} name={s.server_name} isActive={activeServer === i} onClick={() => { setActiveServer(i); setCurrentEpIndex(0); }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-red-600 font-black mb-5 uppercase text-[10px] tracking-[0.4em] italic">Danh sách tập</h3>
                    <div className="flex flex-wrap gap-2 max-h-[30vh] overflow-y-auto pr-4 no-scrollbar">
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

        {/* --- LỚP TRÌNH PHÁT (FIX LỆCH TRÁI TV) --- */}
        {isPlaying && (
          <div 
            ref={playerContainerRef} 
            className="fixed top-0 left-0 w-[100vw] h-[100vh] z-[9999] bg-black flex items-center justify-center overflow-hidden animate-in fade-in duration-700"
          >
            <video 
              ref={videoRef} 
              className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl" 
              style={{ margin: 'auto', display: 'block' }}
            />
            
            {/* HUD Controls */}
            {showControls && !showQuickMenu && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[85%] bg-black/80 backdrop-blur-3xl p-12 rounded-[50px] border border-white/10 animate-in slide-in-from-bottom-20 duration-300">
                  <TimeDisplay currentTime={displayTime} duration={duration} />
                  <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden mt-6">
                      <div className="absolute inset-0 bg-red-600 origin-left transition-transform duration-200"
                           style={{ transform: `scaleX(${duration ? displayTime / duration : 0})` }} />
                  </div>
              </div>
            )}

            {/* Menu Chọn Tập Nhanh (Khóa tua phim) */}
            {showQuickMenu && (
              <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl flex flex-col justify-center px-32 z-[100] animate-in fade-in duration-300">
                <h2 className="text-white font-black text-7xl mb-12 italic border-l-[15px] border-red-600 pl-10 uppercase tracking-tighter">Chọn tập nhanh</h2>
                <div className="flex flex-wrap gap-3 p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
                    <TVButton 
                        key={`q-${i}`} 
                        focusKey={`QUICK_EP_${i}`} 
                        name={ep.name} 
                        isActive={currentEpIndex === i} 
                        onClick={() => { setCurrentEpIndex(i); setShowQuickMenu(false); }} 
                    />
                  ))}
                </div>
                <div className="mt-12 text-zinc-500 font-bold uppercase italic tracking-widest">Bấm BACK để quay lại phim</div>
              </div>
            )}
          </div>
        )}

      </main>
    </FocusContext.Provider>
  );
}