import { open, stat } from "node:fs/promises";
import { freshAccessToken } from "./tokens";

/**
 * TikTok Content Posting API (Direct Post, envio do arquivo direto do PC).
 * Enquanto o app não passa na auditoria do TikTok, só é permitido postar como privado
 * ("só eu"): usamos a privacidade mais aberta que a conta oferecer.
 */

const API = "https://open.tiktokapis.com/v2";
const MB = 1024 * 1024;

type TiktokBody<T> = { data?: T; error?: { code?: string; message?: string } };

async function tiktok<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as TiktokBody<T>;
  if (!res.ok || (body.error?.code && body.error.code !== "ok")) {
    throw new Error(`${what}: ${body.error?.message || body.error?.code || `HTTP ${res.status}`}`);
  }
  return body.data as T;
}

/** Divisão do arquivo exigida pela API: pedaços de 5 a 64 MB; o último absorve o resto (até 128 MB). */
export function tiktokChunks(size: number, preferred = 10 * MB): { chunkSize: number; count: number; ranges: [number, number][] } {
  if (size <= 0) throw new Error("Arquivo vazio.");
  if (size < 5 * MB) return { chunkSize: size, count: 1, ranges: [[0, size - 1]] };
  const chunkSize = Math.min(64 * MB, Math.max(5 * MB, preferred));
  const count = Math.max(1, Math.floor(size / chunkSize));
  const ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    const end = i === count - 1 ? size - 1 : start + chunkSize - 1;
    ranges.push([start, end]);
  }
  return { chunkSize, count, ranges };
}

/** Privacidade mais aberta entre as que o TikTok liberou para a conta. */
export function pickPrivacy(options: string[]): string {
  const order = ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"];
  return order.find((o) => options.includes(o)) ?? options[0] ?? "SELF_ONLY";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function publishTiktok(params: {
  accountId: string;
  filePath: string;
  title: string;
  pollMs?: number;
}): Promise<{ id: string; url: string | null; privacy: string }> {
  const token = await freshAccessToken(params.accountId);
  const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" };

  const creator = await tiktok<{ privacy_level_options?: string[]; creator_username?: string }>(
    await fetch(`${API}/post/publish/creator_info/query/`, { method: "POST", headers: auth }),
    "TikTok recusou a conta",
  );
  const privacy = pickPrivacy(creator.privacy_level_options ?? []);

  const size = (await stat(params.filePath)).size;
  const plan = tiktokChunks(size);
  const init = await tiktok<{ publish_id: string; upload_url: string }>(
    await fetch(`${API}/post/publish/video/init/`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        post_info: { title: params.title.slice(0, 2200), privacy_level: privacy, disable_duet: false, disable_comment: false, disable_stitch: false, video_cover_timestamp_ms: 1000 },
        source_info: { source: "FILE_UPLOAD", video_size: size, chunk_size: plan.chunkSize, total_chunk_count: plan.count },
      }),
    }),
    "TikTok recusou o vídeo",
  );

  const file = await open(params.filePath, "r");
  try {
    for (const [start, end] of plan.ranges) {
      const buf = Buffer.alloc(end - start + 1);
      await file.read(buf, 0, buf.length, start);
      const put = await fetch(init.upload_url, {
        method: "PUT",
        headers: { "Content-Type": "video/mp4", "Content-Length": String(buf.length), "Content-Range": `bytes ${start}-${end}/${size}` },
        body: buf,
      });
      if (!put.ok) throw new Error(`Falha ao enviar o vídeo para o TikTok (HTTP ${put.status}).`);
    }
  } finally {
    await file.close();
  }

  const pollMs = params.pollMs ?? 5000;
  for (let i = 0; ; i++) {
    const st = await tiktok<{ status?: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] }>(
      await fetch(`${API}/post/publish/status/fetch/`, { method: "POST", headers: auth, body: JSON.stringify({ publish_id: init.publish_id }) }),
      "TikTok não respondeu o status",
    );
    if (st.status === "PUBLISH_COMPLETE" || (st.status === "SEND_TO_USER_INBOX")) {
      const postId = st.publicaly_available_post_id?.[0];
      const url = postId && creator.creator_username ? `https://www.tiktok.com/@${creator.creator_username}/video/${postId}` : null;
      return { id: String(postId ?? init.publish_id), url, privacy };
    }
    if (st.status === "FAILED") throw new Error(`TikTok não publicou: ${st.fail_reason ?? "motivo não informado"}`);
    if (i >= 60) {
      // vídeos privados nem sempre chegam a PUBLISH_COMPLETE na consulta; o envio já foi aceito
      return { id: init.publish_id, url: null, privacy };
    }
    await sleep(pollMs);
  }
}
