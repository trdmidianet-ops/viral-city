"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, Crown, LayoutDashboard, LayoutTemplate, Layers, Scissors, Settings, TrendingUp, Users, Wallet } from "lucide-react";

export const navItems = [
  { href: "/painel", label: "Visão geral", icon: LayoutDashboard },
  { href: "/painel/tendencias", label: "Tendências", icon: TrendingUp },
  { href: "/painel/contas", label: "Contas", icon: Users },
  { href: "/painel/cortes", label: "Cortes", icon: Scissors },
  { href: "/painel/scale", label: "Scale", icon: Layers },
  { href: "/painel/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarClock },
  { href: "/painel/carteira", label: "Carteira", icon: Wallet },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
];

const adminItem = { href: "/painel/admin", label: "Admin", icon: Crown };

export function PainelNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {(admin ? [...navItems, adminItem] : navItems).map(({ href, label, icon: Icon }) => {
        const active = href === "/painel" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              active
                ? "bg-gradient-to-r from-pink/25 to-orange/10 text-ink"
                : "text-muted hover:bg-white/5 hover:text-ink"
            }`}
          >
            <Icon size={18} className={active ? "text-pink" : undefined} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
