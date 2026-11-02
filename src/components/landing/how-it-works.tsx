import { CalendarClock, Play, Scissors, Upload } from "lucide-react";
import { Reveal } from "./reveal";
import { Accent, SectionTitle } from "./section-title";

// Alturas fixas da "onda" da fala (determinísticas, para o servidor e o navegador baterem)
const WAVE = [
  30, 52, 44, 70, 38, 62, 84, 58, 40, 66, 90, 72, 46, 34, 56, 78, 64, 42, 50, 88, 74, 48, 36, 60, 82, 68, 44, 54,
  76, 92, 70, 40, 32, 58, 80, 62, 46, 38, 66, 86,
];
// Trechos escolhidos pela IA: [início, fim) em barras da onda, e a nota de cada um
const CUTS = [
  { from: 5, to: 9, score: 94 },
  { from: 10, to: 13, score: 88 },
  { from: 18, to: 22, score: 91 },
  { from: 28, to: 31, score: 85 },
  { from: 34, to: 37, score: 81 },
];
const scoreAt = (i: number) => CUTS.find((c) => i >= c.from && i < c.to);

function UploadVisual() {
  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[linear-gradient(135deg,#3b1a6e,#a2246a_55%,#ff8a3d)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,209,102,0.55),transparent_45%)]" />
        <span className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-night/70 ring-1 ring-white/20">
          <Play size={16} className="ml-0.5 fill-ink" />
        </span>
        <span className="absolute bottom-2 right-2 rounded bg-night/80 px-1.5 py-0.5 font-mono text-[10px]">1:12:40</span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[10px] text-muted">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <span className="vc-upload block h-full rounded-full bg-gradient-to-r from-pink to-orange" />
        </span>
        enviando
      </div>
    </div>
  );
}

function CutsVisual() {
  return (
    <div className="relative">
      <div className="flex h-24 items-center gap-[3px]">
        {WAVE.map((h, i) => {
          const cut = scoreAt(i);
          return (
            <span
              key={i}
              className={`flex-1 rounded-full ${cut ? "bg-gradient-to-t from-pink to-sun shadow-[0_0_10px_rgba(255,46,136,0.6)]" : "bg-white/15"}`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
      <span className="vc-playhead absolute inset-y-0 w-px bg-cyan shadow-[0_0_8px_var(--cyan)]" />
      <div className="relative mt-2 h-5 font-mono text-[10px]">
        {CUTS.map((c) => (
          <span
            key={c.from}
            className="absolute -translate-x-1/2 rounded bg-pink/20 px-1 text-sun ring-1 ring-pink/40"
            style={{ left: `${((c.from + c.to) / 2 / WAVE.length) * 100}%` }}
          >
            {c.score}
          </span>
        ))}
      </div>
    </div>
  );
}

const DAYS = ["S", "T", "Q", "Q", "S", "S", "D"];
// Horários ocupados na grade: [dia, linha]
const SLOTS = new Set(["0-1", "1-2", "2-0", "3-1", "4-2", "5-0", "6-1"]);

function ScheduleVisual() {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] text-muted">
        {DAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {[0, 1, 2].flatMap((row) =>
          DAYS.map((_, day) => {
            const filled = SLOTS.has(`${day}-${row}`);
            const live = day === 4 && row === 2;
            return (
              <span
                key={`${day}-${row}`}
                className={`h-6 rounded-md ${
                  live
                    ? "vc-pulse bg-gradient-to-br from-pink to-orange"
                    : filled
                      ? "bg-gradient-to-br from-purple/70 to-pink/60"
                      : "bg-white/[0.06] ring-1 ring-inset ring-white/5"
                }`}
              />
            );
          }),
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-sun">
        <span className="h-1.5 w-1.5 rounded-full bg-sun shadow-[0_0_6px_var(--sun)]" /> próximo post: sex 18:00
      </p>
    </div>
  );
}

const steps = [
  {
    icon: Upload,
    title: "Mande o vídeo longo",
    text: "Escolha um vídeo do seu canal, suba um arquivo do PC ou cole o link de um material autorizado.",
    visual: <UploadVisual />,
  },
  {
    icon: Scissors,
    title: "A IA escolhe 5 cortes",
    text: "Ela transcreve a fala, encontra os ganchos mais fortes e dá uma nota viral para cada trecho.",
    visual: <CutsVisual />,
  },
  {
    icon: CalendarClock,
    title: "Aprove e agende",
    text: "Você aprova os cortes e a agenda posta no YouTube Shorts nos dias e horários que escolher.",
    visual: <ScheduleVisual />,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="relative mx-auto max-w-6xl scroll-mt-20 px-4 py-28">
      <SectionTitle eyebrow="Como funciona">
        Do vídeo longo ao Short, <Accent>em 3 passos</Accent>
      </SectionTitle>

      <ol className="relative mt-16 grid gap-6 md:grid-cols-3">
        {/* fio neon ligando os passos */}
        <span aria-hidden="true" className="vc-wire absolute left-[16%] right-[16%] top-[30px] hidden h-px md:block" />
        {steps.map((s, i) => (
          <Reveal as="li" key={s.title} delay={i * 140} className="relative">
            <div className="mx-auto flex h-[60px] w-[60px] items-center justify-center rounded-full bg-night ring-1 ring-pink/50 shadow-[0_0_24px_-4px_rgba(255,46,136,0.7)]">
              <span className="font-serif text-3xl italic text-sunset">{i + 1}</span>
            </div>
            <article className="vc-card mt-6 rounded-2xl p-5">
              <div className="rounded-xl bg-night/60 p-4 ring-1 ring-white/5">{s.visual}</div>
              <h3 className="mt-5 flex items-center gap-2 text-lg font-semibold">
                <s.icon size={18} className="text-orange" /> {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </article>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
