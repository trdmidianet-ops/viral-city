/* Painel do hero: a IA analisando um vídeo longo e explicando os cortes que escolheu.
   Só HTML e CSS, com fundo sólido (sem desfoque) para não pesar sobre a cidade 3D. */

// Alturas fixas da "onda" da fala (determinísticas, para o servidor e o navegador baterem)
const WAVE = [
  30, 52, 44, 70, 38, 62, 84, 58, 40, 36, 90, 72, 66, 34, 56, 48, 64, 42, 50, 88, 74, 48, 36, 60, 52, 68, 44, 54,
  76, 92, 40, 32, 58, 80, 62, 70, 38, 46, 34, 50,
];
// Trechos escolhidos pela IA: [início, fim) em barras da onda, e a nota de cada um
const CUTS = [
  { from: 5, to: 8, score: 94 },
  { from: 10, to: 13, score: 88 },
  { from: 18, to: 21, score: 91 },
  { from: 27, to: 30, score: 85 },
  { from: 33, to: 36, score: 81 },
];
const inCut = (i: number) => CUTS.some((c) => i >= c.from && i < c.to);

const TOP = [
  { score: 94, title: "“O dia em que quase desisti”", why: "confissão logo na abertura, curiosidade em 3s" },
  { score: 91, title: "“Ninguém te conta isso”", why: "promessa clara e virada no final" },
  { score: 88, title: "“3 erros que custam inscritos”", why: "lista curta, fácil de acompanhar" },
];

export function AiPanel() {
  return (
    <div
      role="img"
      aria-label="Exemplo: a IA analisa um vídeo de 1 hora e 12 minutos, encontra 5 cortes e explica o motivo de cada nota"
      className="mx-auto w-full max-w-[540px] rounded-2xl border border-cyan/30 bg-night-2/95 p-5 shadow-[0_40px_90px_-40px_rgba(139,61,255,0.8)] sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-cyan">
          <span className="vc-blink h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" />
          IA analisando
        </p>
        <p className="font-mono text-[11px] text-muted">podcast-ep-42.mp4 · 1:12:40</p>
      </div>

      <div className="relative mt-8">
        {CUTS.map((c) => (
          <span
            key={c.from}
            className="num absolute -top-6 -translate-x-1/2 rounded-md bg-sun px-1.5 font-mono text-[11px] font-medium text-night"
            style={{ left: `${((c.from + c.to) / 2 / WAVE.length) * 100}%` }}
          >
            {c.score}
          </span>
        ))}
        <div className="flex h-24 items-center gap-[3px]">
          {WAVE.map((h, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full ${inCut(i) ? "bg-gradient-to-t from-pink to-sun" : "bg-white/15"}`}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <span className="vc-playhead absolute inset-y-0 w-0.5 bg-cyan shadow-[0_0_12px_var(--cyan)]" />
      </div>

      <ul className="mt-5 space-y-2.5">
        {TOP.map((t, i) => (
          <li
            key={t.title}
            className={`${i === 2 ? "max-sm:hidden " : ""}gridgrid-cols-[46px_minmax(0,1fr)] items-center gap-3.5 rounded-xl bg-night px-3.5 py-3 text-left ring-1 ring-white/[0.07]`}
          >
            <span className="num font-serif text-4xl leading-none text-sun">{t.score}</span>
            <span>
              <span className="block text-[15px] font-semibold">{t.title}</span>
              <span className="mt-0.5 block font-mono text-[11.5px] text-cyan">motivo: {t.why}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 font-mono text-[11.5px] text-muted">5 cortes encontrados · legendados · prontos em 9:16</p>
    </div>
  );
}
