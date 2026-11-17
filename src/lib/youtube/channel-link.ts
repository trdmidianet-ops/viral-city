import { createHmac } from "node:crypto";

/**
 * Canal do YouTube ligado pelo link, sem login do Google: a pessoa cola o link do canal e prova
 * que é dona colocando um código na descrição. Só usa dados públicos (API key), sem permissões
 * sensíveis nem limite de usuários.
 */

/** Marca, em vc_accounts.scopes, as contas ligadas pelo link (sem tokens: não postam pela API). */
export const LINKED_SCOPE = "verificado-por-link";
export const isLinkedOnly = (scopes: string[]) => scopes.includes(LINKED_SCOPE);

export type ChannelRef = { channelId: string } | { handle: string };

/** Entende "https://youtube.com/@canal", "@canal", ".../channel/UC…" ou o ID "UC…". */
export function parseChannelInput(raw: string): ChannelRef | null {
  const text = raw.trim();
  if (/^UC[\w-]{22}$/.test(text)) return { channelId: text };
  if (/^@[\w.-]{3,30}$/.test(text)) return { handle: text.slice(1) };
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www\.|m\.)/, "");
  if (host !== "youtube.com") return null;
  const [first, second] = url.pathname.split("/").filter(Boolean);
  if (first?.startsWith("@") && /^@[\w.-]{3,30}$/.test(first)) return { handle: first.slice(1) };
  if (first === "channel" && second && /^UC[\w-]{22}$/.test(second)) return { channelId: second };
  return null;
}

/**
 * Código que a pessoa cola na descrição do canal. Sai sempre igual para a mesma conta e o mesmo
 * canal (não precisa guardar), e ninguém consegue adivinhar sem o segredo do servidor.
 */
export function verificationCode(userId: string, channelId: string, secret = process.env.BETTER_AUTH_SECRET ?? ""): string {
  if (!secret) throw new Error("BETTER_AUTH_SECRET não configurado.");
  const digest = createHmac("sha256", secret).update(`canal:${userId}:${channelId}`).digest();
  // 8 caracteres sem letras que se confundem (0/O, 1/I)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += alphabet[digest[i] % alphabet.length];
  return `VIRALCITY-${code}`;
}

export type ChannelInfo = { id: string; title: string; handle?: string; avatarUrl?: string; description: string };

/** Busca o canal na API do YouTube (dados públicos, 1 unidade de cota). */
export async function fetchChannel(ref: ChannelRef): Promise<ChannelInfo | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("YOUTUBE_API_KEY não configurada.");
  const params = new URLSearchParams({ part: "snippet", key });
  if ("channelId" in ref) params.set("id", ref.channelId);
  else params.set("forHandle", `@${ref.handle}`);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status}.`);
  const body = (await res.json()) as {
    items?: { id: string; snippet: { title: string; description?: string; customUrl?: string; thumbnails?: Record<string, { url: string }> } }[];
  };
  const item = body.items?.[0];
  if (!item) return null;
  const s = item.snippet;
  return {
    id: item.id,
    title: s.title,
    handle: s.customUrl,
    avatarUrl: (s.thumbnails?.medium ?? s.thumbnails?.default)?.url,
    description: s.description ?? "",
  };
}
