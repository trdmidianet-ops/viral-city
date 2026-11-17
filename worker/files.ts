/**
 * worker/files.ts
 * Entrega os vídeos do disco do worker por links assinados (criados pelo site, em lib/files/signed).
 * O worker não sabe quem é o usuário: confia na assinatura, que só o site consegue gerar.
 */

import path from "node:path";
import type { Request, Response } from "express";
import { queryOne } from "@/lib/db";
import { verifyFileUrl, type FileKind } from "@/lib/files/signed";

const DATA_DIR = path.resolve(process.env.WORKER_DATA_DIR ?? path.join(process.cwd(), ".data"));
// O site que pode baixar os vídeos pelo navegador (para "compartilhar" no celular)
const ALLOWED_ORIGINS = (process.env.APP_ORIGINS ?? "https://viralcity.app,http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const TABLE: Record<FileKind, string> = { clip: "vc_clips", variation: "vc_variations", source: "vc_sources", video: "vc_videos" };

const insideData = (file: string) => {
  const rel = path.relative(DATA_DIR, path.resolve(file));
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const one = (v: unknown) => (typeof v === "string" ? v : undefined);

export async function serveFile(req: Request, res: Response) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges");
  }

  const input = {
    kind: String(req.params.kind),
    id: String(req.params.id),
    exp: one(req.query.exp),
    dl: one(req.query.dl),
    sig: one(req.query.sig),
  };
  if (!verifyFileUrl(input)) {
    res.status(403).send("Link inválido ou vencido.");
    return;
  }

  const row = await queryOne<{ local_path: string | null }>(`select local_path from ${TABLE[input.kind]} where id = $1`, [input.id]).catch(
    () => null,
  );
  const file = row?.local_path;
  if (!file || !insideData(file)) {
    res.status(404).send("Vídeo não encontrado.");
    return;
  }

  if (input.dl === "1") res.attachment("viral-city-corte.mp4");
  res.sendFile(path.resolve(file), { acceptRanges: true, cacheControl: false, headers: { "Cache-Control": "private, max-age=600" } }, (err) => {
    if (err && !res.headersSent) res.status(404).send("Vídeo não encontrado.");
  });
}
