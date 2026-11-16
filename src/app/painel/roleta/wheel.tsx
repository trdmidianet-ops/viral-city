"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LogoMark } from "@/components/brand";
import { CoinMark } from "@/components/coin";
import { formatCoins } from "@/lib/coins/pricing";
import { spinAction } from "./actions";

/* Roleta "sol da cidade": aro de letreiro com lâmpadas, fatias em roxo da marca, a fatia de 500
   com o sol listrado e a logo no centro. O prêmio já vem decidido do servidor; a roda só gira
   até a fatia certa. As animações de apoio ficam em globals.css (seção roleta). */

// Ordem das fatias na roda, no sentido horário a partir do topo (prêmios grandes e pequenos alternados)
const SLICES = [5, 50, 10, 100, 15, 30, 20, 500];
const JACKPOT = 500;
const STEP = 360 / SLICES.length;
const SPIN_MS = 4600;

// Geometria da roda (viewBox 400×400, centro em 200,200). Tudo arredondado para servidor e navegador baterem.
const C = 200;
const R = 196;
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
};
const slicePath = (i: number) => `M${C} ${C}L${at(i * STEP, R)}A${R} ${R} 0 0 1 ${at((i + 1) * STEP, R)}Z`;

const BULBS = Array.from({ length: 24 }, (_, i) => {
  const a = (i * 15 * Math.PI) / 180;
  return { x: (220 + 207 * Math.sin(a)).toFixed(2), y: (220 - 207 * Math.cos(a)).toFixed(2), odd: i % 2 === 1 };
});

// Moedas que saltam do centro quando sai o prêmio: [dx, dy, giro]
const BURST = [
  [-150, -90, -40], [-90, -160, 30], [0, -185, -20], [95, -155, 45], [155, -85, -30],
  [170, 20, 25], [-170, 25, -25], [-120, 110, 35], [120, 115, -35], [0, 150, 20],
];

type Won = { prize: number; balance: number };

