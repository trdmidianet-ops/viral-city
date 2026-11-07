import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { serveLocalVideo } from "@/lib/clips/serve-video";
import { getOwnedVariation } from "@/lib/scale/repo";

/** Serve a prévia de uma versão do Scale a partir do PC. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!canUseLocalFiles() || !isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Prévia disponível só no painel do PC.", { status: 404 });
  }
  const userId = await currentUserId();
  const variation = userId ? (await getOwnedVariation(userId, id))?.variation : null;
  return serveLocalVideo(req, variation?.local_path ?? null);
}
