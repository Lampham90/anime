"use client";
/** * 🔒 BẢN SIÊU CẤP HOÀN THIỆN - FULL HOTKEYS & ANDROID TV SUPPORT
 * ✅ TV: Hỗ trợ phím Enter/OK, Back/Escape, Arrow Left/Right.
 * ✅ Fix: Giữ nguyên danh sách Season khi chuyển giữa các phần phim.
 * ✅ Fix: Chống crash khi đổi Server (Audio) lệch số lượng tập.
 * ✅ UI: Overlay thông minh đóng Dropdown trên mọi thiết bị.
 */
export const runtime = 'edge';
import { useState, useEffect, useRef, useCallback, use as reactUse } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Hls from "hls.js";
import { Montserrat } from 'next/font/google';

const montserrat = Montserrat({ subsets: ['vietnamese'], weight: ['400', '700', '900'] });

const WORKERS = [
  "https://pro1.pl9.workers.dev",
  "https://pro2.phuonglam56973.workers.dev",
  "https://pro3.pplam5697.workers.dev",
  "https://pro4.phuonglam56971.workers.dev",
  "https://pro5.phuonglam56972.workers.dev"
];

const getRandomWorker = () => WORKERS[Math.floor(Math.random() * WORKERS.length)];
const ORIGIN_IMG = "https://img.ophim.live/uploads/movies/";

const getImageUrl = (movie: any) => {
  if (!movie) return "";
  const path = movie.poster_url || movie.thumb_url;
  const imgFullUrl = path?.startsWith('http') ? path : `${ORIGIN_IMG}${path}`;
  return `https://images.weserv.nl/?url=${encodeURIComponent(imgFullUrl)}&w=1920&fit=cover&output=webp&q=90`;
};

