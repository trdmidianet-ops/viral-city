/** Manchetes do Scale: prompt para a IA, leitura da resposta e plano B sem IA. Funções puras. */

export const MAX_HEADLINE = 90;

/** Limpa as manchetes digitadas (uma por linha): tira vazias, repetidas e longas demais. */
export function cleanHeadlines(raw: string | string[], max = 30): string[] {
  const list = Array.isArray(raw) ? raw : raw.split(/\r?\n/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of list) {
    const t = h.replace(/\s+/g, " ").trim().replace(/^[-•*\d.)\s]+/, "").slice(0, MAX_HEADLINE).trim();
    const key = t.toLowerCase();
    if (!t || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function buildHeadlinePrompt(input: { topic: string; count: number; examples: string[]; niche?: string | null }): string {
  return `Você é um copywriter de Shorts, Reels e TikTok virais${input.niche ? ` do nicho ${input.niche}` : ""}.
Escreva ${input.count} manchetes DIFERENTES para ficar escritas em cima do mesmo vídeo curto, para testar qual viraliza mais.

Assunto do vídeo: "${input.topic || "sem descrição"}"
${input.examples.length ? `Manchetes que o criador já escreveu (mantenha o estilo, sem repetir):\n${input.examples.map((e) => `- ${e}`).join("\n")}\n` : ""}
Regras:
- Até 60 caracteres cada, no mesmo idioma do assunto.
- Ângulos variados: curiosidade, polêmica, revelação, pergunta, número, urgência, humor.
- Nada de hashtags, emojis ou aspas; não invente fatos que não estão no assunto.

Responda SOMENTE com JSON válido, sem texto antes ou depois: {"headlines":["...","..."]}`;
}

/** Lê a resposta da IA. Aceita o JSON puro ou com texto em volta. */
export function parseHeadlines(text: string): string[] {
  const m = /\{[\s\S]*\}/.exec(text);
  if (!m) return [];
  try {
    const body = JSON.parse(m[0]) as { headlines?: unknown };
    return Array.isArray(body.headlines) ? cleanHeadlines(body.headlines.filter((h): h is string => typeof h === "string")) : [];
  } catch {
    return [];
  }
}

const FALLBACK_PATTERNS = [
  (t: string) => t,
  (t: string) => `Ninguém esperava isso: ${t}`,
  (t: string) => `Olha o que aconteceu: ${t}`,
  (t: string) => `Você viu isso? ${t}`,
  (t: string) => `Até agora não acredito: ${t}`,
  (t: string) => `Isso mudou tudo: ${t}`,
];

/** Sem IA: varia o assunto com fórmulas de gancho conhecidas. */
export function fallbackHeadlines(topic: string, count: number): string[] {
  const base = topic.replace(/\s+/g, " ").trim().slice(0, 60);
  if (!base) return [];
  return cleanHeadlines(FALLBACK_PATTERNS.map((f) => f(base)), count);
}
