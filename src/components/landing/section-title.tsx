import type { ReactNode } from "react";

/** Título de seção: etiqueta neon com fios dos lados e título com destaque em serifa itálica. */
export function SectionTitle({
  eyebrow,
  children,
  tone = "pink",
}: {
  eyebrow: string;
  children: ReactNode;
  tone?: "pink" | "cyan" | "sun";
}) {
  return (
    <div className="text-center">
      <p className={`vc-eyebrow vc-eyebrow-${tone}`}>{eyebrow}</p>
      <h2 className="mx-auto mt-4 max-w-4xl text-balance font-heading text-4xl font-medium leading-[1.05] tracking-[-0.04em] sm:text-6xl">
        {children}
      </h2>
    </div>
  );
}

/** Palavra de destaque dos títulos: serifa itálica com o degradê do pôr do sol. */
export function Accent({ children }: { children: ReactNode }) {
  return <em className="text-sunset pr-1 font-serif font-normal italic tracking-normal">{children}</em>;
}
