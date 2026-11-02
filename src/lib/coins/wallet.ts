import { query, queryOne } from "@/lib/db";
import type { Currency, UsdRates } from "./pricing";

/**
 * Carteira de CityCoins no banco. Todo movimento passa pelas funções SQL da migração
 * 0003_citycoins (atômicas e idempotentes). Usado pelo servidor e pelo worker.
 */

export type LedgerEntry = {
  id: number;
  amount: number;
  balance_after: number;
  kind: "purchase" | "spend" | "refund" | "bonus" | "adjust";
  description: string;
  created_at: string;
};

export async function getBalance(userId: string): Promise<number> {
  const row = await queryOne<{ balance: number }>("select balance from vc_wallets where user_id = $1", [userId]);
  return row?.balance ?? 0;
}

export async function listLedger(userId: string, limit = 30): Promise<LedgerEntry[]> {
  return query<LedgerEntry>(
    "select id, amount, balance_after, kind, description, created_at from vc_coin_ledger where user_id = $1 order by id desc limit $2",
    [userId, limit],
  );
}

export async function createPurchase(p: {
  userId: string;
  sessionId: string;
  currency: Currency;
  amountMinor: number;
  usdCents: number;
  coins: number;
  rate: number;
}) {
  await query(
    `insert into vc_purchases (user_id, stripe_session_id, currency, amount_minor, usd_cents, coins, usd_rate)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [p.userId, p.sessionId, p.currency, p.amountMinor, p.usdCents, p.coins, p.rate],
  );
}

/** Credita uma compra paga. Devolve o novo saldo, ou null se já tinha sido creditada. */
export async function creditPurchase(sessionId: string): Promise<number | null> {
  return (await queryOne<{ v: number | null }>("select vc_credit_purchase($1) as v", [sessionId]))?.v ?? null;
}

export async function expirePurchase(sessionId: string) {
  await query("update vc_purchases set status = 'expired' where stripe_session_id = $1 and status = 'pending'", [sessionId]);
}

export type ChargeResult = { ok: true; balance: number | null } | { ok: false; reason: "insufficient" };

/** Cobra uma fonte uma única vez (null em balance = já estava cobrada). */
export async function chargeSource(sourceId: string, coins: number, description: string): Promise<ChargeResult> {
  try {
    const row = await queryOne<{ v: number | null }>("select vc_charge_source($1, $2, $3) as v", [sourceId, coins, description]);
    return { ok: true, balance: row?.v ?? null };
  } catch (err) {
    if (err instanceof Error && err.message.includes("saldo_insuficiente")) return { ok: false, reason: "insufficient" };
    throw err;
  }
}

/** Devolve os CityCoins de uma fonte que falhou (não faz nada se ela não foi cobrada). */
export async function refundSource(sourceId: string, description: string): Promise<number | null> {
  return (await queryOne<{ v: number | null }>("select vc_refund_source($1, $2) as v", [sourceId, description]))?.v ?? null;
}

/** Cotação do dólar nas moedas aceitas (Frankfurter, taxas do Banco Central Europeu; cache de 1 h). */
export async function usdRates(): Promise<UsdRates> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR,GBP", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Cotação indisponível no momento. Tente de novo em instantes.");
  const body = (await res.json()) as { rates?: Record<string, number> };
  const r = body.rates ?? {};
  if (!(r.BRL > 0 && r.EUR > 0 && r.GBP > 0)) throw new Error("Cotação indisponível no momento.");
  return { usd: 1, brl: r.BRL, eur: r.EUR, gbp: r.GBP };
}
