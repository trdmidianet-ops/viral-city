"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Aviso no topo do painel quando a conta tem giro guardado (some na própria página da roleta). */
export function SpinBanner({ count }: { count: number }) {
  const pathname = usePathname();
  if (count <= 0 || pathname.startsWith("/painel/roleta")) return null;
  return (
    <Link
      href="/painel/roleta"
      className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sun/40 bg-sun/10 px-4 py-3 text-sm text-ink transition hover:border-sun/70"
    >
      <span>
        <strong>
          Você tem {count} {count === 1 ? "giro" : "giros"} na roleta.
        </strong>{" "}
        Gire e ganhe CityCoins.
      </span>
      <span className="btn-sunset rounded-full px-4 py-1.5 text-xs font-bold text-night">Girar agora</span>
    </Link>
  );
}
