import Link from "next/link";
import { CalendarClock, Database, Plus, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { platforms } from "@/components/platform-icons";
import { listAccounts } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { weekdays } from "@/lib/schedule/due";
import { listSlots } from "@/lib/schedule/repo";
import { addSlotAction, removeSlotAction } from "./actions";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink";

export default async function AgendaPage() {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Agenda" subtitle="Dias e horários de postagem por conta." />
        <EmptyState
          icon={Database}
          title="Falta conectar o banco de dados"
          text="A agenda fica no banco da Viral City. Coloque SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local (e na Vercel)."
        />
      </>
    );
  }

  const [accounts, slots] = await Promise.all([listAccounts(), listSlots()]);

  return (
    <>
      <PageHeader title="Agenda" subtitle="Escolha os dias e horários e a Viral City posta sozinha." />

      <p className="mb-6 rounded-xl border border-line bg-night/40 px-4 py-3 text-xs text-muted">
        Horários de Brasília. O worker no seu PC (<code className="text-ink">npm run worker</code>) precisa estar
        ligado; se o PC ligar até 30 min depois do horário, ele ainda posta. Cada envio ao YouTube gasta 1.600 das
        10.000 unidades diárias da API (≈ 6 posts por dia somando todos os canais).
      </p>

      {accounts.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nenhuma conta conectada" text="Conecte um canal para montar a agenda.">
          <Link href="/painel/contas" className="btn-sunset rounded-full px-5 py-2.5 text-sm font-semibold text-white">
            Conectar conta
          </Link>
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {accounts.map((account) => {
            const p = platforms.find((x) => x.id === account.platform)!;
            const mine = slots.filter((s) => s.account_id === account.id);
            const canPost = account.platform === "youtube";
            return (
              <section key={account.id} className="glass rounded-2xl p-5 sm:p-6">
                <header className="flex flex-wrap items-center gap-3">
                  <p.Icon className={p.color} />
                  <h2 className="font-semibold">{account.name}</h2>
                  {!canPost && (
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted">postagem em breve</span>
                  )}
                </header>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                  {weekdays.map((day, d) => (
                    <div key={day} className="rounded-xl border border-line bg-night/40 p-2">
                      <p className="mb-1.5 text-xs font-medium text-muted">{day}</p>
                      <ul className="space-y-1">
                        {mine
                          .filter((s) => s.weekday === d)
                          .map((s) => (
                            <li key={s.id} className="flex items-center justify-between rounded-md bg-pink/10 px-2 py-1 text-xs">
                              {s.post_time.slice(0, 5)}
                              <form action={removeSlotAction}>
                                <input type="hidden" name="id" value={s.id} />
                                <button aria-label={`Remover ${day} ${s.post_time.slice(0, 5)}`} className="text-muted hover:text-pink">
                                  <X size={12} />
                                </button>
                              </form>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <form action={addSlotAction} className="mt-4 flex flex-wrap items-end gap-3">
                  <input type="hidden" name="account" value={account.id} />
                  <fieldset className="flex flex-wrap gap-1.5">
                    <legend className="mb-1 text-xs text-muted">Dias</legend>
                    {weekdays.map((day, d) => (
                      <label key={day} className="cursor-pointer">
                        <input type="checkbox" name="weekday" value={d} aria-label={day} className="peer sr-only" />
                        <span className="block rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted peer-checked:border-pink peer-checked:bg-pink/15 peer-checked:text-ink peer-focus-visible:ring-2 peer-focus-visible:ring-pink">
                          {day.slice(0, 3)}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <label className="text-xs text-muted">
                    Horário
                    <input type="time" name="time" required defaultValue="18:00" className={`${field} mt-1 block`} />
                  </label>
                  <button className="btn-sunset flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white">
                    <Plus size={16} /> Adicionar
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
