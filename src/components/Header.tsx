"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const CATEGORIES = [
  { name: "Phim Mới", slug: "phim-moi" },
  { name: "Phim Bộ", slug: "phim-bo" },
  { name: "Phim Lẻ", slug: "phim-le" },
  { name: "Chiếu Rạp", slug: "phim-chieu-rap" },
  { name: "Lồng Tiếng", slug: "phim-long-tieng" },
  { name: "Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "Anime", slug: "hoat-hinh" },
];

const GENRES = [
  { name: "Hành Động", slug: "hanh-dong" }, { name: "Cổ Trang", slug: "co-trang" },
  { name: "Chiến Tranh", slug: "chien-tranh" }, { name: "Viễn Tưởng", slug: "vien-tuong" },
  { name: "Kinh Dị", slug: "kinh-di" }, { name: "Tâm Lý", slug: "tam-ly" },
  { name: "Hình Sự", slug: "hinh-su" }, { name: "Võ Thuật", slug: "vo-thuat" },
  { name: "Hài Hước", slug: "hai-huoc" }, { name: "Phiêu Lưu", slug: "phieu-luu" },
  { name: "Tình Cảm", slug: "tinh-cam" }, { name: "Khoa Học", slug: "khoa-hoc" },
];

const COUNTRIES = [
  { name: "Việt Nam", slug: "viet-nam" }, { name: "Trung Quốc", slug: "trung-quoc" },
  { name: "Hàn Quốc", slug: "han-quoc" }, { name: "Nhật Bản", slug: "nhat-ban" },
  { name: "Âu Mỹ", slug: "au-my" }, { name: "Thái Lan", slug: "thai-lan" },
  { name: "Hồng Kông", slug: "hong-kong" }, { name: "Ấn Độ", slug: "an-do" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (!keyword) setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [keyword]);

  if (pathname.startsWith("/phim/")) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (keyword.trim()) {
      router.push(`/search?keyword=${encodeURIComponent(keyword.trim())}&page=1`);
      setIsSearchOpen(false);
      setKeyword("");
    }
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-1000 h-16 md:h-20 px-8 md:px-16 flex items-center justify-between
      ${isScrolled ? "bg-black/85 backdrop-blur-2xl border-b border-white/[0.08]" : "bg-transparent"}`}>
      
      <div className="flex items-center gap-14">
        {/* LOGO */}
        <Link href="/" className="text-[22px] md:text-[26px] font-black tracking-tighter text-white italic group transition-transform hover:scale-105 shrink-0">
          Lâm's<span className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">House</span>
        </Link>

        {/* NAVIGATION */}
        <nav className="hidden xl:flex items-center gap-8">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/danh-sach/${cat.slug}`} className="nav-link">{cat.name}</Link>
          ))}

          <div className="relative" onMouseEnter={() => setActiveDropdown('genre')} onMouseLeave={() => setActiveDropdown(null)}>
            <button className="nav-link flex items-center gap-1">THỂ LOẠI</button>
            <div className={`absolute top-full left-0 pt-2 transition-all duration-500 ${activeDropdown === 'genre' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'}`}>
              <div className="bg-black/95 backdrop-blur-3xl border border-white/[0.08] rounded-xl grid grid-cols-3 min-w-[380px] p-2 shadow-2xl">
                {GENRES.map((g) => (
                  <Link key={g.slug} href={`/the-loai/${g.slug}`} className="dropdown-item whitespace-nowrap">{g.name}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative" onMouseEnter={() => setActiveDropdown('country')} onMouseLeave={() => setActiveDropdown(null)}>
            <button className="nav-link flex items-center gap-1">QUỐC GIA</button>
            <div className={`absolute top-full left-0 pt-2 transition-all duration-500 ${activeDropdown === 'country' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'}`}>
              <div className="bg-black/95 backdrop-blur-3xl border border-white/[0.08] rounded-xl grid grid-cols-2 min-w-[260px] p-2 shadow-2xl">
                {COUNTRIES.map((c) => (
                  <Link key={c.slug} href={`/quoc-gia/${c.slug}`} className="dropdown-item whitespace-nowrap">{c.name}</Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* RIGHT SIDE: NỔI BẬT HƠN */}
      <div className="flex items-center gap-8 shrink-0">
        {/* SEARCH BAR */}
        <div ref={searchRef} className="flex items-center">
          <form 
            onSubmit={handleSearch} 
            className={`flex items-center transition-all duration-700 border-b
            ${isSearchOpen 
              ? "w-44 md:w-72 border-red-600/50 py-1 opacity-100 bg-white/5 px-3 rounded-t-lg shadow-[0_4px_15px_-5px_rgba(220,38,38,0.3)]" 
              : "w-10 border-transparent opacity-60 hover:opacity-100 hover:scale-110"}`}
          >
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="TÌM PHIM..."
              className={`bg-transparent outline-none text-[9px] font-black tracking-[0.2em] uppercase italic w-full text-white placeholder:text-white/20 transition-all duration-500
              ${isSearchOpen ? "opacity-100" : "opacity-0 w-0 pointer-events-none"}`}
            />
            <button 
              type="button" 
              onClick={() => {
                if (!isSearchOpen) {
                  setIsSearchOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 200);
                } else if (keyword) handleSearch(new Event('submit') as any);
              }} 
              className="text-white p-1 hover:text-red-500 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
        </div>

        {/* NÚT YÊU THÍCH - RỰC RỠ */}
        <Link 
          href="/favorites" 
          className="relative text-white/60 hover:text-red-500 transition-all duration-500 hover:scale-125 active:scale-90"
        >
            <svg className="w-6 h-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        </Link>
      </div>

      <style jsx>{`
        .nav-link {
          font-size: 7.5px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.25em;
          color: rgba(255, 255, 255, 0.15);
          mix-blend-mode: overlay; 
          transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
          font-style: italic;
          white-space: nowrap;
          cursor: pointer;
        }
        .nav-link:hover {
          color: rgba(255, 255, 255, 1);
          mix-blend-mode: normal;
          letter-spacing: 0.4em;
        }
        .dropdown-item {
          font-size: 7.5px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: rgba(255, 255, 255, 0.2);
          mix-blend-mode: overlay;
          padding: 10px 12px;
          text-transform: uppercase;
          border-radius: 8px;
          transition: all 0.4s ease;
          display: flex;
          align-items: center;
        }
        .dropdown-item:hover {
          color: white;
          mix-blend-mode: normal;
          background: rgba(255, 255, 255, 0.05);
          padding-left: 16px;
        }
      `}</style>
    </header>
  );
}