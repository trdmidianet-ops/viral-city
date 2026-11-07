/**
 * Templates de layout do Scale (1080x1920), no estilo dos posts de página que bombam no
 * feed: texto curto, o vídeo e o perfil (foto, nome, selo e @). Funções puras: o render
 * monta o FFmpeg a partir daqui e os testes conferem sem precisar renderizar.
 */

export type TemplateId = "perfil" | "perfil-cta" | "tweet-claro" | "tweet-escuro" | "texto-central" | "manchete";

export type Template = { id: TemplateId; name: string; description: string };

export const TEMPLATES: Template[] = [
  { id: "perfil", name: "Post de página", description: "Fundo preto, texto em cima, vídeo no meio e o perfil embaixo." },
  { id: "perfil-cta", name: "Página + chamada", description: "Igual ao post de página, com uma chamada para seguir embaixo." },
  { id: "tweet-escuro", name: "Tweet escuro", description: "Perfil em cima, texto e vídeo embaixo, como um post no X." },
  { id: "tweet-claro", name: "Tweet claro", description: "O mesmo post estilo X, em fundo branco." },
  { id: "texto-central", name: "Texto no vídeo", description: "Vídeo em tela cheia com o texto no meio e o perfil no canto." },
  { id: "manchete", name: "Manchete", description: "Faixa preta com manchete grande em caixa alta e o vídeo embaixo." },
];

export const isTemplateId = (v: string): v is TemplateId => TEMPLATES.some((t) => t.id === v);
export const templateName = (id: string) => TEMPLATES.find((t) => t.id === id)?.name ?? id;
/** Templates que mostram a chamada de baixo. */
export const usesCta = (id: TemplateId) => id === "perfil-cta";

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
  const ts = templates.length ? templates : (["perfil"] as TemplateId[]);
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

type Box = { x: number; y: number; w: number; h: number };

export type Layout = {
  /** Retângulo do vídeo no quadro 1080x1920 (sempre recortado para preencher). */
  video: Box;
  /** Cor de fundo (atrás do vídeo), no formato do FFmpeg. */
  background: string;
  /** Escurece o vídeo (texto por cima dele). */
  dim: boolean;
  /** Foto de perfil (canto superior esquerdo e tamanho), ou null se o template não mostra perfil. */
  avatar: { x: number; y: number; size: number } | null;
  /** Fundo claro: textos escuros. */
  light: boolean;
};

