import { isDbConfigured } from "@/lib/db";
import { currentUserId } from "@/lib/auth";
import { FILE_ID } from "@/lib/files/signed";
import { respondWithVideo } from "@/lib/files/respond";
import { getOwnedVariation } from "@/lib/scale/repo";

/** Vídeo de uma versão do Scale (prévia, ou download com ?dl=1). Só para o dono. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isDbConfigured() || !FILE_ID.test(id)) return new Response("Vídeo não encontrado.", { status: 404 });
  const userId = await currentUserId();
  const variation = userId ? (await getOwnedVariation(userId, id))?.variation : null;
  if (!variation) return new Response("Vídeo não encontrado.", { status: 404 });
  return respondWithVideo(req, "variation", id, variation.local_path);
}
