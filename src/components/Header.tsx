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
    <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-700 h-16 md:h-20 px-6 md:px-12 flex items-center justify-between
      ${isScrolled ? "bg-black/90 backdrop-blur-xl border-b border-white/[0.05]" : "bg-transparent"}`}>
      
      <div className="flex items-center gap-10">
        {/* LOGO */}
        <Link href="/" className="text-[20px] md:text-[24px] font-black tracking-tighter text-white italic group transition-transform hover:scale-105 shrink-0">
          Lâm's<span className="text-red-600 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">House</span>
        </Link>

        {/* NAVIGATION */}
        <nav className="hidden xl:flex items-center gap-6">
          {CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/danh-sach/${cat.slug}`} className="nav-link">{cat.name}</Link>
          ))}

          {/* DROP GENRE */}
          <div className="relative group/drop" onMouseEnter={() => setActiveDropdown('genre')} onMouseLeave={() => setActiveDropdown(null)}>
            <button className={`nav-link flex items-center gap-1 ${activeDropdown === 'genre' ? 'text-white' : ''}`}>
              Thể Loại
              <svg className={`w-3 h-3 transition-transform ${activeDropdown === 'genre' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div className={`absolute top-full left-0 pt-4 transition-all duration-300 ${activeDropdown === 'genre' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
              <div className="bg-[#121212] border border-white/[0.1] rounded-xl grid grid-cols-3 min-w-[360px] p-2 shadow-2xl">
                {GENRES.map((g) => (
                  <Link key={g.slug} href={`/the-loai/${g.slug}`} className="dropdown-item">{g.name}</Link>
                ))}
              </div>
            </div>
          </div>

          {/* DROP COUNTRY */}
          <div className="relative group/drop" onMouseEnter={() => setActiveDropdown('country')} onMouseLeave={() => setActiveDropdown(null)}>
            <button className={`nav-link flex items-center gap-1 ${activeDropdown === 'country' ? 'text-white' : ''}`}>
              Quốc Gia
              <svg className={`w-3 h-3 transition-transform ${activeDropdown === 'country' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 9l-7 7-7-7"/></svg>
            </button>
            <div className={`absolute top-full left-0 pt-4 transition-all duration-300 ${activeDropdown === 'country' ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
              <div className="bg-[#121212] border border-white/[0.1] rounded-xl grid grid-cols-2 min-w-[240px] p-2 shadow-2xl">
                {COUNTRIES.map((c) => (
                  <Link key={c.slug} href={`/quoc-gia/${c.slug}`} className="dropdown-item">{c.name}</Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-6 shrink-0">
        <div ref={searchRef} className="flex items-center">
          <form 
            onSubmit={handleSearch} 
            className={`flex items-center transition-all duration-500 border-b
            ${isSearchOpen 
              ? "w-40 md:w-60 border-red-600 py-1 bg-white/5 px-3 rounded-t-lg" 
              : "w-8 border-transparent opacity-70 hover:opacity-100"}`}
          >
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm phim..."
              className={`bg-transparent outline-none text-xs w-full text-white placeholder:text-white/30 transition-all duration-300
              ${isSearchOpen ? "opacity-100" : "opacity-0 w-0 pointer-events-none"}`}
            />
            <button type="button" onClick={() => { if (!isSearchOpen) { setIsSearchOpen(true); setTimeout(() => inputRef.current?.focus(), 200); } else if (keyword) handleSearch(new Event('submit') as any); }} className="text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </form>
        </div>

        <Link href="/favorites" className="text-white/70 hover:text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </Link>
      </div>

      <style jsx>{`
        .nav-link {
          font-size: 15px; /* Tăng kích thước đồng nhất */
          font-weight: 600; /* Nét đậm vừa phải sang trọng */
          color: rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          white-space: nowrap;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .nav-link:hover {
          color: #ef4444; /* Chuyển đỏ khi hover để tiệp với logo */
        }
        .dropdown-item {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          padding: 10px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }
        .dropdown-item:hover {
          color: white;
          background: rgba(239, 68, 68, 0.1);
          padding-left: 20px;
        }
      `}</style>
    </header>
  );
}