export function layoutFor(id: TemplateId): Layout {
  switch (id) {
    case "perfil":
    case "perfil-cta":
      return { video: { x: 0, y: 660, w: 1080, h: 608 }, background: "black", dim: false, avatar: { x: 60, y: 1304, size: 104 }, light: false };
    case "tweet-escuro":
      return { video: { x: 40, y: 900, w: 1000, h: 562 }, background: "black", dim: false, avatar: { x: 60, y: 470, size: 112 }, light: false };
    case "tweet-claro":
      return { video: { x: 40, y: 900, w: 1000, h: 562 }, background: "white", dim: false, avatar: { x: 60, y: 470, size: 112 }, light: true };
    case "texto-central":
      return { video: { x: 0, y: 0, w: 1080, h: 1920 }, background: "black", dim: true, avatar: { x: 60, y: 1600, size: 100 }, light: false };
    case "manchete":
    default:
      return { video: { x: 0, y: 560, w: 1080, h: 1360 }, background: "black", dim: false, avatar: null, light: false };
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
const INK = "&H00140F0F";
const GRAY = "&H00A0968F";
const BLUE = "&H00F09B1D"; // azul do selo (#1d9bf0)
const PINK = "&H00882EFF";

/** Tamanho da fonte conforme o comprimento (textos longos ficam menores). */
export function headlineSize(text: string, base: number): number {
  const n = text.length;
  if (n <= 28) return base;
  if (n <= 48) return Math.round(base * 0.88);
  if (n <= 70) return Math.round(base * 0.76);
  return Math.round(base * 0.66);
}

/** Largura aproximada de um texto em Arial negrito (para posicionar o selo depois do nome). */
export function approxTextWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += /[ilIj.,:;'!|]/.test(ch) ? 0.3 : /[mwMW@]/.test(ch) ? 0.88 : /[A-Z0-9]/.test(ch) ? 0.68 : ch === " " ? 0.28 : 0.58;
  return Math.round(w * size * 0.9);
}

/** Círculo em desenho ASS (\p1) com o diâmetro dado, começando em (0,0). */
function circle(d: number): string {
  const r = d / 2;
  const k = Math.round(r * 0.5523 * 100) / 100;
  return `m ${r} 0 b ${r + k} 0 ${d} ${r - k} ${d} ${r} b ${d} ${r + k} ${r + k} ${d} ${r} ${d} b ${r - k} ${d} 0 ${r + k} 0 ${r} b 0 ${r - k} ${r - k} 0 ${r} 0`;
}

export type TextOptions = {
  headline: string;
  /** Chamada de baixo (só nos templates que usam). */
  cta: string;
  name: string;
  handle: string;
  verified: boolean;
  /** Se a foto real vai por cima (senão desenha um círculo com a inicial). */
  hasAvatar: boolean;
  duration: number;
  /** Fonte da manchete em caixa alta (Impact quando existe). */
  font: string;
};

/** Legenda ASS com o texto do template e o perfil durante o vídeo todo. */
export function buildTemplateAss(id: TemplateId, o: TextOptions): string {
  const L = layoutFor(id);
  const headline = escapeAss(o.headline);
  const name = escapeAss(o.name) || "Sua página";
  const handle = escapeAss(o.handle);
  const cta = escapeAss(o.cta);
  const end = assTime(o.duration);
  const text = L.light ? INK : WHITE;
  const styles: string[] = [];
  const events: string[] = [];
  // Estilos: Name, Fontname, Fontsize, Primary, Outline, Bold, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR
  const style = (n: string, font: string, size: number, primary: string, outline: string, bold: 0 | 1, outlineW: number, shadow: number, align: number, marginL = 70, marginR = 70) =>
    styles.push(`Style: ${n},${font},${size},${primary},${primary},${outline},&H80000000,${bold ? -1 : 0},0,0,0,100,100,0,0,1,${outlineW},${shadow},${align},${marginL},${marginR},0,1`);
  const line = (st: string, body: string, layer = 0) => body && events.push(`Dialogue: ${layer},0:00:00.00,${end},${st},,0,0,0,,${body}`);

  // ---- perfil (foto, nome, selo, @) ----
  function profile(a: NonNullable<Layout["avatar"]>, onVideo: boolean) {
    const nameSize = Math.round(a.size * 0.44);
    const handleSize = Math.round(a.size * 0.36);
    const tx = a.x + a.size + 22;
    const cy = a.y + a.size / 2;
    const outline = onVideo ? 3 : 0;
    style("Name", "Arial", nameSize, text, BLACK, 1, outline, onVideo ? 1 : 0, 4, 0, 0);
    style("Handle", "Arial", handleSize, onVideo ? WHITE : GRAY, BLACK, 0, outline, 0, 4, 0, 0);
    style("Shape", "Arial", 20, WHITE, BLACK, 0, 0, 0, 7, 0, 0);
    if (!o.hasAvatar) {
      line("Shape", `{\\pos(${a.x},${a.y})\\c${PINK}\\p1}${circle(a.size)}`);
      style("Initial", "Arial", Math.round(a.size * 0.5), WHITE, BLACK, 1, 0, 0, 5, 0, 0);
      line("Initial", `{\\pos(${a.x + a.size / 2},${cy})}${name.charAt(0).toUpperCase()}`, 1);
    }
    line("Name", `{\\pos(${tx},${cy - handleSize * 0.62})}${name}`);
    if (o.verified) {
      const d = Math.round(nameSize * 0.95);
      const bx = tx + approxTextWidth(name, nameSize) + 10;
      const by = Math.round(cy - handleSize * 0.62 - d / 2);
      line("Shape", `{\\pos(${bx},${by})\\c${BLUE}\\bord0\\p1}${circle(d)}`);
      // visto branco por cima do círculo
      const s = d / 24;
      const pts = [[6, 12.5], [10.2, 16.5], [18, 8], [16.4, 6.6], [10.2, 13.4], [7.6, 10.9]].map(([x, y]) => `${Math.round(x * s * 10) / 10} ${Math.round(y * s * 10) / 10}`);
      line("Shape", `{\\pos(${bx},${by})\\c${WHITE}\\bord0\\p1}m ${pts[0]} l ${pts.slice(1).join(" ")}`, 1);
    }
    if (handle) line("Handle", `{\\pos(${tx},${cy + nameSize * 0.55})}${handle}`);
  }

  switch (id) {
    case "perfil":
    case "perfil-cta": {
      style("Head", "Arial", headlineSize(headline, 64), WHITE, BLACK, 0, 0, 0, 2);
      line("Head", headline && `{\\pos(540,${L.video.y - 44})}${headline}`);
      profile(L.avatar!, false);
      if (id === "perfil-cta") {
        style("Cta", "Arial", headlineSize(cta, 54), WHITE, BLACK, 0, 0, 0, 8);
        line("Cta", cta && `{\\pos(540,${L.avatar!.y + L.avatar!.size + 70})}${cta}`);
      }
      break;
    }
    case "tweet-escuro":
    case "tweet-claro": {
      profile(L.avatar!, false);
      style("Head", "Arial", headlineSize(headline, 56), text, BLACK, 0, 0, 0, 7, 60, 60);
      line("Head", headline && `{\\pos(60,${L.avatar!.y + L.avatar!.size + 46})}${headline}`);
      break;
    }
    case "texto-central": {
      style("Head", "Arial", headlineSize(headline, 66), WHITE, BLACK, 1, 4, 2, 5);
      line("Head", headline && `{\\pos(540,820)}${headline}`);
      profile(L.avatar!, true);
      break;
    }
    case "manchete":
    default:
      style("Head", o.font, headlineSize(headline, 124), WHITE, BLACK, 0, 0, 0, 5);
      line("Head", headline && `{\\pos(540,280)}${headline.toUpperCase()}`);
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
 * Filtro que posiciona o vídeo no layout com o zoom da versão e coloca a foto de perfil
 * (entrada [1:v], recortada em círculo) quando `withAvatar`. Saída [base] em 1080x1920.
 */
export function templateVideoFilter(id: TemplateId, params: VariationParams, withAvatar = false): string {
  const L = layoutFor(id);
  const { w, h, x, y } = L.video;
  const zw = Math.round((w * params.zoom) / 2) * 2;
  const zh = Math.round((h * params.zoom) / 2) * 2;
  const speed = params.speed !== 1 ? `setpts=PTS/${params.speed},` : "";
  const dim = L.dim ? ",eq=brightness=-0.12" : "";
  const parts = [
    `[0:v]${speed}scale=${zw}:${zh}:force_original_aspect_ratio=increase,crop=${w}:${h}${dim},pad=1080:1920:${x}:${y}:color=${L.background},setsar=1[${withAvatar && L.avatar ? "v" : "base"}]`,
  ];
  if (withAvatar && L.avatar) {
    const s = L.avatar.size;
    const r = s / 2;
    parts.push(
      `[1:v]scale=${s}:${s}:force_original_aspect_ratio=increase,crop=${s}:${s},format=yuva444p,geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)':a='if(lte(hypot(X-${r},Y-${r}),${r - 1}),255,0)'[av]`,
    );
    parts.push(`[v][av]overlay=${L.avatar.x}:${L.avatar.y}:format=auto[base]`);
  }
  return parts.join(";");
}

/** Filtro de áudio que acompanha a velocidade da versão ("" quando não muda). */
export const audioSpeedFilter = (params: VariationParams) => (params.speed !== 1 ? `atempo=${params.speed}` : "");
