import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Links assinados para os vídeos que ficam no disco do worker (Railway).
 * O site confere se o vídeo é de quem pediu e manda o navegador para um link do worker que
 * vale por pouco tempo; o worker só confere a assinatura (com WORKER_SECRET) e entrega o arquivo.
 * Usado pelo site (Vercel) e pelo worker.
 */

export type FileKind = "clip" | "variation" | "source" | "video";
const KINDS: readonly FileKind[] = ["clip", "variation", "source", "video"];
export const isFileKind = (k: string): k is FileKind => (KINDS as readonly string[]).includes(k);

export const FILE_ID = /^[0-9a-f-]{36}$/i;

/** O site entrega vídeos pelo worker quando sabe o endereço e o segredo dele. */
export const canServeFromWorker = () => Boolean(process.env.WORKER_URL && process.env.WORKER_SECRET);

const DEFAULT_TTL_SECONDS = 60 * 60;

function signature(secret: string, kind: FileKind, id: string, exp: number, download: boolean): string {
  return createHmac("sha256", secret).update(`${kind}:${id}:${exp}:${download ? 1 : 0}`).digest("base64url");
}

/** Link do worker para um vídeo, válido por `ttlSeconds` (padrão: 1 hora). */
export function signedFileUrl(
  kind: FileKind,
  id: string,
  { download = false, ttlSeconds = DEFAULT_TTL_SECONDS, now = Date.now() }: { download?: boolean; ttlSeconds?: number; now?: number } = {},
): string {
  const base = (process.env.WORKER_URL ?? "").replace(/\/+$/, "");
  const secret = process.env.WORKER_SECRET ?? "";
  if (!base || !secret) throw new Error("WORKER_URL e WORKER_SECRET precisam estar configurados.");
  const exp = Math.floor(now / 1000) + ttlSeconds;
  const params = new URLSearchParams({ exp: String(exp) });
  if (download) params.set("dl", "1");
  params.set("sig", signature(secret, kind, id, exp, download));
  return `${base}/files/${kind}/${id}?${params}`;
}

/** Confere um link assinado. Recusa se faltar o segredo, se venceu ou se a assinatura não bate. */
export function verifyFileUrl(
  input: { kind: string; id: string; exp: string | undefined; dl: string | undefined; sig: string | undefined },
  { secret = process.env.WORKER_SECRET ?? "", now = Date.now() }: { secret?: string; now?: number } = {},
): input is { kind: FileKind; id: string; exp: string; dl: string | undefined; sig: string } {
  if (!secret || !isFileKind(input.kind) || !FILE_ID.test(input.id)) return false;
  const exp = Number(input.exp);
  if (!Number.isInteger(exp) || exp * 1000 < now || !input.sig) return false;
  const expected = Buffer.from(signature(secret, input.kind, input.id, exp, input.dl === "1"));
  const given = Buffer.from(input.sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
