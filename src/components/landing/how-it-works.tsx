import { Reveal } from "./reveal";
import { Accent, SectionTitle } from "./section-title";

type Step = { who: "you" | "ia"; title: string; text: string };

// Na ordem em que acontecem: só dois passos passam pela mão do criador.
const steps: Step[] = [
  { who: "you", title: "Envia o vídeo longo", text: "Do seu canal, um arquivo do PC ou o link de um material autorizado." },
  { who: "ia", title: "Ouve cada palavra", text: "Transcreve a fala inteira para entender o conteúdo, não só o áudio." },
  { who: "ia", title: "Encontra os ganchos", text: "Localiza os trechos com mais chance de prender quem está rolando o feed." },
  { who: "ia", title: "Dá nota e explica", text: "Cada corte recebe uma nota viral e o motivo da escolha." },
  { who: "ia", title: "Enquadra em 9:16", text: "Fundo desfocado, centralizado ou tela dividida, pronto para Shorts, Reels e TikTok." },
  { who: "ia", title: "Legenda palavra por palavra", text: "Com o texto de gancho no topo e a logo do seu canal." },
  { who: "you", title: "Aprova o que gostar", text: "Nada vai ao ar sem o seu ok. Você escolhe os dias e horários." },
  { who: "ia", title: "Publica na hora certa", text: "Os cortes aprovados entram na fila e saem no YouTube, Instagram e TikTok." },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-16 border-y border-line bg-[#0e0820] py-24 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <SectionTitle
          index="01"
          eyebrow="Como funciona"
          lead="Sem linha do tempo, sem editor, sem planilha de postagem. Do envio à publicação, só dois passos passam pela sua mão."
        >
          Você faz duas coisas. <Accent>A IA faz o resto.</Accent>
        </SectionTitle>

        <Reveal className="mt-14">
          <ol className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className={`px-6 pb-7 pt-6 sm:min-h-[190px]${s.who === "ia" ? "bg-[#0f0c2c]" : "bg-night-2"}`}>
                <div className="flex items-center justify-between">
                  {s.who === "you" ? (
                    <span className="rounded-md bg-sun px-2 py-0.5 font-mono text-[11px] tracking-[0.14em] text-night">VOCÊ</span>
                  ) : (
                    <span className="rounded-md px-2 py-0.5 font-mono text-[11px] tracking-[0.14em] text-cyan ring-1 ring-inset ring-cyan/50">
                      IA
                    </span>
                  )}
                  <span className="num font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
