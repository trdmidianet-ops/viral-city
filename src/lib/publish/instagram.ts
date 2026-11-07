import { readFile, stat } from "node:fs/promises";
import { freshAccessToken } from "./tokens";

/**
 * Reels pela API do Instagram com login do Instagram (contas Profissionais).
 * Usa o envio "resumable": o arquivo sai direto do PC, sem precisar de um link público.
 * 1) cria o contêiner  2) envia o arquivo  3) espera o processamento  4) publica.
 */

const GRAPH = "https://graph.instagram.com/v23.0";
const RUPLOAD = "https://rupload.facebook.com/ig-api-upload/v23.0";

/** Legenda do Reels: a descrição (ou o título), sem a hashtag #shorts, que é do YouTube. */
export const instagramCaption = (title: string, description: string) =>
  (description.trim() || title.trim()).replace(/\s*#shorts\b/gi, "").trim().slice(0, 2200);

async function graph<T>(res: Response, what: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const msg = body.error?.error_user_msg ?? body.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`${what}: ${msg}`);
  }
  return body as T;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function publishInstagramReel(params: {
  accountId: string;
  igUserId: string;
  filePath: string;
  caption: string;
  /** Para os testes: tempo entre as consultas de status. */
  pollMs?: number;
}): Promise<{ id: string; url: string | null }> {
  const token = await freshAccessToken(params.accountId);
  const size = (await stat(params.filePath)).size;

  const container = await graph<{ id: string; uri?: string }>(
    await fetch(`${GRAPH}/${params.igUserId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "REELS", upload_type: "resumable", caption: params.caption, share_to_feed: true }),
    }),
    "Instagram recusou o Reels",
  );

  const upload = await fetch(container.uri ?? `${RUPLOAD}/${container.id}`, {
    method: "POST",
    headers: { Authorization: `OAuth ${token}`, offset: "0", file_size: String(size), "Content-Type": "application/octet-stream" },
    body: await readFile(params.filePath),
  });
  await graph(upload, "Falha ao enviar o vídeo para o Instagram");

  // processamento do vídeo: até ~5 minutos
  const pollMs = params.pollMs ?? 5000;
  for (let i = 0; ; i++) {
    const st = await graph<{ status_code?: string; status?: string }>(
      await fetch(`${GRAPH}/${container.id}?fields=status_code,status`, { headers: { Authorization: `Bearer ${token}` } }),
      "Instagram não respondeu o status",
    );
    if (st.status_code === "FINISHED") break;
    if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`Instagram não processou o vídeo: ${st.status ?? st.status_code}`);
    if (i >= 60) throw new Error("O Instagram demorou demais para processar o vídeo.");
    await sleep(pollMs);
  }

  const published = await graph<{ id: string }>(
    await fetch(`${GRAPH}/${params.igUserId}/media_publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id }),
    }),
    "Instagram não publicou o Reels",
  );
  const link = await fetch(`${GRAPH}/${published.id}?fields=permalink`, { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.json() as Promise<{ permalink?: string }>)
    .catch(() => ({ permalink: undefined }));
  return { id: published.id, url: link.permalink ?? null };
}
