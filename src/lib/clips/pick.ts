import type { NewClip, Word } from "./repo";

/** Lógica pura para escolher os cortes (testável). A chamada ao Claude fica em ai.ts. */
export const CLIP_COUNT = 5;
export const MIN_CLIP = 15;
export const MAX_CLIP = 75;

export type Segment = { start: number; end: number; text: string };

/** Agrupa palavras em frases (fim de pontuação, pausa longa ou 14 palavras). */
export function toSegments(words: Word[]): Segment[] {
  const segs: Segment[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    segs.push({ start: cur[0].start, end: cur.at(-1)!.end, text: cur.map((w) => w.text).join(" ") });
    cur = [];
  };
  words.forEach((w, i) => {
    const next = words[i + 1];
    cur.push(w);
    if (/[.!?…]$/.test(w.text) || cur.length >= 14 || (next && next.start - w.end > 0.9)) flush();
  });
  flush();
  return segs;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function buildPrompt(input: {
  title: string;
  duration: number;
  language: string;
  segments: Segment[];
  niche?: string | null;
  referenceTitle?: string | null;
  trendingTitles?: string[];
}): string {
  const lines = input.segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join("\n");
  const trends = [input.referenceTitle, ...(input.trendingTitles ?? [])].filter(Boolean).slice(0, 12);
  return `Você é um editor especialista em Shorts, Reels e TikTok virais.
Analise a transcrição de um vídeo longo e escolha os ${CLIP_COUNT} MELHORES trechos para virar cortes verticais.

Regras para cada corte:
- Duração entre ${MIN_CLIP} e 60 segundos (máximo ${MAX_CLIP}).
- Comece num momento que prende nos 2 primeiros segundos (frase forte, pergunta, revelação, polêmica, emoção ou humor).
- Precisa fazer sentido sozinho, sem o resto do vídeo, e terminar numa frase completa.
- Os cortes não podem se sobrepor.
- Use os tempos da transcrição (segundos) para start e end.
- "score" de 0 a 100 = potencial de viralizar.
- "hook" = texto curto e chamativo para ficar no topo do vídeo, até 60 caracteres, no idioma do vídeo, sem hashtags.
- "reason" = uma frase explicando por que esse trecho tende a viralizar.

Vídeo: "${input.title || "sem título"}" · duração ${fmt(input.duration)} · idioma: ${input.language}${input.niche ? ` · nicho: ${input.niche}` : ""}
${trends.length ? `\nTítulos que estão viralizando nesse nicho (use só como inspiração de estilo para os hooks):\n${trends.map((t) => `- ${t}`).join("\n")}\n` : ""}
Transcrição ([início-fim] em segundos):
${lines}

Responda SOMENTE com JSON válido, sem texto antes ou depois, neste formato:
{"clips":[{"start":12.3,"end":48.9,"score":87,"hook":"...","reason":"..."}]}`;
}

/** Extrai e valida a resposta da IA; descarta cortes inválidos ou sobrepostos. */
export function parseClips(raw: string, duration: number): NewClip[] {
  const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  const data = JSON.parse(json) as { clips?: { start: unknown; end: unknown; score: unknown; hook: unknown; reason: unknown }[] };
  const picked: NewClip[] = [];
  for (const c of data.clips ?? []) {
    let start = Math.max(0, Number(c.start));
    let end = Math.min(duration, Number(c.end));
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (end - start > MAX_CLIP) end = start + MAX_CLIP;
    if (end - start < MIN_CLIP) continue;
    if (picked.some((p) => start < p.end_seconds && end > p.start_seconds)) continue;
    start = Math.round(start * 10) / 10;
    end = Math.round(end * 10) / 10;
    picked.push({
      position: 0,
      start_seconds: start,
      end_seconds: end,
      score: Math.max(0, Math.min(100, Math.round(Number(c.score) || 0))),
      hook: String(c.hook ?? "").slice(0, 80),
      reason: String(c.reason ?? "").slice(0, 300),
      is_best: false,
    });
    if (picked.length === CLIP_COUNT) break;
  }
  return rank(picked);
}

const HOOK_WORDS =
  /\b(nunca|ninguém|segredo|verdade|incrível|absurdo|olha|cuidado|erro|dinheiro|morreu|chocante|revela|descobri|ninguem|never|secret|truth|crazy|insane|money|nunca|jamás|secreto|verdad|dinero)\b/i;

/** Plano B sem IA: janelas de ~35s pontuadas por densidade de fala, perguntas, exclamações e palavras de gancho. */
export function fallbackClips(segments: Segment[], duration: number): NewClip[] {
  const windows: (NewClip & { raw: number })[] = [];
  for (let i = 0; i < segments.length; i++) {
    const start = segments[i].start;
    let j = i;
    while (j + 1 < segments.length && segments[j + 1].end - start <= 40) j++;
    const end = Math.min(duration, segments[j].end);
    if (end - start < MIN_CLIP) continue;
    const text = segments.slice(i, j + 1).map((s) => s.text).join(" ");
    const words = text.split(/\s+/).length;
    const raw =
      words / (end - start) +
      (text.match(/\?/g)?.length ?? 0) * 0.6 +
      (text.match(/!/g)?.length ?? 0) * 0.4 +
      (text.match(new RegExp(HOOK_WORDS, "gi"))?.length ?? 0) * 0.8 +
      (/[?!]/.test(segments[i].text) ? 1 : 0);
    windows.push({
      position: 0,
      start_seconds: Math.round(start * 10) / 10,
      end_seconds: Math.round(end * 10) / 10,
      score: 0,
      hook: segments[i].text.split(/\s+/).slice(0, 8).join(" "),
      reason: "Escolhido automaticamente (sem IA): trecho com fala intensa e frases de impacto.",
      is_best: false,
      raw,
    });
  }
  windows.sort((a, b) => b.raw - a.raw);
  const picked: NewClip[] = [];
  const top = windows[0]?.raw || 1;
  for (const w of windows) {
    if (picked.some((p) => w.start_seconds < p.end_seconds && w.end_seconds > p.start_seconds)) continue;
    const { raw, ...clip } = w;
    picked.push({ ...clip, score: Math.round(40 + 45 * (raw / top)) });
    if (picked.length === CLIP_COUNT) break;
  }
  return rank(picked);
}

function rank(clips: NewClip[]): NewClip[] {
  const sorted = [...clips].sort((a, b) => b.score - a.score);
  return sorted.map((c, i) => ({ ...c, position: i + 1, is_best: i === 0 }));
}

/** Palavras dentro do corte, com tempo relativo ao início do corte. */
export function wordsInRange(words: Word[], start: number, end: number): Word[] {
  return words
    .filter((w) => w.start >= start - 0.05 && w.end <= end + 0.3)
    .map((w) => ({ text: w.text, start: Math.max(0, w.start - start), end: Math.max(0, w.end - start) }));
}
