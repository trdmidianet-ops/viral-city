import { CheckCircle2, Database, Scissors, X } from "lucide-react";
import { CoinMark } from "@/components/coin";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { requireUserId } from "@/lib/auth";
import { COINS_PER_MINUTE, MIN_SOURCE_COINS, costForDuration, formatCoins, type UsdRates } from "@/lib/coins/pricing";
import { isStripeConfigured, settleCheckout } from "@/lib/coins/stripe";
import { getBalance, listLedger, usdRates, type LedgerEntry } from "@/lib/coins/wallet";
import { isDbConfigured } from "@/lib/db";
import { BuyForm } from "./buy-form";

export const dynamic = "force-dynamic";

const kindLabel: Record<LedgerEntry["kind"], string> = {
  purchase: "Compra",
  spend: "Uso",
  refund: "Estorno",
  bonus: "Bônus",
  adjust: "Ajuste",
};

const date = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default async function CarteiraPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string; session_id?: string }>;
}) {
  if (!isDbConfigured()) {
    return (
      <>
        <PageHeader title="Carteira" subtitle="Seus CityCoins, o combustível da Viral City." />
        <EmptyState icon={Database} title="Falta conectar o banco de dados" text="A carteira fica no banco da Viral City." />
      </>
    );
  }

  const userId = await requireUserId();
  const { compra, session_id } = await searchParams;

  // Reforço do webhook: ao voltar da Stripe, confere e credita na hora (idempotente)
  let credited = false;
  if (compra === "ok" && session_id && /^cs_[\w]+$/.test(session_id) && isStripeConfigured()) {
    credited = (await settleCheckout(session_id, userId).catch(() => null)) !== null;
  }

  const [balance, ledger, rates] = await Promise.all([
    getBalance(userId),
    listLedger(userId),
    usdRates().catch((): UsdRates | null => null),
  ]);
  const payments = isStripeConfigured();

  return (
    <>
      <PageHeader title="Carteira" subtitle="CityCoins são o combustível da Viral City: quanto mais você tem, mais cortes faz." />

      {compra === "ok" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
          <CheckCircle2 size={18} />
          {credited ? "Pagamento confirmado: seus CityCoins já estão na carteira." : "Pagamento recebido. Os CityCoins aparecem aqui em instantes."}
        </p>
      )}
      {compra === "cancelada" && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-line bg-night/40 px-4 py-3 text-sm text-muted">
          <X size={18} /> Pagamento cancelado. Nada foi cobrado.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="glass relative overflow-hidden rounded-2xl p-6 lg:col-span-2">
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(255,209,102,0.25),transparent_70%)]" />
          <p className="text-sm text-muted">Seu saldo</p>
          <p className="num mt-2 flex items-center gap-3 font-heading text-5xl font-semibold tracking-[-0.03em]">
            <CoinMark size={52} />
            {formatCoins(balance)}
          </p>
          <p className="num mt-1 text-sm text-muted">≈ US$ {(balance / 100).toFixed(2)}</p>

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <p className="flex items-start gap-2">
              <Scissors size={16} className="mt-0.5 shrink-0 text-orange" />
              <span>
                Cortes custam <strong>{COINS_PER_MINUTE} CityCoins por minuto</strong> do vídeo longo (mínimo{" "}
                {MIN_SOURCE_COINS}). Um vídeo de 30 min sai por {formatCoins(costForDuration(30 * 60))}.
              </span>
            </p>
            <p className="text-muted">
              Se o processamento falhar, os CityCoins voltam sozinhos para a carteira. Editar texto, trocar
              enquadramento e aprovar cortes não custam nada.
            </p>
          </div>
        </section>

        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <h2 className="font-medium">Comprar CityCoins</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Escolha a moeda e o valor que quiser: a conversão é automática.</p>
          {payments ? (
            <BuyForm rates={rates} defaultCurrency="brl" />
          ) : (
            <p className="rounded-lg border border-sun/30 bg-sun/10 p-3 text-sm text-sun">
              Pagamentos ainda não configurados: falta STRIPE_SECRET_KEY no servidor.
            </p>
          )}
        </section>
      </div>

      <section className="glass mt-6 rounded-2xl p-6">
        <h2 className="font-medium">Extrato</h2>
        {ledger.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="pb-2 font-normal">Quando</th>
                  <th className="pb-2 font-normal">Movimento</th>
                  <th className="pb-2 text-right font-normal">CityCoins</th>
                  <th className="pb-2 text-right font-normal">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e) => (
                  <tr key={e.id} className="border-t border-line">
                    <td className="py-2.5 pr-3 text-muted">{date(e.created_at)}</td>
                    <td className="py-2.5 pr-3">
                      <span className="mr-2 rounded-md bg-white/5 px-1.5 py-0.5 text-xs text-muted">{kindLabel[e.kind]}</span>
                      {e.description}
                    </td>
                    <td className={`py-2.5 text-right font-medium ${e.amount > 0 ? "text-cyan" : "text-pink"}`}>
                      {e.amount > 0 ? "+" : "−"}
                      {formatCoins(Math.abs(e.amount))}
                    </td>
                    <td className="py-2.5 text-right text-muted">{formatCoins(e.balance_after)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
