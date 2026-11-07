import { CAPTION_COLORS, type CaptionColor, type HookPosition } from "@/lib/video/captions";
import type { Clip, Framing } from "./repo";

/** Regras do editor de clipes (puras, testáveis). */

export const MIN_EDIT_SECONDS = 3;
export const MAX_EDIT_SECONDS = 180;
export const SPEEDS = [0.9, 1, 1.1, 1.25, 1.5] as const;
const FRAMINGS: Framing[] = ["center", "blur", "split"];
const POSITIONS: HookPosition[] = ["top", "middle", "none"];

export type ClipEditInput = {
  start: string;
  end: string;
  hook: string;
  hookPosition: string;
  framing: string;
  captions: boolean;
  captionColor: string;
  speed: string;
};

export type ClipEditPatch = Pick<Clip, "start_seconds" | "end_seconds" | "hook" | "hook_position" | "framing" | "captions" | "caption_color" | "speed">;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Valida o que veio do editor e devolve o que gravar no corte, ou a mensagem de erro. */
export function parseClipEdit(input: ClipEditInput, sourceDuration: number): { patch: ClipEditPatch } | { error: string } {
  const start = round2(Number(input.start.replace(",", ".")));
  const end = round2(Number(input.end.replace(",", ".")));
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { error: "Início e fim precisam ser números (em segundos)." };
  if (start < 0) return { error: "O início não pode ser antes do começo do vídeo." };
  if (sourceDuration > 0 && end > sourceDuration + 0.5) return { error: "O fim passou do final do vídeo." };
  const length = end - start;
  if (length < MIN_EDIT_SECONDS) return { error: `O corte precisa ter pelo menos ${MIN_EDIT_SECONDS} segundos.` };
  if (length > MAX_EDIT_SECONDS) return { error: `O corte pode ter no máximo ${MAX_EDIT_SECONDS / 60} minutos.` };

  const speed = Number(input.speed);
  if (!SPEEDS.includes(speed as (typeof SPEEDS)[number])) return { error: "Velocidade inválida." };
  if (!FRAMINGS.includes(input.framing as Framing)) return { error: "Enquadramento inválido." };
  if (!POSITIONS.includes(input.hookPosition as HookPosition)) return { error: "Posição do texto inválida." };
  if (!(input.captionColor in CAPTION_COLORS)) return { error: "Cor de legenda inválida." };

  return {
    patch: {
      start_seconds: start,
      end_seconds: end,
      hook: input.hook.replace(/\s+/g, " ").trim().slice(0, 80),
      hook_position: input.hookPosition as HookPosition,
      framing: input.framing as Framing,
      captions: input.captions,
      caption_color: input.captionColor as CaptionColor,
      speed,
    },
  };
}

/** Duração final do corte depois da velocidade. */
export const editedLength = (start: number, end: number, speed: number) => Math.max(0, (end - start) / (speed || 1));
