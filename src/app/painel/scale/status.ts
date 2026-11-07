import type { ScaleStatus, VariationStatus } from "@/lib/scale/repo";

export const scaleStatus: Record<ScaleStatus, { label: string; cls: string }> = {
  queued: { label: "Na fila", cls: "border-line text-muted" },
  writing: { label: "Escrevendo manchetes…", cls: "border-sun/40 text-sun" },
  rendering: { label: "Renderizando…", cls: "border-sun/40 text-sun" },
  ready: { label: "Versões prontas", cls: "border-cyan/40 text-cyan" },
  failed: { label: "Erro", cls: "border-pink/60 bg-pink/10 text-pink" },
};

export const variationStatus: Record<VariationStatus, { label: string; cls: string }> = {
  pending: { label: "Na fila", cls: "border-line text-muted" },
  rendering: { label: "Renderizando…", cls: "border-sun/40 text-sun" },
  rendered: { label: "Pronta", cls: "border-cyan/40 text-cyan" },
  approved: { label: "Aprovada ✓", cls: "border-pink/40 text-pink" },
  failed: { label: "Erro", cls: "border-pink/60 bg-pink/10 text-pink" },
};
