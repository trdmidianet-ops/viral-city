"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CoinAmount } from "@/components/coin";
import { formatCoins } from "@/lib/coins/pricing";
import { spinAction } from "./actions";

/* Roleta com visual PROVISÓRIO: oito fatias iguais, ponteiro no topo. O prêmio já vem decidido
   do servidor; aqui a roda só gira até a fatia certa. A estética definitiva vem depois. */

// Ordem das fatias na roda, no sentido horário a partir do topo (prêmios grandes e pequenos alternados)
const SLICES = [5, 50, 10, 100, 15, 30, 20, 500];
const STEP = 360 / SLICES.length;
const SPIN_MS = 4200;

const sliceColor = (i: number) => (SLICES[i] === 500 ? "#ff8a3d" : i % 2 ? "#2a1052" : "#1e1140");
const WHEEL_BG = `conic-gradient(${SLICES.map((_, i) => `${sliceColor(i)} ${i * STEP}deg ${(i + 1) * STEP}deg`).join(", ")})`;

type Won = { prize: number; balance: number };

export function Wheel({ spins, minCost }: { spins: number; minCost: number }) {
  const [left, setLeft] = useState(spins);
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<Won | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function spin() {
    if (busy || left <= 0) return;
    setBusy(true);
    setWon(null);
    setError(null);
    const res = await spinAction();
    if ("error" in res) {
      setError(res.error);
      setBusy(false);
      return;
    }
    const index = Math.max(0, SLICES.indexOf(res.prize));
    const center = index * STEP + STEP / 2;
    const jitter = (Math.random() - 0.5) * (STEP * 0.6);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // sempre para a frente: completa a volta atual, dá 5 voltas e para com a fatia sob o ponteiro
    setAngle((a) => a - (a % 360) + 360 * (reduced ? 1 : 5) + (360 - center) + jitter);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => {
        setWon({ prize: res.prize, balance: res.balance });
        setLeft(res.left);
        setBusy(false);
      },
      reduced ? 300 : SPIN_MS,
    );
  }

  const missing = won ? Math.max(0, minCost - won.balance) : 0;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[280px] w-[280px] sm:h-[340px] sm:w-[340px]">
        {/* ponteiro */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-[-6px] z-10 h-0 w-0 -translate-x-1/2 border-x-[12px] border-t-[20px] border-x-transparent border-t-sun drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
        />
        <div
          aria-hidden="true"
          className="h-full w-full rounded-full border-4 border-pink/60 shadow-[0_0_50px_-10px_rgba(255,46,136,0.7)] motion-reduce:!duration-300"
          style={{
            background: WHEEL_BG,
            transform: `rotate(${angle}deg)`,
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.1, 1)`,
          }}
        >
          {SLICES.map((coins, i) => (
            <span
              key={coins}
              className="absolute left-1/2 top-0 h-1/2 w-12 origin-bottom pt-5 text-center"
              style={{ transform: `translateX(-50%) rotate(${i * STEP + STEP / 2}deg)` }}
            >
              <span className={`num block font-heading text-lg font-bold ${coins === 500 ? "text-night" : "text-ink"}`}>
                {coins}
              </span>
            </span>
          ))}
        </div>
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sun bg-night" />
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={busy || left <= 0}
        className="btn-sunset mt-8 min-h-12 rounded-full px-10 py-3 font-bold text-night disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Girando…" : left > 0 ? "Girar" : "Sem giros no momento"}
      </button>
      <p className="mt-3 text-sm text-muted" aria-live="polite">
        {left > 0 ? `Você tem ${left} ${left === 1 ? "giro" : "giros"}.` : "Volte quando ganhar um novo giro."}
      </p>

      <div role="status" aria-live="polite" className="mt-6 w-full max-w-md">
        {error && <p className="rounded-xl border border-pink/40 bg-pink/10 px-4 py-3 text-sm text-ink">{error}</p>}
        {won && (
          <div className="glass rounded-2xl p-5 text-center">
            <p className="text-sm text-muted">Você ganhou</p>
            <p className="mt-1 flex items-center justify-center gap-2 text-3xl">
              <CoinAmount value={won.prize} size={30} /> <span className="text-base text-muted">CityCoins</span>
            </p>
            <p className="num mt-2 text-sm text-muted">Saldo agora: {formatCoins(won.balance)}</p>
            {missing > 0 ? (
              <>
                <p className="mt-4 text-sm">
                  Faltam <strong className="num">{formatCoins(missing)}</strong> CityCoins para o seu próximo vídeo.
                </p>
                <Link href="/painel/carteira" className="btn-sunset mt-3 inline-block rounded-full px-6 py-2.5 text-sm font-bold text-night">
                  Recarregar
                </Link>
              </>
            ) : (
              <Link href="/painel/scale" className="btn-sunset mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-bold text-night">
                Usar agora: cortar um vídeo
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
