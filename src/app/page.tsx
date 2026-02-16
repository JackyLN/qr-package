import Link from "next/link";

import { PRIZE_AMOUNTS_VND } from "@/lib/constants";

function LanternIcon() {
  return (
    <svg viewBox="0 0 64 64" className="lantern-float h-12 w-12 text-[#ffd988]" fill="none" aria-hidden>
      <path d="M32 4v8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <rect x="12" y="12" width="40" height="38" rx="10" fill="url(#lantern-grad)" stroke="currentColor" />
      <path d="M18 24h28M18 32h28M18 40h28" stroke="#ffe5b8" strokeWidth="2" />
      <path d="M24 50h16v6H24z" fill="#f0b84c" />
      <path d="M32 56v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <defs>
        <linearGradient id="lantern-grad" x1="12" y1="12" x2="52" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d42626" />
          <stop offset="1" stopColor="#7f080e" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  return (
    <main className="tet-pattern min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-7">
        <div className="flex items-center justify-center gap-4 py-3">
          <LanternIcon />
          <h1 className="tet-heading text-center text-3xl font-black uppercase tracking-[0.18em] sm:text-5xl">
            Tết Lì Xì
          </h1>
          <LanternIcon />
        </div>

        <section className="tet-panel p-6 sm:p-8">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#ffd78e]">NĂM MỚI PHÁT LỘC</p>
          <h2 className="tet-heading mt-2 text-3xl font-extrabold leading-tight sm:text-5xl">
            Chọn phong bao đỏ, rước lộc đầu năm
          </h2>
          <p className="mt-4 max-w-2xl text-[#f7dab0]">
            Nhận ngay số tiền lì xì ngẫu nhiên, gửi thông tin ngân hàng và chờ admin xác nhận chuyển tiền qua VietQR.
          </p>

          {/* <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#f4c462]/45 bg-[#671015]/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#ffd98d]">Khoi tao</p>
              <p className="mt-2 text-2xl font-extrabold text-[#ffe9bf]">{PRIZE_AMOUNTS_VND.length}</p>
              <p className="text-sm text-[#f3d4a7]">phong bao trong game</p>
            </div>
            <div className="rounded-xl border border-[#f4c462]/45 bg-[#671015]/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#ffd98d]">Mau sac</p>
              <p className="mt-2 text-xl font-bold text-[#ffe9bf]">Do - Vang Tet</p>
              <p className="text-sm text-[#f3d4a7]">phong cach le hoi</p>
            </div>
            <div className="rounded-xl border border-[#f4c462]/45 bg-[#671015]/60 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[#ffd98d]">Thanh toan</p>
              <p className="mt-2 text-xl font-bold text-[#ffe9bf]">VietQR</p>
              <p className="text-sm text-[#f3d4a7]">chuyen khoan nhanh gon</p>
            </div>
          </div> */}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/play" className="tet-btn px-6 py-3 text-base">
              Bắt đầu chơi
            </Link>
            <Link href="/admin" className="tet-btn-outline px-6 py-3 text-base">
              Trang admin
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
