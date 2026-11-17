import { canUseLocalFiles } from "@/lib/clips/local-files";
import { serveLocalVideo } from "@/lib/clips/serve-video";
import { canServeFromWorker, signedFileUrl, type FileKind } from "./signed";

/** O painel consegue mostrar vídeos prontos? (no PC, do disco; online, pelo worker) */
export const canShowVideos = () => canUseLocalFiles() || canServeFromWorker();

/**
 * Responde com o vídeo de quem já foi conferido como dono. No PC, entrega do disco; online,
 * manda para o link assinado do worker. `?dl=1` na requisição pede o arquivo para baixar.
 */
export function respondWithVideo(req: Request, kind: FileKind, id: string, localPath: string | null): Promise<Response> | Response {
  const params = new URL(req.url).searchParams;
  const download = params.get("dl") === "1";
  // ?link=1: devolve o endereço do vídeo em JSON, para o navegador baixar direto (compartilhar no celular).
  // O fetch não pode seguir o redirecionamento para o worker: o navegador mandaria a origem "null".
  if (params.get("link") === "1") {
    if (canUseLocalFiles()) return Response.json({ url: new URL(req.url).pathname }, { headers: { "Cache-Control": "no-store" } });
    if (!localPath || !canServeFromWorker()) return Response.json({ error: "indisponivel" }, { status: 404 });
    return Response.json({ url: signedFileUrl(kind, id, { ttlSeconds: 15 * 60 }) }, { headers: { "Cache-Control": "no-store" } });
  }
  if (canUseLocalFiles()) return serveLocalVideo(req, localPath, { download });
  if (!localPath || !canServeFromWorker()) return new Response("Vídeo indisponível no momento.", { status: 404 });
  return new Response(null, { status: 302, headers: { Location: signedFileUrl(kind, id, { download }), "Cache-Control": "no-store" } });
}
