/**
 * Roleta de CityCoins — regras puras (sem banco), usadas no servidor, no worker e nos testes.
 * O giro nunca é vendido: só se ganha (por uso ou por inatividade). O prêmio entra na carteira como bônus.
 */

/** Prêmios e pesos em milésimos (a soma dá 1000). Menor prêmio = mais provável. */
export const PRIZES = [
  { coins: 5, weight: 280 },
  { coins: 10, weight: 240 },
  { coins: 15, weight: 170 },
  { coins: 20, weight: 130 },
  { coins: 30, weight: 90 },
  { coins: 50, weight: 55 },
  { coins: 100, weight: 30 },
  { coins: 500, weight: 5 },
] as const;

export const TOTAL_WEIGHT = PRIZES.reduce((sum, p) => sum + p.weight, 0);

/** Prêmio máximo: no máximo um por conta a cada JACKPOT_COOLDOWN_DAYS; dentro do prazo, paga o segundo maior. */
export const JACKPOT_COINS = 500;
export const JACKPOT_COOLDOWN_DAYS = 90;
export const JACKPOT_FALLBACK_COINS = 100;

/** Um giro vale por 7 dias; a conta guarda até 3 e ganha até 4 a cada 30 dias. */
export const SPIN_TTL_DAYS = 7;
export const MAX_STORED_SPINS = 3;
export const MAX_SPINS_PER_MONTH = 4;

/** Giro por inatividade: dias sem processar vídeo. Giro por uso: a cada N cortes aprovados. */
export const INACTIVITY_DAYS = [7, 21] as const;
export const CUTS_PER_SPIN = 5;
/** Quem está parado há mais do que isso não recebe giro automático (evita uma onda de e-mails para contas antigas). */
export const INACTIVITY_MAX_DAYS = 45;

export type SpinReason = "inactive_7" | "inactive_21" | "cuts" | "admin";

/**
 * Chave do giro por uso para um total de cortes aprovados: "cuts:5", "cuts:10"…
 * Devolve null antes do primeiro múltiplo. A mesma chave nunca concede dois giros.
 */
export function approvalsSpinKey(approvedCount: number): string | null {
  const reached = Math.floor(Math.max(0, approvedCount) / CUTS_PER_SPIN) * CUTS_PER_SPIN;
  return reached >= CUTS_PER_SPIN ? `cuts:${reached}` : null;
}

/** Chance de cada prêmio, em porcentagem (para a tela "ver chances"). */
export const odds = () => PRIZES.map((p) => ({ coins: p.coins, percent: (p.weight / TOTAL_WEIGHT) * 100 }));

/** Prêmio médio por giro, em CityCoins. */
export const expectedCoins = () => PRIZES.reduce((sum, p) => sum + p.coins * p.weight, 0) / TOTAL_WEIGHT;

/**
 * Converte um número sorteado em [0, TOTAL_WEIGHT) no prêmio correspondente.
 * Separado do sorteio para os testes cobrirem todas as faixas.
 */
export function prizeForRoll(roll: number): number {
  if (!Number.isInteger(roll) || roll < 0 || roll >= TOTAL_WEIGHT) throw new Error("Sorteio fora da faixa.");
  let acc = 0;
  for (const p of PRIZES) {
    acc += p.weight;
    if (roll < acc) return p.coins;
  }
  throw new Error("Tabela de prêmios inconsistente.");
}
