/** Palavra falada com início/fim em segundos. */
export type TimedWord = { text: string; start: number; end: number };

function assTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

const escapeAss = (t: string) => t.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\n/g, " ").trim();

/** Quebra a fala em blocos de legenda de até `maxWords` palavras, cortando no fim das frases. */
export function captionChunks(words: string[], maxWords = 4): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= maxWords || /[.!?…]$/.test(w)) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export type AssOptions = {
  /** Texto fixo no topo (gancho). Vazio = sem texto. */
  hook: string;
  /** Até quando o gancho fica na tela (segundos). */
  hookUntil: number;
  font: string;
  /** Legendas palavra a palavra. */
  captions: boolean;
};

/**
 * Legendas ASS no estilo dos Shorts (1080x1920): gancho fixo no topo e legenda
 * palavra a palavra no terço inferior, com a palavra falada destacada em laranja.
 */
export function buildAss(words: TimedWord[], opts: AssOptions): string {
  const header = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Caption,${opts.font},88,&H00FFFFFF,&H00FFFFFF,&H00180B0B,&H96000000,1,0,0,0,100,100,0,0,1,7,3,2,80,80,460,1`,
    `Style: Hook,${opts.font},70,&H00FFFFFF,&H00FFFFFF,&H00882EFF,&H96000000,1,0,0,0,100,100,0,0,3,18,0,8,90,90,250,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];
  const hook = escapeAss(opts.hook);
  if (hook) {
    events.push(`Dialogue: 1,${assTime(0)},${assTime(opts.hookUntil)},Hook,,0,0,0,,${hook.toUpperCase()}`);
  }

  if (opts.captions) {
    let index = 0;
    for (const chunk of captionChunks(words.map((w) => w.text))) {
      const base = index;
      const timed = words.slice(index, index + chunk.length);
      index += chunk.length;
      // Cada palavra fica na tela até a próxima começar (pausas curtas não deixam a tela vazia)
      timed.forEach((w, i) => {
        const next = words[base + i + 1];
        const end = next ? Math.max(w.end, Math.min(next.start, w.end + 0.8)) : w.end + 0.3;
        const text = timed
          .map((x, j) => {
            const t = escapeAss(x.text.toUpperCase());
            return j === i ? `{\\c&H003D8AFF&}${t}{\\c&H00FFFFFF&}` : t;
          })
          .join(" ");
        events.push(`Dialogue: 0,${assTime(w.start)},${assTime(end)},Caption,,0,0,0,,${text}`);
      });
    }
  }

  return [...header, ...events, ""].join("\n");
}
