import { Database, Gift, UserPlus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { currentUser } from "@/lib/auth";
import { formatCoins } from "@/lib/coins/pricing";
import { isDbConfigured } from "@/lib/db";
import { appUrl } from "@/lib/oauth/providers";
import { SIGNUP_BONUS, getOrCreateCode, listReferrals, referralStats } from "@/lib/referrals";
import { ShareBox } from "./share-box";

export const dynamic = "force-dynamic";

const usd = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function IndiquePage() {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Indique e Ganhe" subtitle="Ganhe CityCoins com cada amigo que usar a Viral City." />
        <EmptyState icon={Database} title="Falta conectar o banco de dados" text="Coloque DATABASE_URL no .env.local (e na Vercel)." />
      </>
    );
  }
  const user = (await currentUser())!;
  const code = await getOrCreateCode(user.id, user.email ?? "VIRAL");
  const [stats, referrals] = await Promise.all([referralStats(user.id), listReferrals(user.id)]);
  const link = `${appUrl()}/?cupom=${code}`;

  const cards = [
    { label: "Cadastros com seu cupom", value: stats.signups.toLocaleString("pt-BR") },
    { label: "Indicados que compraram", value: stats.buyers.toLocaleString("pt-BR") },
    { label: "CityCoins ganhos", value: formatCoins(stats.coins_earned) },
    { label: "Compras geradas", value: usd(stats.usd_generated_cents) },
  ];

  return (
    <>
      <PageHeader title="Indique e Ganhe" subtitle="Compartilhe seu cupom: você ganha 10% em CityCoins de tudo que seus indicados comprarem." />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="glass rounded-2xl p-5 sm:p-6 lg:col-span-3">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <Gift size={17} className="text-sun" /> Seu cupom
          </h2>
          <ShareBox code={code} link={link} />
        </section>
        <aside className="glass rounded-2xl p-5 text-sm text-muted sm:p-6 lg:col-span-2">
          <h2 className="font-semibold text-ink">Como funciona</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Seu amigo cria a conta pelo seu link ou digita o seu cupom no cadastro.</li>
            <li>
              Ele ganha <span className="text-sun">{SIGNUP_BONUS} CityCoins</span> na hora e <span className="text-sun">+10%</span> na primeira recarga.
            </li>
            <li>
              Você ganha <span className="text-sun">10% em CityCoins</span> de cada recarga que ele fizer, para sempre, direto na sua carteira.
            </li>
          </ol>
          <p className="mt-4 text-xs">O cupom vale para contas novas (até 7 dias) e antes da primeira recarga. Não vale usar o próprio cupom.</p>
        </aside>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="num mt-2 font-heading text-3xl font-medium tracking-[-0.03em]">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Seus indicados</h2>
        {referrals.length === 0 ? (
          <EmptyState icon={UserPlus} title="Ninguém ainda" text="Mande seu link para a galera: cada cadastro aparece aqui." />
        ) : (
          <ul className="glass divide-y divide-line rounded-2xl">
            {referrals.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.email}</span>
                <span className="text-xs text-muted">desde {new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                <span className="text-xs text-muted">{r.purchases} {r.purchases === 1 ? "compra" : "compras"}</span>
                <span className="num w-28 text-right font-semibold text-sun">+{formatCoins(r.earned)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
