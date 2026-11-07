import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { getOwnedClip } from "@/lib/clips/repo";
import { canUseLocalFiles } from "@/lib/clips/local-files";
import { serveLocalVideo } from "@/lib/clips/serve-video";

/** Serve a prévia do corte a partir do PC. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!canUseLocalFiles() || !isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Prévia disponível só no painel do PC.", { status: 404 });
  }
  const userId = await currentUserId();
  const clip = userId ? (await getOwnedClip(userId, id))?.clip : null;
  return serveLocalVideo(req, clip?.local_path ?? null);
}
