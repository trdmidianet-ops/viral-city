import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getOwnedSource } from "@/lib/clips/repo";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { serveLocalVideo } from "@/lib/clips/serve-video";

/** Serve o vídeo longo (do PC) para o editor de clipes tocar o trecho escolhido. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!canUseLocalFiles() || !isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Disponível só no painel do PC.", { status: 404 });
  }
  const userId = await currentUserId();
  const source = userId ? await getOwnedSource(userId, id) : null;
  return serveLocalVideo(req, source?.local_path ?? null);
}
