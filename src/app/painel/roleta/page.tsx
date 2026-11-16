import { Database } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { requireUserId } from "@/lib/auth";
import { MIN_SOURCE_COINS, formatCoins } from "@/lib/coins/pricing";
import { isDbConfigured } from "@/lib/db";
import { CUTS_PER_SPIN, MAX_STORED_SPINS, SPIN_TTL_DAYS, odds } from "@/lib/roulette/rules";
import { availableSpins, recentPrizes } from "@/lib/roulette/store";
import { Wheel } from "./wheel";

export const dynamic = "force-dynamic";

const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const percent = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default async function RoletaPage() {
  const subtitle = "Gire e ganhe CityCoins para os seus próximos cortes.";
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Roleta" subtitle={subtitle} />
        <EmptyState icon={Database} title="Falta conectar o banco de dados" text="A roleta fica no banco da Viral City." />
      </>
    );
  }

  const userId = await requireUserId();
  const [spins, prizes] = await Promise.all([
    availableSpins(userId).catch(() => ({ count: 0, nextExpiry: null })),
    recentPrizes(userId).catch(() => []),
  ]);

  return (
    <>
      <PageHeader title="Roleta" subtitle={subtitle} />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="vc-roleta-stage relative overflow-hidden rounded-2xl border border-pink/30 lg:col-span-3">
          <div aria-hidden="true" className="vc-roleta-floor" />
          <div className="relative px-5 pb-32 pt-8 sm:px-8 sm:pt-10">
            <Wheel spins={spins.count} minCost={MIN_SOURCE_COINS} />
            {spins.count > 0 && spins.nextExpiry && (
              <p className="mt-4 text-center text-xs text-ink/75">Seu giro mais antigo vale até {day(spins.nextExpiry)}.</p>
            )}
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="glass rounded-2xl p-6">
            <h2 className="font-medium">Como ganhar giros</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>
                <strong className="text-ink">A cada {CUTS_PER_SPIN} cortes aprovados</strong> você ganha 1 giro.
              </li>
              <li>De vez em quando chega um giro surpresa no seu e-mail.</li>
              <li>
                Cada giro vale por {SPIN_TTL_DAYS} dias e dá para guardar até {MAX_STORED_SPINS}.
              </li>
              <li>Giros não são vendidos: só se ganha.</li>
            </ul>
          </section>

          <section className="glass rounded-2xl p-6">
            <h2 className="font-medium">Chances de cada prêmio</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-normal">CityCoins</th>
                  <th className="pb-2 text-right font-normal">Chance</th>
                </tr>
              </thead>
              <tbody>
                {odds().map((o) => (
                  <tr key={o.coins} className="border-t border-line">
                    <td className="num py-2">{formatCoins(o.coins)}</td>
                    <td className="num py-2 text-right text-muted">{percent(o.percent)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted">
              As fatias da roda têm o mesmo tamanho, mas as chances são as da tabela. O prêmio de 500 sai no máximo uma vez
              a cada 90 dias por conta.
            </p>
          </section>

          {prizes.length > 0 && (
            <section className="glass rounded-2xl p-6">
              <h2 className="font-medium">Seus últimos prêmios</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {prizes.map((p) => (
                  <li key={p.used_at} className="flex justify-between">
                    <span className="text-muted">{day(p.used_at)}</span>
                    <span className="num text-cyan">+{formatCoins(p.prize)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
