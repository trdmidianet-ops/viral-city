"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedAccount, listAccounts } from "@/lib/accounts/store";
import { isAdminUser } from "@/lib/admin";
import { requireUserId } from "@/lib/auth";
import { MIN_SOURCE_COINS, formatCoins } from "@/lib/coins/pricing";
import { getBalance } from "@/lib/coins/wallet";
import { createSource, deleteSource, getOwnedClip, getOwnedSource, listClips, updateClip, updateSource, type Framing, type Language, type SourceKind } from "@/lib/clips/repo";
import { canUseLocalFiles, uploadPath, downloadPath } from "@/lib/clips/local-files";
import { parseClipEdit } from "@/lib/clips/edit";
import { isDbConfigured } from "@/lib/db";
import { listChannelUploads } from "@/lib/youtube/channel";
import { niches } from "@/lib/youtube/niches";
import { createReadyVideo } from "@/lib/videos/repo";

export type FormState = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const FRAMINGS: Framing[] = ["center", "blur", "split"];
const LANGS: Language[] = ["portuguese", "english", "spanish"];
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

/** Avisa o worker externo (Railway) para começar a processar a source. */
async function notifyWorker(sourceId: string): Promise<void> {
  const url = process.env.WORKER_URL;
  const secret = process.env.WORKER_SECRET;
  if (!url) return; // sem worker — rodando localmente
  try {
    await fetch(`${url}/process`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-worker-secret": secret ?? "" },
      body: JSON.stringify({ sourceId }),
      signal: AbortSignal.timeout(5_000),
    });
  } catch (e) {
    console.warn("[worker] notify error:", e);
  }
}

export async function createSourceAction(_: FormState, form: FormData): Promise<FormState> {
  if (!isDbConfigured()) return { error: "Banco de dados não configurado." };
  const userId = await requireUserId();
  // O valor exato sai pela duração, no worker; aqui só barra quem não tem nem o mínimo
  const isLocalhost = !process.env.VERCEL;
  if (!isLocalhost && !(await isAdminUser(userId)) && (await getBalance(userId)) < MIN_SOURCE_COINS) {
    return { error: `Saldo insuficiente: gerar cortes custa a partir de ${formatCoins(MIN_SOURCE_COINS)} CityCoins. Recarregue na Carteira.` };
  }

  const kind = str(form, "kind", 10) as SourceKind;
  const framing = str(form, "framing", 10) as Framing;
  const language = str(form, "language", 12) as Language;
  const accountId = str(form, "account", 40);
  const nicheId = str(form, "niche", 30);
  if (!FRAMINGS.includes(framing) || !LANGS.includes(language)) return { error: "Opções inválidas." };
  if (accountId && (!UUID.test(accountId) || !(await getOwnedAccount(userId, accountId)))) return { error: "Conta inválida." };

  let newSourceId = "";
  const base = {
    account_id: accountId || null,
    language,
    framing,
    captions: form.get("captions") === "on",
    use_logo: form.get("use_logo") === "on",
    niche: niches.some((n) => n.id === nicheId) ? nicheId : null,
    reference_title: str(form, "reference_title", 200) || null,
    youtube_video_id: null as string | null,
    source_url: null as string | null,
    upload_name: null as string | null,
    title: "",
  };

  if (kind === "channel") {
    const videoId = str(form, "video", 20);
    if (!/^[\w-]{11}$/.test(videoId)) return { error: "Escolha um vídeo do seu canal." };
    if (!accountId) return { error: "Escolha o canal." };
    const account = (await listAccounts(userId, "youtube")).find((a) => a.id === accountId);
    const video = account ? (await listChannelUploads(account.externalId)).find((v) => v.id === videoId) : null;
    if (!video) return { error: "Esse vídeo não está entre os uploads recentes do canal." };
    newSourceId = (await createSource(userId, { ...base, kind, youtube_video_id: videoId, title: video.title })).id;
  } else if (kind === "link") {
    const url = str(form, "url", 1000);
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) throw new Error();
    } catch {
      return { error: "Cole um link válido (http/https)." };
    }
    newSourceId = (await createSource(userId, { ...base, kind, source_url: url, title: str(form, "title", 120) })).id;
  } else if (kind === "file") {
    if (!canUseLocalFiles()) return { error: "Envio de arquivo só funciona no painel aberto no seu PC." };
    const file = uploadPath(str(form, "uploadId", 60));
    if (!file) return { error: "Envie o arquivo antes de criar os cortes." };
    const name = str(form, "uploadName", 200);
    newSourceId = (await createSource(userId, { ...base, kind, upload_name: name, title: name.replace(/\.[^.]+$/, ""), local_path: file })).id;
  } else if (kind === "import") {
    if (!canUseLocalFiles()) return { error: "Importar vídeos só funciona no painel aberto no seu PC." };
    const fileId = str(form, "importFileId", 40);
    const file = downloadPath(fileId);
    if (!file) return { error: "Importe o vídeo antes de gerar os cortes." };
    const importTitle = `Importado – ${new Date().toLocaleDateString("pt-PT")}`;
    newSourceId = (await createSource(userId, { ...base, kind: "file", upload_name: `${fileId}.mp4`, title: importTitle, local_path: file })).id;
  } else {
    return { error: "Escolha a origem do vídeo." };
  }

  if (newSourceId) await notifyWorker(newSourceId);
  revalidatePath("/painel/cortes");
  redirect("/painel/cortes?criado=1");
}