export function Wheel({ spins, minCost }: { spins: number; minCost: number }) {
  const [left, setLeft] = useState(spins);
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [spinMs, setSpinMs] = useState(SPIN_MS);
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
    // com "reduzir movimento", a roda dá uma volta curta e o prêmio aparece logo
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduced ? 600 : SPIN_MS;
    setSpinMs(ms);
    // sempre para a frente: completa a volta atual, dá 6 voltas e para com a fatia sob o ponteiro
    setAngle((a) => a - (a % 360) + 360 * (reduced ? 1 : 6) + (360 - center) + jitter);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWon({ prize: res.prize, balance: res.balance });
      setLeft(res.left);
      setBusy(false);
    }, ms + 100);
  }

  const missing = won ? Math.max(0, minCost - won.balance) : 0;
  const big = won ? won.prize >= 50 : false;

  return (
    <div className="flex flex-col items-center">
      <div className="relative aspect-square w-full max-w-[400px]">
        {/* aro de letreiro com lâmpadas (não gira) */}
        <svg viewBox="0 0 440 440" aria-hidden="true" className="absolute inset-0 h-full w-full drop-shadow-[0_0_38px_rgba(255,46,136,0.55)]">
          <defs>
            <linearGradient id="vc-roleta-aro" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffd166" />
              <stop offset="0.5" stopColor="#ff8a3d" />
              <stop offset="1" stopColor="#ff2e88" />
            </linearGradient>
          </defs>
          <circle cx="220" cy="220" r="216" fill="#0b0618" stroke="url(#vc-roleta-aro)" strokeWidth="5" />
          <circle cx="220" cy="220" r="198" fill="none" stroke="#ff2e88" strokeOpacity="0.5" strokeWidth="1.5" />
          {BULBS.map((b, i) => (
            <circle
              key={i}
              cx={b.x}
              cy={b.y}
              r="4.2"
              fill={b.odd ? "#ff2e88" : "#ffd166"}
              className="vc-blink"
              style={{ animationDuration: busy ? "0.45s" : "2.4s", animationDelay: b.odd ? (busy ? "-0.22s" : "-1.2s") : "0s" }}
            />
          ))}
        </svg>

        {/* roda que gira */}
        <div
          aria-hidden="true"
          className="absolute inset-[5.5%]"
          style={{ transform: `rotate(${angle}deg)`, transition: `transform ${spinMs}ms cubic-bezier(0.12, 0.72, 0.08, 1)` }}
        >
          <svg viewBox="0 0 400 400" className="h-full w-full">
            <defs>
              <radialGradient id="vc-roleta-sol" gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R}>
                <stop offset="0.2" stopColor="#ffe08a" />
                <stop offset="0.6" stopColor="#ff8a3d" />
                <stop offset="1" stopColor="#ff2e88" />
              </radialGradient>
              <radialGradient id="vc-roleta-fundo" gradientUnits="userSpaceOnUse" cx={C} cy={C} r={R}>
                <stop offset="0.25" stopColor="#3a1670" />
                <stop offset="1" stopColor="#1a0c3a" />
              </radialGradient>
              <clipPath id="vc-roleta-premio">
                <path d={slicePath(SLICES.indexOf(JACKPOT))} />
              </clipPath>
            </defs>
            {SLICES.map((coins, i) => (
              <path
                key={coins}
                d={slicePath(i)}
                fill={coins === JACKPOT ? "url(#vc-roleta-sol)" : i % 2 ? "url(#vc-roleta-fundo)" : "#150a30"}
              />
            ))}
            {/* faixas do sol na fatia do prêmio máximo */}
            <g clipPath="url(#vc-roleta-premio)" fill="none" stroke="#0b0618" strokeOpacity="0.28">
              <circle cx={C} cy={C} r="150" strokeWidth="5" />
              <circle cx={C} cy={C} r="166" strokeWidth="7" />
              <circle cx={C} cy={C} r="184" strokeWidth="9" />
            </g>
            {SLICES.map((coins, i) => (
              <path key={coins} d={`M${C} ${C}L${at(i * STEP, R)}`} stroke="#ff2e88" strokeOpacity="0.6" strokeWidth="1.5" />
            ))}
            <circle cx={C} cy={C} r={R - 1} fill="none" stroke="#ff2e88" strokeOpacity="0.7" strokeWidth="2" />
            {SLICES.map((coins, i) => (
              <text
                key={coins}
                x={C}
                y={coins === JACKPOT ? 82 : 86}
                textAnchor="middle"
                transform={`rotate(${i * STEP + STEP / 2} ${C} ${C})`}
                fontSize={coins === JACKPOT ? 46 : 42}
                fontStyle={coins === JACKPOT ? "italic" : undefined}
                fill={coins === JACKPOT ? "#0b0618" : coins >= 50 ? "#ffd166" : "#f6eefe"}
                style={{ fontFamily: "var(--font-serif), Georgia, serif" }}
              >
                {coins}
              </text>
            ))}
          </svg>
        </div>

        {/* centro com a logo (não gira) */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 flex h-[24%] w-[24%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-night shadow-[0_0_0_3px_#ffd166,0_0_28px_rgba(255,209,102,0.6)]"
        >
          <LogoMark size={56} />
        </div>

        {/* ponteiro */}
        <svg viewBox="0 0 40 48" aria-hidden="true" className="absolute left-1/2 top-[-3%] h-[13%] -translate-x-1/2 drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)]">
          <path d="M20 46 L4 12 A17 17 0 1 1 36 12 Z" fill="#ffd166" stroke="#0b0618" strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="20" cy="15" r="5" fill="#0b0618" />
        </svg>

        {/* moedas saltando quando sai o prêmio */}
        {won && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            {BURST.slice(0, big ? BURST.length : 5).map(([dx, dy, rot], i) => (
              <span
                key={i}
                className="vc-coin-pop absolute left-1/2 top-1/2"
                style={{ ["--dx" as string]: `${dx}px`, ["--dy" as string]: `${dy}px`, ["--rot" as string]: `${rot}deg`, animationDelay: `${i * 35}ms` }}
              >
                <CoinMark size={big ? 30 : 24} />
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={busy || left <= 0}
        className="btn-sunset mt-8 min-h-12 rounded-full px-12 py-3 text-lg font-bold text-night disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Girando…" : left > 0 ? "Girar" : "Sem giros no momento"}
      </button>
      <p className="mt-3 text-sm text-ink/80" aria-live="polite">
        {left > 0 ? `Você tem ${left} ${left === 1 ? "giro" : "giros"}.` : "Volte quando ganhar um novo giro."}
      </p>

      <div role="status" aria-live="polite" className="mt-6 w-full max-w-md empty:hidden">
        {error && <p className="rounded-xl border border-pink/40 bg-night/80 px-4 py-3 text-sm text-ink">{error}</p>}
        {won && (
          <div className="vc-prize-in rounded-2xl border border-sun/40 bg-night/85 p-6 text-center shadow-[0_24px_60px_-30px_rgba(255,209,102,0.7)]">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">Você ganhou</p>
            <p className="num mt-2 flex items-center justify-center gap-3 font-serif text-7xl leading-none">
              <CoinMark size={52} />
              <span className="text-sunset">{formatCoins(won.prize)}</span>
            </p>
            <p className="mt-1 text-sm text-muted">CityCoins</p>
            <p className="num mt-3 text-sm text-ink/80">Saldo agora: {formatCoins(won.balance)}</p>
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
