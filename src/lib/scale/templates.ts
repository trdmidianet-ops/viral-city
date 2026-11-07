/**
 * Templates de layout do Scale (1080x1920). Cada template diz onde o vídeo fica, o que é
 * desenhado em volta (faixas, moldura) e como a manchete aparece. Funções puras: o render
 * monta o FFmpeg a partir daqui e os testes conferem sem precisar renderizar.
 */

export type TemplateId = "manchete" | "caixa" | "urgente" | "neon" | "meme" | "tela-cheia";

export type Template = {
  id: TemplateId;
  name: string;
  description: string;
  /** Cores da miniatura no painel. */
  preview: { bg: string; band: string; text: string };
};

export const TEMPLATES: Template[] = [
  { id: "manchete", name: "Manchete no topo", description: "Faixa preta com a manchete grande em cima e o vídeo embaixo.", preview: { bg: "#0b0618", band: "#000000", text: "#ffffff" } },
  { id: "caixa", name: "Caixa branca", description: "Vídeo em tela cheia com a manchete numa caixa branca, estilo TikTok.", preview: { bg: "#a2246a", band: "#ffffff", text: "#0b0618" } },
  { id: "urgente", name: "Urgente", description: "Selo vermelho de notícia, manchete em faixa e rodapé com o seu @.", preview: { bg: "#1e1140", band: "#e11d48", text: "#ffffff" } },
  { id: "neon", name: "Moldura neon", description: "Vídeo emoldurado em neon rosa, manchete no topo e @ embaixo.", preview: { bg: "#0b0618", band: "#ff2e88", text: "#ffffff" } },
  { id: "meme", name: "Meme", description: "Área branca com texto preto em cima, como post de meme.", preview: { bg: "#ffffff", band: "#ffffff", text: "#0b0618" } },
  { id: "tela-cheia", name: "Tela cheia", description: "Só o vídeo e a manchete com contorno, sem faixas.", preview: { bg: "#3b1a6e", band: "transparent", text: "#ffffff" } },
];

export const isTemplateId = (v: string): v is TemplateId => TEMPLATES.some((t) => t.id === v);
export const templateName = (id: string) => TEMPLATES.find((t) => t.id === id)?.name ?? id;

/** Pequenas diferenças de edição para as versões não ficarem idênticas. */
export type VariationParams = { zoom: number; speed: number; offset: number };

const ZOOMS = [1, 1.06, 1.12, 1.03, 1.09];
const SPEEDS = [1, 1.05, 1, 1.1, 1.03];
const OFFSETS = [0, 0.4, 0.8, 0.2, 0.6];

/** Parâmetros determinísticos por posição (a mesma posição sempre gera a mesma edição). */
export function variationParams(position: number): VariationParams {
  const i = Math.max(0, position);
  return { zoom: ZOOMS[i % ZOOMS.length], speed: SPEEDS[Math.floor(i / 2) % SPEEDS.length], offset: OFFSETS[Math.floor(i / 3) % OFFSETS.length] };
}

/** Distribui templates e manchetes entre as versões: combinações diferentes primeiro. */
export function planVariations(templates: TemplateId[], headlines: string[], count: number) {
  const ts = templates.length ? templates : (["manchete"] as TemplateId[]);
  const hs = headlines.length ? headlines : [""];
  // Cada manchete aparece antes de repetir; a cada ciclo completo (mmc) o template desloca,
  // então as combinações template × manchete não se repetem até esgotarem.
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const cycle = (ts.length * hs.length) / gcd(ts.length, hs.length);
  return Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    template: ts[(i + Math.floor(i / cycle)) % ts.length],
    headline: hs[i % hs.length],
    params: variationParams(i),
  }));
}

// ---------- layout ----------

export type Layout = {
  /** Retângulo do vídeo no quadro 1080x1920. */
  video: { x: number; y: number; w: number; h: number };
  /** Cor de fundo (atrás do vídeo). */
  background: string;
  /** Retângulos desenhados por cima (faixas, molduras). Cores em hex do FFmpeg (0xRRGGBB). */
  boxes: { x: number; y: number; w: number; h: number; color: string; thickness?: number }[];
  /** Se o vídeo é recortado para preencher o retângulo (true) ou encaixado com fundo desfocado (false). */
  fill: boolean;
};

export function layoutFor(id: TemplateId): Layout {
  switch (id) {
    case "manchete":
      return { video: { x: 0, y: 560, w: 1080, h: 1360 }, background: "black", boxes: [], fill: true };
    case "meme":
      return { video: { x: 0, y: 560, w: 1080, h: 1360 }, background: "white", boxes: [], fill: true };
    case "urgente":
      return {
        video: { x: 0, y: 0, w: 1080, h: 1920 },
        background: "black",
        fill: false,
        boxes: [
          { x: 0, y: 1740, w: 1080, h: 120, color: "0x0b0618@0.85" },
          { x: 0, y: 1740, w: 1080, h: 8, color: "0xe11d48" },
        ],
      };
    case "neon":
      return {
        video: { x: 60, y: 420, w: 960, h: 1080 },
        background: "0x0b0618",
        fill: true,
        boxes: [{ x: 50, y: 410, w: 980, h: 1100, color: "0xff2e88", thickness: 10 }],
      };
    case "caixa":
    case "tela-cheia":
    default:
      return { video: { x: 0, y: 0, w: 1080, h: 1920 }, background: "black", boxes: [], fill: false };
  }
}

// ---------- texto (ASS) ----------

