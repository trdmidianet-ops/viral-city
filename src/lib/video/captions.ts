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
  /** Cor da palavra falada (padrão laranja). */
  highlight?: CaptionColor;
  /** Onde fica o gancho (padrão no topo). */
  hookPosition?: HookPosition;
};

export type CaptionColor = "orange" | "yellow" | "green" | "cyan" | "pink" | "white";
export type HookPosition = "top" | "middle" | "none";

/** Cores da palavra destacada, no formato ASS (&HBBGGRR). */
export const CAPTION_COLORS: Record<CaptionColor, { label: string; hex: string; ass: string }> = {
  orange: { label: "Laranja", hex: "#ff8a3d", ass: "&H003D8AFF&" },
  yellow: { label: "Amarelo", hex: "#ffd166", ass: "&H0066D1FF&" },
  green: { label: "Verde", hex: "#4ade80", ass: "&H0080DE4A&" },
  cyan: { label: "Ciano", hex: "#22d3ee", ass: "&H00EED322&" },
  pink: { label: "Rosa", hex: "#ff2e88", ass: "&H00882EFF&" },
  white: { label: "Branco", hex: "#ffffff", ass: "&H00FFFFFF&" },
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
    opts.hookPosition === "middle"
      ? `Style: Hook,${opts.font},76,&H00FFFFFF,&H00FFFFFF,&H00882EFF,&H96000000,1,0,0,0,100,100,0,0,3,18,0,5,90,90,0,1`
      : `Style: Hook,${opts.font},70,&H00FFFFFF,&H00FFFFFF,&H00882EFF,&H96000000,1,0,0,0,100,100,0,0,3,18,0,8,90,90,250,1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ];

  const events: string[] = [];
  const hook = opts.hookPosition === "none" ? "" : escapeAss(opts.hook);
  const color = CAPTION_COLORS[opts.highlight ?? "orange"].ass;
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
            // palavra falada: cor escolhida e um leve "pulo" de tamanho (visível até no branco)
            return j === i ? `{\\c${color}\\fscx112\\fscy112}${t}{\\c&H00FFFFFF&\\fscx100\\fscy100}` : t;
          })
          .join(" ");
        events.push(`Dialogue: 0,${assTime(w.start)},${assTime(end)},Caption,,0,0,0,,${text}`);
      });
    }
  }

  return [...header, ...events, ""].join("\n");
}
