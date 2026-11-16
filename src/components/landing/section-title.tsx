import type { ReactNode } from "react";

/**
 * Cabeçalho de seção: etiqueta numerada em mono ciano (a "voz da IA"), título em serifa
 * alinhado à esquerda e, quando há `lead`, um texto de apoio na coluna ao lado.
 */
export function SectionTitle({
  index,
  eyebrow,
  lead,
  children,
}: {
  index: string;
  eyebrow: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className={lead ? "grid items-end gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-12" : undefined}>
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan">
          {index} · {eyebrow}
        </p>
        <h2 className="mt-3.5 text-balance font-serif text-4xl font-normal leading-[1.02] tracking-[-0.01em] sm:text-5xl lg:text-6xl">
          {children}
        </h2>
      </div>
      {lead && <p className="max-w-md text-[17px] leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}

/** Trecho de destaque dos títulos: itálico com o degradê do pôr do sol. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="text-sunset pr-1 font-serif font-normal italic tracking-normal">{children}</em>;
}
