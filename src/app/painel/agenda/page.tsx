import Link from "next/link";
import { BellRing, Database, Plus, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { platforms } from "@/components/platform-icons";
import { listAccounts } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { weekdays, type Slot } from "@/lib/schedule/due";
import { listSlotsFor } from "@/lib/schedule/repo";
import { requireUserId } from "@/lib/auth";
import { isLinkedOnly } from "@/lib/youtube/channel-link";
import { addSlotAction, removeSlotAction } from "./actions";

export const dynamic = "force-dynamic";

const field = "rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink";

/** Grade da semana com os horários e o formulário para adicionar. `target` = "lembrete" ou o ID da conta. */
function WeekSlots({ target, slots }: { target: string; slots: Slot[] }) {
  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {weekdays.map((day, d) => (
          <div key={day} className="rounded-xl border border-line bg-night/40 p-2">
            <p className="mb-1.5 text-xs font-medium text-muted">{day}</p>
            <ul className="space-y-1">
              {slots
                .filter((s) => s.weekday === d)
                .map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-md bg-pink/10 px-2 py-1 text-xs">
                    {s.post_time.slice(0, 5)}
                    <form action={removeSlotAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <button aria-label={`Remover ${day} ${s.post_time.slice(0, 5)}`} className="p-1 text-muted hover:text-pink">
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
        <input type="hidden" name="account" value={target} />
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
        <button className="btn-sunset flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-night">
          <Plus size={16} /> Adicionar
        </button>
      </form>
    </>
  );
}

export default async function AgendaPage() {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Agenda" subtitle="Dias e horários de postagem." />
        <EmptyState
          icon={Database}
          title="Falta conectar o banco de dados"
          text="A agenda fica no banco da Viral City. Coloque DATABASE_URL no .env.local (e na Vercel)."
        />
      </>
    );
  }

  const userId = await requireUserId();
  const [accounts, slots] = await Promise.all([listAccounts(userId), listSlotsFor(userId)]);
  const reminders = slots.filter((s) => s.account_id === null);
  // canal ligado pelo link não tem permissão para postar pela API: fica fora da postagem automática
  const postingAccounts = accounts.filter((a) => !isLinkedOnly(a.scopes));

  return (
    <>
      <PageHeader title="Agenda" subtitle="Escolha os dias e horários e a Viral City avisa quando for hora de postar." />

      <section className="glass rounded-2xl p-5 sm:p-6">
        <header className="flex flex-wrap items-center gap-3">
          <BellRing className="text-sun" size={20} />
          <h2 className="font-semibold">Lembretes de postagem</h2>
        </header>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          No horário marcado (de Brasília), você recebe um e-mail com o próximo corte aprovado e um link direto para{" "}
          <Link href="/painel/postar" className="text-cyan underline-offset-4 hover:underline">
            Postar
          </Link>
          . Se não houver corte pronto, nada é enviado.
        </p>
        <WeekSlots target="lembrete" slots={reminders} />
      </section>

      {postingAccounts.length > 0 && (
        <div className="mt-8 space-y-6">
          <div>
            <h2 className="font-semibold">Postagem automática pelas contas conectadas</h2>
            <p className="mt-1 max-w-2xl text-xs text-muted">
              Funciona com o worker no seu PC ligado (<code className="text-ink">npm run worker</code>). Enquanto o app não for
              aprovado pelas redes, os vídeos enviados pela API saem privados.
            </p>
          </div>
          {postingAccounts.map((account) => {
            const p = platforms.find((x) => x.id === account.platform)!;
            return (
              <section key={account.id} className="glass rounded-2xl p-5 sm:p-6">
                <header className="flex flex-wrap items-center gap-3">
                  <p.Icon className={p.color} />
                  <h3 className="font-semibold">{account.name}</h3>
                </header>
                <WeekSlots target={account.id} slots={slots.filter((s) => s.account_id === account.id)} />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
