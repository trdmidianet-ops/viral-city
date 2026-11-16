import { randomInt } from "node:crypto";
import { queryOne } from "@/lib/db";
import {
  JACKPOT_COINS,
  JACKPOT_COOLDOWN_DAYS,
  JACKPOT_FALLBACK_COINS,
  MAX_SPINS_PER_MONTH,
  MAX_STORED_SPINS,
  SPIN_TTL_DAYS,
  TOTAL_WEIGHT,
  prizeForRoll,
  type SpinReason,
} from "./rules";

/**
 * Roleta no banco. Conceder e girar passam pelas funções SQL da migração 0009_roulette
 * (atômicas e idempotentes). Só o servidor e o worker chamam isto.
 */

export type GrantResult = "ok" | "ja_concedido" | "inelegivel" | "limite_guardados" | "limite_mensal";

/**
 * Concede um giro. `key` identifica o motivo exato (ex.: "cuts:10"): chamar de novo com a mesma
 * chave não concede outro.
 */
export async function grantSpin(userId: string, reason: SpinReason, key: string): Promise<GrantResult> {
  const row = await queryOne<{ r: GrantResult }>("select vc_grant_spin($1, $2, $3, $4, $5, $6) as r", [
    userId,
    reason,
    key,
    SPIN_TTL_DAYS,
    MAX_STORED_SPINS,
    MAX_SPINS_PER_MONTH,
  ]);
  return row?.r ?? "inelegivel";
}

/** Quantos giros válidos a conta tem e quando vence o mais próximo. */
export async function availableSpins(userId: string): Promise<{ count: number; nextExpiry: string | null }> {
  const row = await queryOne<{ count: number; next_expiry: string | null }>(
    `select count(*)::int as count, min(expires_at) as next_expiry
       from vc_roulette_spins where user_id = $1 and used_at is null and expires_at > now()`,
    [userId],
  );
  return { count: row?.count ?? 0, nextExpiry: row?.next_expiry ?? null };
}

export type SpinResult = { prize: number; balance: number };

/**
 * Gira a roleta: sorteia no servidor (gerador criptográfico), usa um giro e credita o prêmio.
 * Devolve null se a conta não tem giro disponível.
 */
export async function spinRoulette(userId: string): Promise<SpinResult | null> {
  const prize = prizeForRoll(randomInt(TOTAL_WEIGHT));
  const row = await queryOne<{ won_prize: number; new_balance: string | number }>(
    "select won_prize, new_balance from vc_spin_roulette($1, $2, $3, $4, $5)",
    [userId, prize, JACKPOT_COINS, JACKPOT_COOLDOWN_DAYS, JACKPOT_FALLBACK_COINS],
  );
  return row ? { prize: row.won_prize, balance: Number(row.new_balance) } : null;
}
