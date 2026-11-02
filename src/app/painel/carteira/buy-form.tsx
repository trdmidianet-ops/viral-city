"use client";

import { useActionState, useState } from "react";
import { CoinMark } from "@/components/coin";
import {
  CURRENCIES,
  MAX_USD_CENTS,
  MIN_USD_CENTS,
  formatCoins,
  parseAmount,
  type Currency,
  type UsdRates,
} from "@/lib/coins/pricing";
import { buyCoinsAction, type BuyState } from "./actions";

const field = "rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

export function BuyForm({ rates, defaultCurrency }: { rates: UsdRates | null; defaultCurrency: Currency }) {
  const [state, action, pending] = useActionState<BuyState, FormData>(buyCoinsAction, {});
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [amount, setAmount] = useState(String(CURRENCIES[defaultCurrency].quick[1]));

  const minor = parseAmount(amount);
  // Mesma conta do servidor (pricing.quote); o valor final é recalculado lá, com a cotação do momento
  const coins = rates && Number.isFinite(minor) ? Math.floor(minor / rates[currency] + 1e-9) : 0;
  const tooLow = coins > 0 && coins < MIN_USD_CENTS;
  const tooHigh = coins > MAX_USD_CENTS;
  const { symbol, quick } = CURRENCIES[currency];

  if (!rates) {
    return <p className="text-sm text-muted">Cotação indisponível agora. Recarregue a página em instantes.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <label className="sr-only" htmlFor="currency">Moeda</label>
        <select
          id="currency"
          name="currency"
          value={currency}
          onChange={(e) => {
            const next = e.target.value as Currency;
            setCurrency(next);
            setAmount(String(CURRENCIES[next].quick[1]));
          }}
          className={field}
        >
          {(Object.keys(CURRENCIES) as Currency[]).map((c) => (
            <option key={c} value={c}>
              {CURRENCIES[c].symbol} · {CURRENCIES[c].label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="amount">Valor</label>
        <input
          id="amount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="25,00"
          className={`${field} num font-heading text-lg`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {quick.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setAmount(String(v))}
            className={`num rounded-full border px-3 py-1 text-sm transition ${
              parseAmount(amount) === v * 100 ? "border-pink bg-pink/15 text-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            {symbol} {v}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-line bg-night/40 px-4 py-3">
        <span className="text-sm text-muted">Você recebe</span>
        <span className="num flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
          <CoinMark size={26} />
          {formatCoins(coins)}
        </span>
      </div>
      <p className="text-xs text-muted">
        1 CityCoin = US$ 0,01. Hoje US$ 1 = {symbol} {rates[currency].toFixed(2).replace(".", ",")}. A cotação fica
        travada quando você abre o pagamento.
      </p>

      {(tooLow || tooHigh || state.error) && (
        <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-pink">
          {tooLow
            ? "A compra mínima é o equivalente a US$ 1 (100 CityCoins)."
            : tooHigh
              ? "A compra máxima é o equivalente a US$ 1.000 por vez."
              : state.error}
        </p>
      )}

      <button
        disabled={pending || !coins || tooLow || tooHigh}
        className="btn-sunset w-full rounded-full px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Abrindo pagamento…" : `Comprar ${formatCoins(coins)} CityCoins`}
      </button>
      <p className="text-center text-xs text-muted">Pagamento seguro pela Stripe. Você volta para cá ao terminar.</p>
    </form>
  );
}
