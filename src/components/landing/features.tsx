import type { ReactNode } from "react";
import { Accent, SectionTitle } from "./section-title";
import { Reveal } from "./reveal";
import {
  CaptionsPreview,
  FramingPreview,
  RadarPreview,
  SchedulePreview,
  ScorePreview,
  SecurePreview,
} from "./feature-previews";

function Feature({
  title,
  text,
  preview,
  flush = false,
  className = "",
  delay = 0,
}: {
  title: string;
  text: string;
  preview: ReactNode;
  /** a prévia já tem fundo próprio e ocupa o quadro inteiro */
  flush?: boolean;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal as="article" delay={delay} className={`vc-card flex flex-col gap-6 rounded-2xl p-6 sm:p-7 ${className}`}>
      <div
        className={`flex min-h-[150px] flex-1 items-center justify-center overflow-hidden rounded-xl bg-night ring-1 ring-white/[0.06] ${flush ? "" : "p-5"}`}
      >
        <div className={flush ? "h-full w-full self-stretch" : "w-full"}>{preview}</div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </Reveal>
  );
}

export function Features() {
  return (
    <section id="recursos" className="vc-recursos relative scroll-mt-16 overflow-hidden py-24 sm:py-28">
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionTitle
          index="02"
          eyebrow="Recursos"
          lead="Ela não escreve e-mail nem gera imagem. Faz um trabalho: tirar cortes fortes de vídeos longos e colocá-los no ar."
        >
          Uma IA treinada para <Accent>uma coisa só.</Accent>
        </SectionTitle>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            className="md:col-span-2"
            title="Nota viral com o motivo"
            text="Você não recebe só o corte. Recebe o raciocínio da IA, para publicar primeiro o que tem mais chance."
            preview={<ScorePreview />}
          />
          <Feature
            delay={100}
            title="Vertical 9:16 automático"
            text="Três enquadramentos prontos, sem abrir editor."
            preview={<FramingPreview />}
          />
          <Feature
            flush
            title="Legendas palavra por palavra"
            text="Sincronizadas com a fala, com gancho no topo e a sua logo."
            preview={<CaptionsPreview />}
          />
          <Feature
            delay={60}
            title="Radar de tendências"
            text="Os Shorts em alta no seu nicho, para inspirar ganchos e formatos."
            preview={<RadarPreview />}
          />
          <Feature
            delay={120}
            title="Agenda autônoma"
            text="Grade semanal por canal. O que você aprovou sai sozinho."
            preview={<SchedulePreview />}
          />
        </div>

        <Reveal className="vc-card mt-6 flex flex-wrap items-center gap-x-10 gap-y-4 rounded-2xl p-5 sm:px-7">
          <div className="w-full sm:w-[300px]">
            <SecurePreview />
          </div>
          <div className="min-w-[240px] flex-1">
            <h3 className="font-semibold">Seu conteúdo, conexão oficial</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              A IA só corta vídeos seus ou com autorização. A conexão com YouTube, Instagram e TikTok é a oficial de
              cada rede, e nenhuma senha fica guardada.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
