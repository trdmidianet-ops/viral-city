import type { ClipStatus, SourceStatus } from "@/lib/clips/repo";

export const sourceStatus: Record<SourceStatus, { label: string; cls: string }> = {
  queued: { label: "Na fila", cls: "border-line text-muted" },
  downloading: { label: "Baixando…", cls: "border-sun/40 text-sun" },
  transcribing: { label: "Transcrevendo…", cls: "border-sun/40 text-sun" },
  analyzing: { label: "IA escolhendo…", cls: "border-sun/40 text-sun" },
  rendering: { label: "Renderizando…", cls: "border-sun/40 text-sun" },
  ready: { label: "Cortes prontos", cls: "border-cyan/40 text-cyan" },
  failed: { label: "Erro", cls: "border-pink/60 bg-pink/10 text-pink" },
};

export const clipStatus: Record<ClipStatus, { label: string; cls: string }> = {
  pending: { label: "Na fila", cls: "border-line text-muted" },
  rendering: { label: "Renderizando…", cls: "border-sun/40 text-sun" },
  rendered: { label: "Pronto", cls: "border-cyan/40 text-cyan" },
  approved: { label: "Aprovado ✓", cls: "border-pink/40 text-pink" },
  failed: { label: "Erro", cls: "border-pink/60 bg-pink/10 text-pink" },
};
