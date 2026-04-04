export const runtime = 'edge';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-[#020202] flex flex-col items-center justify-center text-white p-10 text-center">
      <h1 className="text-9xl font-black italic text-red-600 animate-pulse">404</h1>
      <h2 className="text-2xl font-bold uppercase mt-4 tracking-tighter">Không tìm thấy nội dung</h2>
      <p className="text-zinc-500 mt-2 max-w-md italic">
        Trang bạn đang tìm kiếm không tồn tại hoặc đã bị dời đi chỗ khác.
      </p>
      <Link 
        href="/" 
        className="mt-8 px-8 py-3 bg-white text-black font-black italic uppercase rounded-xl hover:scale-110 transition-transform"
      >
        Quay lại trang chủ
      </Link>
    </div>
  );
}