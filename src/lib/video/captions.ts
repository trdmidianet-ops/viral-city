import { captionChunks } from "./script";

/** Palavra narrada com início/fim em segundos. */
export type TimedWord = { text: string; start: number; end: number };

function assTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

const escapeAss = (t: string) => t.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\n/g, " ");

/** Distribui o tempo pelas palavras proporcionalmente ao tamanho (quando não há marcação da voz). */
export function estimateTimings(text: string, totalSeconds: number): TimedWord[] {
  const words = text.split(/\s+/).filter(Boolean);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return words.map((w, i) => {
    const dur = (weights[i] / total) * totalSeconds;
    const word = { text: w, start: t, end: t + dur };
    t += dur;
    return word;
  });
}

/**
 * Gera legendas ASS no estilo dos Shorts: blocos curtos, grandes, centralizados,
 * com a palavra falada destacada em laranja e um gancho fixo no topo nos 3 primeiros segundos.
 */
export function buildAss(words: TimedWord[], opts: { hook: string; font: string }): string {
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Caption,${opts.font},96,&H00FFFFFF,&H00FFFFFF,&H00180B0B,&H96000000,1,0,0,0,100,100,0,0,1,7,3,5,80,80,0,1`,
    `Style: Hook,${opts.font},72,&H0066D1FF,&H00FFFFFF,&H00180B0B,&H96000000,1,0,0,0,100,100,0,0,1,6,3,8,70,70,220,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];
  if (opts.hook) {
    events.push(`Dialogue: 1,${assTime(0)},${assTime(3)},Hook,,0,0,0,,${escapeAss(opts.hook.toUpperCase())}`);
  }

  let index = 0;
  for (const chunk of captionChunks(words.map((w) => w.text))) {
    const base = index;
    const timed = words.slice(index, index + chunk.length);
    index += chunk.length;
    // Um evento por palavra: o bloco inteiro aparece e a palavra atual fica em destaque.
    // Cada palavra fica na tela até a próxima começar (pausas curtas não deixam a tela vazia).
    timed.forEach((w, i) => {
      const next = words[base + i + 1];
      const end = next ? Math.max(w.end, Math.min(next.start, w.end + 0.8)) : w.end + 0.3;
      const text = timed
        .map((x, j) => (j === i ? `{\\c&H003D8AFF&}${escapeAss(x.text.toUpperCase())}{\\c&H00FFFFFF&}` : escapeAss(x.text.toUpperCase())))
        .join(" ");
      events.push(`Dialogue: 0,${assTime(w.start)},${assTime(end)},Caption,,0,0,0,,${text}`);
    });
  }

  return [...header, ...events, ""].join("\n");
}
