"use server";

import { revalidatePath } from "next/cache";
import { listAccounts } from "@/lib/accounts/store";
import { isDbConfigured } from "@/lib/db";
import { isValidVoice, validateScript } from "@/lib/video/script";
import { createVideo, deleteVideo, retryVideo } from "@/lib/videos/repo";

export type GenState = { error?: string; ok?: boolean };

const UUID = /^[0-9a-f-]{36}$/i;
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function createVideoAction(_: GenState, form: FormData): Promise<GenState> {
  if (!isDbConfigured()) return { error: "Banco de dados não configurado." };

  const title = str(form, "title", 100);
  const script = str(form, "script", 2000);
  const description = str(form, "description", 4000);
  const voice = str(form, "voice", 60);
  const accountId = str(form, "account", 40);

  if (title.length < 3) return { error: "Dê um título ao vídeo (mínimo de 3 caracteres)." };
  const scriptError = validateScript(script);
  if (scriptError) return { error: scriptError };
  if (!isValidVoice(voice)) return { error: "Escolha uma voz válida." };

  if (accountId) {
    if (!UUID.test(accountId)) return { error: "Conta inválida." };
    const accounts = await listAccounts("youtube");
    if (!accounts.some((a) => a.id === accountId)) return { error: "Conta não encontrada." };
  }

  const refId = str(form, "ref", 20);
  const reference = /^[\w-]{11}$/.test(refId)
    ? {
        videoId: refId,
        title: str(form, "refTitle", 200),
        channel: str(form, "refChannel", 100),
        niche: str(form, "refNiche", 40),
        url: `https://www.youtube.com/watch?v=${refId}`,
      }
    : null;

  await createVideo({ accountId: accountId || null, reference, title, description, script, voice });
  revalidatePath("/painel/gerador");
  return { ok: true };
}

export async function retryVideoAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!isDbConfigured() || !UUID.test(id)) return;
  await retryVideo(id);
  revalidatePath("/painel/gerador");
}

export async function deleteVideoAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!isDbConfigured() || !UUID.test(id)) return;
  await deleteVideo(id);
  revalidatePath("/painel/gerador");
}
