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
  className = "",
  delay = 0,
}: {
  title: string;
  text: string;
  preview: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal as="article" delay={delay} className={`vc-card flex flex-col gap-5 rounded-2xl p-5 sm:p-6 ${className}`}>
      <div className="flex-1">{preview}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </Reveal>
  );
}

export function Features() {
  return (
    <section id="recursos" className="vc-recursos relative scroll-mt-20 overflow-hidden py-28">
      <div aria-hidden="true" className="vc-recursos-floor" />
      <div className="relative mx-auto max-w-6xl px-4">
        <SectionTitle eyebrow="Recursos" tone="cyan">
          Tudo para <Accent>viralizar</Accent>
        </SectionTitle>

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Feature
            className="lg:col-span-2"
            title="Nota viral em cada corte"
            text="Cada trecho vem com nota e o motivo da escolha, para você publicar primeiro o que tem mais chance."
            preview={<ScorePreview />}
          />
          <Feature
            className="lg:row-span-2"
            delay={100}
            title="Vertical 9:16 sem esforço"
            text="Enquadramento com fundo desfocado, centralizado ou tela dividida, pronto para Shorts."
            preview={<FramingPreview />}
          />
          <Feature
            delay={60}
            title="Legendas e sua logo"
            text="Legendas automáticas palavra por palavra, texto de gancho no topo e a logo do seu canal."
            preview={<CaptionsPreview />}
          />
          <Feature
            delay={120}
            title="Radar de tendências"
            text="Veja os Shorts que estão bombando no seu nicho e use os ganchos como inspiração."
            preview={<RadarPreview />}
          />
          <Feature
            className="lg:col-span-2"
            delay={60}
            title="Agenda autônoma"
            text="Grade semanal por canal: os cortes aprovados entram na fila e saem no horário certo."
            preview={<SchedulePreview />}
          />
          <Feature
            delay={120}
            title="Seu conteúdo, conexão oficial"
            text="Só cortamos vídeos seus ou com autorização, e a conexão com o YouTube é a oficial do Google."
            preview={<SecurePreview />}
          />
        </div>
      </div>
    </section>
  );
}