export async function deleteSourceAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  await deleteSource(await requireUserId(), id);
  revalidatePath("/painel/cortes");
  redirect("/painel/cortes");
}

export async function retrySourceAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const source = await getOwnedSource(await requireUserId(), id);
  if (source?.status !== "failed") return;
  await updateSource(id, { status: "queued", error: null, progress: null });
  revalidatePath(`/painel/cortes/${id}`);
}

/** Troca o enquadramento/legendas/logo e renderiza de novo os cortes ainda não aprovados. */
export async function updateStyleAction(form: FormData) {
  const id = str(form, "id", 40);
  const framing = str(form, "framing", 10) as Framing;
  if (!isDbConfigured() || !UUID.test(id) || !FRAMINGS.includes(framing)) return;
  if (!(await getOwnedSource(await requireUserId(), id))) return;
  await updateSource(id, { framing, captions: form.get("captions") === "on", use_logo: form.get("use_logo") === "on", status: "rendering" });
  for (const clip of await listClips(id)) {
    if (clip.status !== "approved") await updateClip(clip.id, { status: "pending" });
  }
  revalidatePath(`/painel/cortes/${id}`);
}

/** Edita o texto do topo e renderiza o corte de novo. */
export async function updateHookAction(form: FormData) {
  const id = str(form, "id", 40);
  const hook = str(form, "hook", 80);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const clip = (await getOwnedClip(await requireUserId(), id))?.clip;
  if (!clip || clip.status === "approved") return;
  await updateClip(id, { hook, status: "pending" });
  revalidatePath(`/painel/cortes/${clip.source_id}`);
}

/** Aprova o corte: ele vira um vídeo pronto e a Agenda posta no próximo horário. */
export async function approveClipAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const userId = await requireUserId();
  const owned = await getOwnedClip(userId, id);
  if (!owned) return;
  const { clip, source } = owned;
  if (clip.status !== "rendered" || !clip.local_path) return;
  const video = await createReadyVideo(userId, {
    accountId: source.account_id,
    reference: source.reference_title ? { title: source.reference_title, niche: source.niche ?? undefined } : null,
    title: clip.hook || source.title.slice(0, 90),
    description: `${clip.hook}\n\n#shorts`.trim(),
    localPath: clip.local_path,
    duration: Number(clip.end_seconds) - Number(clip.start_seconds),
  });
  await updateClip(id, { status: "approved", video_id: video.id });
  revalidatePath(`/painel/cortes/${source.id}`);
}

export type EditState = { error?: string; saved?: boolean };

/** Editor de clipes: grava trecho, texto e estilo do corte e manda renderizar de novo. */
export async function saveClipEditAction(_: EditState, form: FormData): Promise<EditState> {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return { error: "Corte inválido." };
  const owned = await getOwnedClip(await requireUserId(), id);
  if (!owned) return { error: "Corte não encontrado." };
  if (owned.clip.status === "approved") return { error: "Esse corte já foi aprovado para a Agenda e não pode mais ser editado." };
  if (owned.clip.status === "rendering") return { error: "Espere a renderização atual terminar." };

  const parsed = parseClipEdit(
    {
      start: str(form, "start", 20),
      end: str(form, "end", 20),
      hook: str(form, "hook", 120),
      hookPosition: str(form, "hook_position", 10),
      framing: str(form, "framing", 10),
      captions: form.get("captions") === "on",
      captionColor: str(form, "caption_color", 10),
      speed: str(form, "speed", 5),
    },
    Number(owned.source.duration_seconds ?? 0),
  );
  if ("error" in parsed) return { error: parsed.error };
  await updateClip(id, { ...parsed.patch, status: "pending" });
  revalidatePath(`/painel/cortes/${owned.source.id}`);
  revalidatePath(`/painel/editor/${id}`);
  return { saved: true };
}
