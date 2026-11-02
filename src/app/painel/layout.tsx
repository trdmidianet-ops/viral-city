import Link from "next/link";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand";
import { CoinAmount } from "@/components/coin";
import { getBalance } from "@/lib/coins/wallet";
import { isDbConfigured } from "@/lib/db";
import { signOut } from "@/app/login/actions";
import { currentUser } from "@/lib/auth";
import { isAuthConfigured } from "@/lib/auth-config";
import { gatePassword } from "@/lib/gate";
import { PainelNav } from "./nav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const authOn = isAuthConfigured();
  const gated = !authOn && Boolean(gatePassword());
  const balance = authOn && user && isDbConfigured() ? await getBalance(user.id).catch(() => null) : null;

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-night-2/80 p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center justify-between gap-3 px-1 md:mb-8 md:block">
          <Logo href="/painel" />
          {balance !== null && (
            <Link
              href="/painel/carteira"
              title="Seus CityCoins"
              className="flex items-center justify-between rounded-full border border-sun/30 bg-sun/10 px-3 py-1.5 text-sm text-sun transition hover:border-sun/60 md:mt-5"
            >
              <CoinAmount value={balance} />
              <span className="ml-3 hidden text-xs md:inline">Recarregar</span>
            </Link>
          )}
        </div>
        <PainelNav />
        <div className="mt-auto hidden border-t border-line pt-4 text-sm md:block">
          <p className="truncate px-1 text-muted">{user?.email ?? (gated ? "Acesso por senha" : "Modo demo")}</p>
          {authOn && (
            <form action={signOut}>
              <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-muted hover:text-ink">
                <LogOut size={16} /> Sair
              </button>
            </form>
          )}
        </div>
      </aside>

      <div className="flex-1">
        {!authOn && !gated && (
          <div className="border-b border-sun/20 bg-sun/10 px-6 py-2 text-xs text-sun">
            Painel aberto: defina APP_PASSWORD em <code>.env.local</code> para proteger o acesso.
          </div>
        )}
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
