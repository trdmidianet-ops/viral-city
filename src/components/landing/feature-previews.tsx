import { Lock } from "lucide-react";

/* Mini-prévias animadas dos recursos (só CSS, sem JavaScript). As animações ficam em landing.css. */

const TOP_CUTS = [
  { label: "“O dia em que quase desisti”", score: 94 },
  { label: "“3 erros que custam inscritos”", score: 88 },
  { label: "“Ninguém te conta isso”", score: 81 },
];

export function ScorePreview() {
  const r = 42;
  const len = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="vc-score" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--sun)" />
              <stop offset="0.5" stopColor="var(--orange)" />
              <stop offset="1" stopColor="var(--pink)" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <circle
            className="vc-gauge"
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#vc-score)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={len}
            style={{ ["--len" as string]: len, ["--to" as string]: len * 0.06 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num font-heading text-3xl font-semibold">94</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted">nota viral</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5">
        {TOP_CUTS.map((c, i) => (
          <li key={c.label}>
            <div className="flex justify-between gap-2 text-xs">
              <span className="truncate text-ink/90">{c.label}</span>
              <span className="num font-mono text-sun">{c.score}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="vc-bar h-full rounded-full bg-gradient-to-r from-pink to-orange"
                style={{ width: `${c.score}%`, animationDelay: `${i * 0.15}s` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Celular alternando os 3 enquadramentos: fundo desfocado, centralizado e tela dividida. */
export function FramingPreview() {
  return (
    <div className="mx-auto w-[150px]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-[22px] bg-night ring-[5px] ring-night-3 shadow-[0_0_40px_-8px_rgba(139,61,255,0.7)]">
        {/* desfocado */}
        <div className="vc-frame vc-frame-1 absolute inset-0">
          <div className="absolute inset-0 scale-125 bg-[linear-gradient(135deg,#3b1a6e,#a2246a,#ff8a3d)] blur-md" />
          <div className="absolute inset-x-0 top-1/2 aspect-video -translate-y-1/2 bg-[linear-gradient(135deg,#3b1a6e,#a2246a_55%,#ff8a3d)]">
            <Person />
          </div>
        </div>
        {/* centralizado */}
        <div className="vc-frame vc-frame-2 absolute inset-0 bg-[linear-gradient(160deg,#2a1150,#a2246a_60%,#ff8a3d)]">
          <Person big />
        </div>
        {/* tela dividida */}
        <div className="vc-frame vc-frame-3 absolute inset-0 grid grid-rows-2">
          <div className="relative bg-[linear-gradient(135deg,#1e1140,#8b3dff)]">
            <Person />
          </div>
          <div className="relative border-t border-night bg-[linear-gradient(135deg,#a2246a,#ff8a3d)]">
            <Person />
          </div>
        </div>
        <div className="absolute inset-x-0 top-3 text-center">
          <span className="rounded-full bg-night/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ink/80">9:16</span>
        </div>
      </div>
      <div className="relative mt-3 h-4 text-center font-mono text-[10px] uppercase tracking-widest text-cyan">
        <span className="vc-frame vc-frame-1 absolute inset-0">fundo desfocado</span>
        <span className="vc-frame vc-frame-2 absolute inset-0">centralizado</span>
        <span className="vc-frame vc-frame-3 absolute inset-0">tela dividida</span>
      </div>
    </div>
  );
}

export function Person({ big = false }: { big?: boolean }) {
  return (
    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${big ? "w-[70%]" : "w-[38%]"}`}>
      <div className="mx-auto aspect-square w-[42%] rounded-full bg-night/80" />
      <div className="mt-[4%] aspect-[2/1] rounded-t-full bg-night/80" />
    </div>
  );
}

const WORDS = ["ISSO", "MUDOU", "TUDO", "PRA", "MIM"];

export function CaptionsPreview() {
  return (
    <div className="flex h-full min-h-[96px] items-center justify-center rounded-xl bg-[linear-gradient(160deg,#2a1150,#a2246a_70%,#ff8a3d)] px-3">
      <p className="text-center font-heading text-xl font-extrabold tracking-tight [text-shadow:0_2px_0_#0b0618]">
        {WORDS.map((w, i) => (
          <span key={w + i} className="vc-word mx-0.5 inline-block" style={{ animationDelay: `${i * 0.45}s` }}>
            {w}
          </span>
        ))}
      </p>
    </div>
  );
}

const BLIPS = [
  { x: 64, y: 28, d: 0.3 },
  { x: 30, y: 40, d: 1.1 },
  { x: 72, y: 66, d: 1.8 },
  { x: 40, y: 74, d: 2.4 },
];

export function RadarPreview() {
  return (
    <div className="relative mx-auto aspect-square w-[118px] overflow-hidden rounded-full bg-night ring-1 ring-cyan/40">
      <div className="absolute inset-[18%] rounded-full ring-1 ring-cyan/20" />
      <div className="absolute inset-[36%] rounded-full ring-1 ring-cyan/20" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-cyan/15" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-cyan/15" />
      <div className="vc-sweep absolute inset-0 rounded-full" />
      {BLIPS.map((b) => (
        <span
          key={`${b.x}-${b.y}`}
          className="vc-blip absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink shadow-[0_0_10px_var(--pink)]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s` }}
        />
      ))}
    </div>
  );
}

const WEEK = [
  { day: "Seg", time: "12:00", on: true },
  { day: "Ter", time: "18:00", on: true },
  { day: "Qua", time: "—", on: false },
  { day: "Qui", time: "12:00", on: true },
  { day: "Sex", time: "18:00", on: true, next: true },
  { day: "Sáb", time: "10:00", on: true },
  { day: "Dom", time: "—", on: false },
];

export function SchedulePreview() {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {WEEK.map((d) => (
        <div
          key={d.day}
          className={`rounded-lg px-1 py-2.5 text-center ${
            d.next
              ? "vc-pulse bg-gradient-to-b from-pink to-orange text-white"
              : d.on
                ? "bg-purple/25 ring-1 ring-inset ring-purple/40"
                : "bg-white/[0.04] text-muted"
          }`}
        >
          <div className="text-[10px] uppercase tracking-wider opacity-80">{d.day}</div>
          <div className="num mt-1 font-mono text-[11px]">{d.time}</div>
        </div>
      ))}
    </div>
  );
}

export function SecurePreview() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-night/70 p-3 ring-1 ring-white/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Login oficial do Google</p>
        <p className="font-mono text-[10px] text-muted">nenhuma senha guardada</p>
      </div>
      <Lock size={16} className="shrink-0 text-cyan" />
    </div>
  );
}
