/**
 * CityCoins — regras puras (sem banco), usadas no painel, no worker e nos testes.
 * 1 CityCoin = US$ 0,01, seja qual for a moeda em que o usuário pagou.
 */

export const COIN_NAME = "CityCoin";
export const COINS_PER_MINUTE = 2;
export const MIN_SOURCE_COINS = 20;

/** Custo para gerar os cortes de um vídeo longo: 2 por minuto (arredondado para cima), mínimo 20. */
export function costForDuration(seconds: number): number {
  const minutes = Math.ceil(Math.max(0, seconds) / 60);
  return Math.max(MIN_SOURCE_COINS, minutes * COINS_PER_MINUTE);
}

export const formatCoins = (n: number) => Math.trunc(n).toLocaleString("pt-BR");

// ---------- moedas aceitas e conversão ----------

export const CURRENCIES = {
  brl: { label: "Real", symbol: "R$", locale: "pt-BR", quick: [10, 25, 50, 100] },
  usd: { label: "Dólar", symbol: "US$", locale: "en-US", quick: [2, 5, 10, 20] },
  eur: { label: "Euro", symbol: "€", locale: "pt-PT", quick: [2, 5, 10, 20] },
  gbp: { label: "Libra", symbol: "£", locale: "en-GB", quick: [2, 5, 10, 20] },
} as const;

export type Currency = keyof typeof CURRENCIES;
export const isCurrency = (c: string): c is Currency => c in CURRENCIES;

/** Quanto 1 USD vale em cada moeda (USD = 1). */
export type UsdRates = Record<Currency, number>;

/** Limites de uma compra, em centavos de dólar: de US$ 1 (100 CityCoins) a US$ 1.000. */
export const MIN_USD_CENTS = 100;
export const MAX_USD_CENTS = 100_000;

export type Quote = { currency: Currency; amountMinor: number; usdCents: number; coins: number; rate: number };

/**
 * Converte um valor na moeda escolhida (em centavos dessa moeda) para CityCoins.
 * Todas as moedas aceitas têm 2 casas decimais, então centavos ÷ taxa = centavos de dólar.
 * Arredonda para baixo: nunca credita mais do que foi pago.
 */
export function quote(amountMinor: number, currency: Currency, rates: UsdRates): Quote {
  const rate = rates[currency];
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Cotação indisponível.");
  const usdCents = Math.floor(Math.round(amountMinor) / rate + 1e-9);
  return { currency, amountMinor: Math.round(amountMinor), usdCents, coins: usdCents, rate };
}

/** Valida o pedido de compra e devolve o erro em português, ou null se estiver ok. */
export function purchaseError(q: Quote): string | null {
  if (!Number.isInteger(q.amountMinor) || q.amountMinor <= 0) return "Digite um valor válido.";
  if (q.usdCents < MIN_USD_CENTS) return "A compra mínima é o equivalente a US$ 1 (100 CityCoins).";
  if (q.usdCents > MAX_USD_CENTS) return "A compra máxima é o equivalente a US$ 1.000 por vez.";
  return null;
}

/** Lê o valor digitado ("25", "25,50", "25.50", "1.000,00") em centavos. NaN se inválido. */
export function parseAmount(raw: string): number {
  let v = raw.replace(/[^\d.,]/g, "");
  const lastSep = Math.max(v.lastIndexOf(","), v.lastIndexOf("."));
  // separador seguido de 1 ou 2 dígitos no fim = decimais; os outros são de milhar
  if (lastSep >= 0 && v.length - lastSep - 1 <= 2) {
    v = `${v.slice(0, lastSep).replace(/[.,]/g, "")}.${v.slice(lastSep + 1)}`;
  } else {
    v = v.replace(/[.,]/g, "");
  }
  if (!/^\d+(\.\d{0,2})?$/.test(v)) return NaN;
  return Math.round(Number(v) * 100);
}

/** "R$ 25,00", "US$ 5.00"… */
export function formatMoney(amountMinor: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCIES[currency].locale, { style: "currency", currency: currency.toUpperCase() }).format(
    amountMinor / 100,
  );
}
