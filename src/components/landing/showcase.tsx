import { Flame, GraduationCap, Mic, MessagesSquare, Presentation, Radio, Video, type LucideIcon } from "lucide-react";
import { Person } from "./feature-previews";

/* Vitrine logo abaixo do hero: celulares com cortes de exemplo passando devagar. */

type Short = { hook: string; caption: string[]; score: number; format: string; icon: LucideIcon; bg: string };

const SHORTS: Short[] = [
  { hook: "O erro que quase acabou com meu canal", caption: ["ninguém", "te", "conta"], score: 94, format: "Podcast", icon: Mic, bg: "linear-gradient(160deg,#2a1150,#a2246a 60%,#ff8a3d)" },
  { hook: "Aprenda isso em 30 segundos", caption: ["anota", "essa", "dica"], score: 88, format: "Aula", icon: GraduationCap, bg: "linear-gradient(160deg,#0f2a4a,#1d6f8a 55%,#22d3ee)" },
  { hook: "Ele não esperava essa pergunta", caption: ["olha", "a", "reação"], score: 91, format: "Entrevista", icon: MessagesSquare, bg: "linear-gradient(160deg,#3b0f3a,#8b3dff 60%,#ff2e88)" },
  { hook: "O momento mais tenso da live", caption: ["foi", "ao", "vivo"], score: 86, format: "Live", icon: Radio, bg: "linear-gradient(160deg,#3a0b18,#c2185b 55%,#ff8a3d)" },
  { hook: "Por que você trava na frente da câmera", caption: ["faz", "isso", "aqui"], score: 83, format: "Palestra", icon: Presentation, bg: "linear-gradient(160deg,#1e1140,#5b2a9e 55%,#ffd166)" },
  { hook: "Um dia inteiro em 40 segundos", caption: ["vem", "comigo", "hoje"], score: 89, format: "Vlog", icon: Video, bg: "linear-gradient(160deg,#102a2a,#1d9e75 55%,#ffd166)" },
];

function Phone({ s, i }: { s: Short; i: number }) {
  return (
    <div className="vc-short relative aspect-[9/16] w-[150px] shrink-0 overflow-hidden rounded-[24px] border-[5px] border-[#2c1d52] sm:w-[170px]">
      <div className="absolute inset-0" style={{ background: s.bg }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(255,209,102,0.35),transparent_45%)]" />
      <div className="absolute inset-x-[12%] bottom-0 opacity-70">
        <Person big />
      </div>
      {/* escurece a base para a legenda e o rodapé lerem bem */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-night/85 to-transparent" />
      <span className="absolute left-1/2 top-1.5 h-3 w-12 -translate-x-1/2 rounded-full bg-night" />

      {/* nota viral */}
      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-night/80 px-2 py-0.5 text-[11px] font-semibold text-sun ring-1 ring-sun/40">
        <Flame size={11} className="fill-orange text-orange" />
        <span className="num">{s.score}</span>
      </span>

      {/* gancho no topo */}
      <p className="absolute inset-x-2.5 top-9 text-center font-heading text-[13px] font-extrabold uppercase leading-tight text-white [text-shadow:0_2px_0_#0b0618,0_0_8px_rgba(11,6,24,0.8)]">
        {s.hook}
      </p>

      {/* legenda palavra por palavra */}
      <p className="absolute inset-x-2 bottom-12 text-center font-heading text-base font-extrabold uppercase text-white [text-shadow:0_2px_0_#0b0618]">
        {s.caption.map((w, j) => (
          <span key={w + j} className="vc-word mx-0.5 inline-block" style={{ animationDelay: `${(i * 0.3 + j * 0.9) % 2.7}s` }}>
            {w}
          </span>
        ))}
      </p>

      {/* formato e progresso */}
      <div className="absolute inset-x-2.5 bottom-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-night/75 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink/90">
          <s.icon size={11} className="text-pink" /> {s.format}
        </span>
        <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-white/25">
          <div className="vc-progress h-full rounded-full bg-white" style={{ animationDelay: `-${i * 1.3}s` }} />
        </div>
      </div>
    </div>
  );
}

export function ShortsShowcase() {
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 gap-5 pr-5" aria-hidden={hidden || undefined}>
      {SHORTS.map((s, i) => (
        <Phone key={s.hook} s={s} i={i} />
      ))}
    </div>
  );
  return (
    <section aria-label="Exemplos de cortes" className="vc-showcase relative overflow-hidden py-10">
      <div className="mb-10 text-center">
        <p className="vc-eyebrow vc-eyebrow-pink">Cortes que saem daqui</p>
      </div>
      {/* folga vertical: a máscara das bordas corta o que sai da caixa (celulares deslocados e hover) */}
      <div className="vc-showcase-row py-8">
        <div className="vc-showcase-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
