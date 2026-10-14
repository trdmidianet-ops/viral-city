import { LogOut } from "lucide-react";
import { Logo } from "@/components/brand";
import { signOut } from "@/app/login/actions";
import { getUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PainelNav } from "./nav";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-line bg-night-2/80 p-4 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="mb-4 px-1 md:mb-8">
          <Logo href="/painel" />
        </div>
        <PainelNav />
        <div className="mt-auto hidden border-t border-line pt-4 text-sm md:block">
          <p className="truncate px-1 text-muted">{user?.email ?? "Modo demo"}</p>
          {isSupabaseConfigured && (
            <form action={signOut}>
              <button className="mt-2 flex w-full items-center gap-2 rounded-lg px-1 py-2 text-muted hover:text-ink">
                <LogOut size={16} /> Sair
              </button>
            </form>
          )}
        </div>
      </aside>

      <div className="flex-1">
        {!isSupabaseConfigured && (
          <div className="border-b border-sun/20 bg-sun/10 px-6 py-2 text-xs text-sun">
            Modo demo: configure o Supabase em <code>.env.local</code> para ativar login e salvar dados.
          </div>
        )}
        <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
