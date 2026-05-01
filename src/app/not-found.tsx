import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-[#E8FF5A]">404</p>
      <p className="text-[#F5F5F5] font-semibold">Halaman tidak ditemukan</p>
      <p className="text-[#888] text-sm">Link split bill ini sudah tidak valid atau belum pernah ada.</p>
      <Link
        href="/"
        className="mt-2 bg-[#1A1A1A] border border-[#2A2A2A] rounded-[12px] px-5 py-3 text-sm text-[#F5F5F5] hover:border-[#3A3A3A] transition-colors"
      >
        Bikin split baru
      </Link>
    </div>
  );
}