const escapeAss = (t: string) => t.replace(/\\/g, "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();

function assTime(sec: number): string {
  const cs = Math.max(0, Math.round(sec * 100));
  const h = Math.floor(cs / 360000);
  const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
}

// Cores ASS são &HAABBGGRR
const WHITE = "&H00FFFFFF";
const BLACK = "&H00000000";
const NIGHT = "&H00180B0B";
const PINK = "&H00882EFF";
const RED = "&H005D1DE1";

/** Tamanho da fonte da manchete conforme o comprimento (textos longos ficam menores). */
export function headlineSize(text: string, base: number): number {
  const n = text.length;
  if (n <= 28) return base;
  if (n <= 48) return Math.round(base * 0.85);
  if (n <= 70) return Math.round(base * 0.72);
  return Math.round(base * 0.62);
}

export type TextOptions = { headline: string; handle: string; duration: number; font: string };

/** Legenda ASS com a manchete (e o @ quando o template usa) durante o vídeo todo. */
export function buildTemplateAss(id: TemplateId, o: TextOptions): string {
  const headline = escapeAss(o.headline);
  const handle = escapeAss(o.handle);
  const end = assTime(o.duration);
  const styles: string[] = [];
  const events: string[] = [];
  const style = (name: string, size: number, primary: string, outline: string, back: string, border: 1 | 3, outlineW: number, align: number, marginV: number, font = o.font) =>
    styles.push(`Style: ${name},${font},${size},${primary},${primary},${outline},${back},1,0,0,0,100,100,0,0,${border},${outlineW},0,${align},70,70,${marginV},1`);
  const line = (styleName: string, text: string) => text && events.push(`Dialogue: 0,0:00:00.00,${end},${styleName},,0,0,0,,${text}`);

  switch (id) {
    case "manchete":
      style("Head", headlineSize(headline, 124), WHITE, BLACK, BLACK, 1, 0, 5, 0);
      // centraliza dentro da faixa de 560px: \pos no meio dela
      line("Head", headline && `{\\pos(540,280)}${headline.toUpperCase()}`);
      break;
    case "meme":
      style("Head", headlineSize(headline, 96), BLACK, WHITE, WHITE, 1, 0, 5, 0, "Arial");
      line("Head", headline && `{\\pos(540,280)}${headline}`);
      break;
    case "caixa":
      style("Head", headlineSize(headline, 86), NIGHT, WHITE, WHITE, 3, 22, 8, 300, "Arial");
      line("Head", headline);
      break;
    case "urgente":
      style("Tag", 54, WHITE, RED, RED, 3, 16, 7, 230);
      style("Head", headlineSize(headline, 100), WHITE, NIGHT, "&H33180B0B", 3, 24, 8, 340);
      style("Handle", 46, WHITE, BLACK, BLACK, 1, 0, 2, 82, "Arial");
      line("Tag", "URGENTE");
      line("Head", headline.toUpperCase());
      line("Handle", handle);
      break;
    case "neon":
      style("Head", headlineSize(headline, 112), WHITE, PINK, BLACK, 1, 6, 8, 130);
      style("Handle", 50, WHITE, PINK, BLACK, 1, 3, 2, 230, "Arial");
      line("Head", headline.toUpperCase());
      line("Handle", handle);
      break;
    case "tela-cheia":
    default:
      style("Head", headlineSize(headline, 120), WHITE, NIGHT, BLACK, 1, 9, 8, 260);
      line("Head", headline.toUpperCase());
  }

  return [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    ...styles,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events,
    "",
  ].join("\n");
}

// ---------- vídeo (FFmpeg) ----------

/**
 * Filtro que posiciona o vídeo no layout com o zoom da versão e desenha as faixas.
 * Entrada [0:v]; saída [base] em 1080x1920, pronta para receber o ASS.
 */
export function templateVideoFilter(id: TemplateId, params: VariationParams): string {
  const L = layoutFor(id);
  const { w, h, x, y } = L.video;
  const zw = Math.round((w * params.zoom) / 2) * 2;
  const zh = Math.round((h * params.zoom) / 2) * 2;
  const speed = params.speed !== 1 ? `setpts=PTS/${params.speed},` : "";
  const parts: string[] = [];

  if (L.fill) {
    parts.push(`[0:v]${speed}scale=${zw}:${zh}:force_original_aspect_ratio=increase,crop=${w}:${h}[v]`);
  } else {
    // vídeo inteiro no meio com o próprio vídeo desfocado atrás (nunca corta ninguém)
    parts.push(`[0:v]${speed}split[a][b]`);
    parts.push(`[a]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},boxblur=24:2,eq=brightness=-0.2[bg]`);
    parts.push(`[b]scale=${zw}:${zh}:force_original_aspect_ratio=decrease,crop='min(iw,${w})':'min(ih,${h})'[fg]`);
    parts.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`);
  }
  const pad = `pad=1080:1920:${x}:${y}:color=${L.background}`;
  const boxes = L.boxes.map((b) => `drawbox=x=${b.x}:y=${b.y}:w=${b.w}:h=${b.h}:color=${b.color}:t=${b.thickness ?? "fill"}`);
  parts.push(`[v]${[pad, ...boxes, "setsar=1"].join(",")}[base]`);
  return parts.join(";");
}

/** Filtro de áudio que acompanha a velocidade da versão ("" quando não muda). */
export const audioSpeedFilter = (params: VariationParams) => (params.speed !== 1 ? `atempo=${params.speed}` : "");
