/**
 * Roteiro do vídeo. Sem IA paga ainda: gera um esqueleto no formato que viraliza
 * (gancho → 3 pontos → chamada) e o usuário completa os trechos marcados.
 */
export const voices = [
  { id: "pt-BR-AntonioNeural", label: "Antônio (masculina)" },
  { id: "pt-BR-FranciscaNeural", label: "Francisca (feminina)" },
  { id: "pt-BR-ThalitaMultilingualNeural", label: "Thalita (feminina, multilíngue)" },
] as const;

export type VoiceId = (typeof voices)[number]["id"];

export const PLACEHOLDER = /\[[^\]]*\]/;

export function isValidVoice(v: unknown): v is VoiceId {
  return voices.some((x) => x.id === v);
}

/** Tema curto a partir do título do viral (sem hashtags, emojis e excesso de pontuação). */
export function topicFrom(title: string): string {
  return title
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "")
    .replace(/[|•]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);
}

export function scriptTemplate(topic: string): string {
  const t = topic || "[tema do vídeo]";
  return [
    `Para tudo! Você precisa ver isso sobre ${t}.`,
    "[Primeiro fato ou dica surpreendente, em uma frase curta.]",
    "[Segundo ponto, que aumenta a curiosidade.]",
    "[Terceiro ponto: a revelação ou a dica principal.]",
    "Segue o canal para não perder a próxima!",
  ].join("\n");
}

export function validateScript(script: string): string | null {
  const text = script.trim();
  if (text.length < 40) return "O roteiro está curto demais (mínimo de 40 caracteres).";
  if (text.length > 1500) return "O roteiro está longo demais para um Short (máximo de 1.500 caracteres).";
  if (PLACEHOLDER.test(text)) return "Complete os trechos entre colchetes [ ] antes de gerar.";
  return null;
}

/** Quebra a narração em blocos de legenda de até `maxWords` palavras. */
export function captionChunks(words: string[], maxWords = 4): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    const endsSentence = /[.!?…]$/.test(w);
    if (current.length >= maxWords || endsSentence) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}