const cleanServerName = (name: string) => name.replace(/#\d+/g, '').trim();

export default function MovieDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = reactUse(params);
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [movie, setMovie] = useState<any>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [activeServer, setActiveServer] = useState(0);
  const [currentLink, setCurrentLink] = useState<string | null>(null);
  const [currentEpIndex, setCurrentEpIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lastWatchedEp, setLastWatchedEp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Logic Duy trì Season
  const [relatedSeasons, setRelatedSeasons] = useState<any[]>([]);
  const [seasonsLoaded, setSeasonsLoaded] = useState(false);
  
  const [openSeason, setOpenSeason] = useState(false);
  const [openAudio, setOpenAudio] = useState(false);

  // --- HỆ THỐNG ĐIỀU KHIỂN ĐA NỀN TẢNG (PC & ANDROID TV) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      const video = videoRef.current;
      const code = e.code;

      // 1. Play/Pause (Space trên PC, Enter/Select/OK trên TV)
      if (code === "Space" || code === "Enter" || code === "NumpadEnter") {
        if (isPlaying) {
          e.preventDefault();
          if (video.paused) video.play().catch(() => {});
          else video.pause();
        }
      }

      // 2. Tiến/Lùi 10s (Arrow Right/Left)
      if (code === "ArrowRight") {
        if (isPlaying) {
          e.preventDefault();
          video.currentTime += 10;
        }
      } else if (code === "ArrowLeft") {
        if (isPlaying) {
          e.preventDefault();
          video.currentTime -= 10;
        }
      }

      // 3. Phím Thoát (Escape trên PC, Back trên Remote TV)
      if (code === "Escape" || code === "BrowserBack") {
        if (isPlaying) {
          e.preventDefault();
          setIsPlaying(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isPlaying]);

  const saveProgress = useCallback((epIndex: number, seconds: number = 0) => {
    if (!slug) return;
    const history = JSON.parse(localStorage.getItem("movie_history") || "{}");
    history[slug] = { epIndex, seconds };
    localStorage.setItem("movie_history", JSON.stringify(history));
    setLastWatchedEp(epIndex);
  }, [slug]);

  const handleNextEpisode = useCallback(() => {
    const nextIdx = currentEpIndex + 1;
    const currentServerData = servers[activeServer]?.server_data;
    if (currentServerData && nextIdx < currentServerData.length) {
      setCurrentLink(currentServerData[nextIdx].link_m3u8);
      setCurrentEpIndex(nextIdx);
      saveProgress(nextIdx, 0);
    }
  }, [currentEpIndex, servers, activeServer, saveProgress]);

  // Đổi Server an toàn (Tránh index undefined)
  const handleServerChange = (idx: number) => {
    setActiveServer(idx);
    setOpenAudio(false);
    const newData = servers[idx]?.server_data;
    if (newData) {
      const safeIdx = currentEpIndex < newData.length ? currentEpIndex : 0;
      setCurrentEpIndex(safeIdx);
      setCurrentLink(newData[safeIdx].link_m3u8);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;
    const handleTimeUpdate = () => {
      if (Math.floor(video.currentTime) % 5 === 0) saveProgress(currentEpIndex, video.currentTime);
    };
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleNextEpisode);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleNextEpisode);
    };
  }, [isPlaying, currentEpIndex, handleNextEpisode, saveProgress]);

  useEffect(() => {
    if (isPlaying && currentLink && videoRef.current) {
      const video = videoRef.current;
      const history = JSON.parse(localStorage.getItem("movie_history") || "{}");
      const savedSeconds = history[slug]?.seconds || 0;
      if (hlsRef.current) hlsRef.current.destroy();
      const initPlayer = (v: HTMLVideoElement) => {
        v.currentTime = savedSeconds;
        v.play().catch(() => {});
      };
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(currentLink);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => initPlayer(video));
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentLink;
        initPlayer(video);
      }
    }
  }, [isPlaying, currentLink, slug]);

  useEffect(() => {
    setMounted(true);
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const worker = getRandomWorker();
        const res = await fetch(`${worker}/v1/api/phim/${slug}`);
        const json = await res.json();
        const item = json?.data?.item;

        if (item) {
          setMovie(item);
          
          // Chỉ fetch Season một lần duy nhất
          if (!seasonsLoaded) {
            const getBaseSlug = (s: string) => s.split(/-(phan|season|ss|part|tap|p|s|live-action)-\d+|-\d+$/i)[0];
            const baseSlug = getBaseSlug(slug);
            const baseName = item.name.split(/phần|season|ss|part|tập/i)[0].trim();

            const sRes = await fetch(`${worker}/v1/api/tim-kiem?keyword=${encodeURIComponent(baseName)}&limit=20`);
            const sJson = await sRes.json();
            if (sJson?.data?.items) {
              const list = sJson.data.items
                .filter((i: any) => getBaseSlug(i.slug) === baseSlug)
                .map((i: any) => ({ name: i.name, slug: i.slug }))
                .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, {numeric: true}));
              setRelatedSeasons(list);
              setSeasonsLoaded(true);
            }
          }

          const rawServers = item.episodes || [];
          const sortedServers = [...rawServers].sort((a, b) => {
            const priority = (name: string) => {
              const n = name.toLowerCase();
              if (n.includes("lồng tiếng")) return 1;
              if (n.includes("thuyết minh")) return 2;
              return 3;
            };
            return priority(a.server_name) - priority(b.server_name);
          });

          setServers(sortedServers);
          const history = JSON.parse(localStorage.getItem("movie_history") || "{}");
          const saved = history[slug];
          const startEp = saved ? saved.epIndex : 0;
          setCurrentEpIndex(startEp);
          setCurrentLink(sortedServers[0]?.server_data?.[startEp]?.link_m3u8);
          setLastWatchedEp(saved ? saved.epIndex : null);
        }
      } catch (e) { console.error(e); }
      setIsLoading(false);
    };
    fetchData();
  }, [slug, seasonsLoaded]);

  if (!mounted) return null;
  if (isLoading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main className={`${montserrat.className} min-h-screen bg-[#050505] text-white overflow-x-hidden pb-10`}>
      <style jsx global>{`
        html, body { overflow-x: hidden; scrollbar-width: none; }
        body::-webkit-scrollbar { display: none; }
        .glass-btn { background: rgba(255, 255, 255, 0.08); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.15); transition: all 0.3s ease; }
        .glass-btn:hover { background: rgba(229, 9, 20, 0.7); transform: translateY(-2px); }
        .custom-dropdown { position: relative; min-width: 170px; user-select: none; z-index: 50; }
        .dropdown-selected { border: 1.5px solid rgba(229, 9, 20, 0.4); background: rgba(255,255,255,0.04); border-radius: 9999px; padding: 10px 40px 10px 22px; font-size: 10.5px; font-weight: 900; text-transform: uppercase; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; justify-content: space-between; }
        .dropdown-selected:focus { border-color: #ff0000; box-shadow: 0 0 15px rgba(229, 9, 20, 0.5); outline: none; }
        .dropdown-menu { position: absolute; top: calc(100% + 8px); left: 0; width: 100%; background: #0f0f0f; border: 1px solid rgba(229, 9, 20, 0.4); border-radius: 16px; overflow: hidden; z-index: 100; box-shadow: 0 12px 40px rgba(0,0,0,0.9); }
        .dropdown-item { padding: 13px 22px; font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.2s; }
        .dropdown-item:hover, .dropdown-item:focus { background: rgba(229, 9, 20, 0.12); color: #ff0000; outline: none; }
        .dropdown-item.active { background: #e50914; color: white; }
        video { outline: none; }
      `}</style>

      {/* --- BANNER --- */}
      <section className="relative w-full h-[85vh] md:h-[95vh] bg-black">
        {!isPlaying ? (
          <div className="relative w-full h-full">
            <img src={getImageUrl(movie)} className="w-full h-full object-cover opacity-60" alt={movie?.name} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end pb-24 px-6 md:px-24">
              <div className="flex items-center gap-3 mb-3"><div className="w-8 h-[2px] bg-red-600"></div><span className="text-[7.5px] font-black uppercase tracking-[0.4em] text-white">Hot Premiere</span></div>
              <h1 className="text-[44px] md:text-[81px] font-black uppercase italic mb-5 leading-[0.9] max-w-5xl tracking-tighter drop-shadow-2xl">{movie?.name}</h1>
              <div className="text-[12px] md:text-[16px] font-medium italic text-white/80 mb-10 leading-relaxed max-w-2xl line-clamp-3" dangerouslySetInnerHTML={{ __html: movie?.content }} />
              <button onClick={() => setIsPlaying(true)} className="glass-btn w-fit text-white px-9 py-3.5 rounded-full font-black text-[10px] md:text-[12px] uppercase tracking-[0.2em]">
                {lastWatchedEp !== null ? `Tiếp tục tập ${lastWatchedEp + 1}` : "Xem ngay"}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full bg-black">
            <video ref={videoRef} controls autoPlay className="w-full h-full object-contain" />
          </div>
        )}
        <Link href="/" className="absolute top-6 left-6 z-[110] bg-black/40 backdrop-blur-xl p-2.5 rounded-full border border-white/10 hover:border-red-600 transition-all">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </Link>
      </section>

      <div className="max-w-[1400px] mx-auto px-6 md:px-24 py-12 space-y-12">
        {/* --- SETTINGS --- */}
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic">Playback Settings</h2>
          <div className="flex flex-wrap items-center gap-10 border-b border-white/5 pb-10">
            {relatedSeasons.length > 1 && (
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black uppercase text-red-600 tracking-widest italic">Phần:</span>
                <div className="custom-dropdown">
                  <div className="dropdown-selected" onClick={() => {setOpenSeason(!openSeason); setOpenAudio(false)}}>
                    {relatedSeasons.find(s => s.slug === slug)?.name || "Chọn phần"}
                    <svg className={`w-2.5 h-2.5 transition-transform ${openSeason ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7"/></svg>
                  </div>
                  {openSeason && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setOpenSeason(false)} />
                      <div className="dropdown-menu">
                        {relatedSeasons.map((s, i) => (
                          <div key={i} className={`dropdown-item ${s.slug === slug ? 'active' : ''}`} onClick={() => router.push(`/phim/${s.slug}`)}>{s.name}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-red-600 tracking-widest italic">Audio:</span>
              <div className="custom-dropdown">
                <div className="dropdown-selected" onClick={() => {setOpenAudio(!openAudio); setOpenSeason(false)}}>
                  {cleanServerName(servers[activeServer]?.server_name || "")}
                  <svg className={`w-2.5 h-2.5 transition-transform ${openAudio ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7"/></svg>
                </div>
                {openAudio && (
                  <>
                    <div className="fixed inset-0 z-[90]" onClick={() => setOpenAudio(false)} />
                    <div className="dropdown-menu">
                      {servers.map((s, i) => (
                        <div key={i} className={`dropdown-item ${activeServer === i ? 'active' : ''}`} onClick={() => handleServerChange(i)}>{cleanServerName(s.server_name)}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* --- EPISODES --- */}
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-red-600 mb-6 italic">Episode List</h2>
          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 lg:grid-cols-18 gap-3">
            {servers[activeServer]?.server_data?.map((ep: any, i: number) => (
              <button key={i} onClick={() => { setCurrentLink(ep.link_m3u8); setCurrentEpIndex(i); setIsPlaying(true); saveProgress(i, 0); window.scrollTo({top:0, behavior:'smooth'}); }} 
                className={`w-11 h-11 md:w-12 md:h-12 flex items-center justify-center rounded-full text-[10px] font-black border-2 transition-all duration-300 ${currentEpIndex === i ? "border-red-600 text-white bg-red-600 shadow-[0_0_20px_rgba(229,9,20,0.5)]" : "bg-white/5 border-white/5 text-white/40 hover:border-red-600/60 focus:border-red-600"}`}>
                {ep.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}