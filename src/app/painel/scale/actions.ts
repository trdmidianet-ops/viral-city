"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOwnedAccount } from "@/lib/accounts/store";
import { isAdminUser } from "@/lib/admin";
import { requireUserId } from "@/lib/auth";
import { MAX_VARIATIONS, costForVariations, formatCoins } from "@/lib/coins/pricing";
import { getBalance } from "@/lib/coins/wallet";
import { getOwnedClip } from "@/lib/clips/repo";
import { canUseLocalFiles, uploadPath } from "@/lib/clips/local-files";
import { isDbConfigured } from "@/lib/db";
import { cleanHeadlines } from "@/lib/scale/headlines";
import {
  createScaleJob,
  deleteScaleJob,
  getOwnedScaleJob,
  getOwnedVariation,
  listVariations,
  updateScaleJob,
  updateVariation,
} from "@/lib/scale/repo";
import { isTemplateId } from "@/lib/scale/templates";
import { createReadyVideo } from "@/lib/videos/repo";

export type ScaleFormState = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function createScaleAction(_: ScaleFormState, form: FormData): Promise<ScaleFormState> {
  if (!isDbConfigured()) return { error: "Banco de dados não configurado." };
  const userId = await requireUserId();

  const count = Math.trunc(Number(str(form, "count", 3)));
  if (!Number.isFinite(count) || count < 1 || count > MAX_VARIATIONS) return { error: `Escolha de 1 a ${MAX_VARIATIONS} versões.` };
  const cost = costForVariations(count);
  if (!(await isAdminUser(userId)) && (await getBalance(userId)) < cost) {
    return { error: `Saldo insuficiente: ${count} versões custam ${formatCoins(cost)} CityCoins. Recarregue na Carteira.` };
  }

  const templates = [...new Set(form.getAll("templates").map(String))].filter(isTemplateId);
  if (!templates.length) return { error: "Escolha pelo menos um template." };

  const topic = str(form, "topic", 200);
  const headlines = cleanHeadlines(str(form, "headlines", 4000), MAX_VARIATIONS);
  const useAi = form.get("use_ai") === "on";
  if (!headlines.length && !useAi) return { error: "Escreva pelo menos uma manchete ou deixe a IA criar." };
  if (useAi && !topic && !headlines.length) return { error: "Conte o assunto do vídeo para a IA escrever as manchetes." };

  const accountId = str(form, "account", 40);
  const account = accountId && UUID.test(accountId) ? await getOwnedAccount(userId, accountId) : null;
  if (accountId && !account) return { error: "Conta inválida." };
  const rawHandle = str(form, "handle", 40).replace(/^@+/, "").replace(/\s+/g, "");
  const handle = rawHandle ? `@${rawHandle}` : "";

  const kind = str(form, "base", 10);
  const common = {
    account_id: accountId || null,
    topic,
    templates,
    headlines,
    use_ai: useAi,
    count,
    handle,
    profile_name: str(form, "profile_name", 40),
    // a foto vem só da conta conectada (nunca de um link digitado)
    avatar_url: account?.avatarUrl && /^https:\/\//i.test(account.avatarUrl) ? account.avatarUrl : null,
    verified: form.get("verified") === "on",
    cta: str(form, "cta", 90),
  };
  if (kind === "clip") {
    const clipId = str(form, "clip", 40);
    const owned = UUID.test(clipId) ? await getOwnedClip(userId, clipId) : null;
    if (!owned?.clip.local_path) return { error: "Escolha um corte já renderizado." };
    await createScaleJob(userId, { ...common, base_kind: "clip", clip_id: clipId, base_path: null, base_name: owned.clip.hook || owned.source.title });
  } else if (kind === "file") {
    if (!canUseLocalFiles()) return { error: "Envio de arquivo só funciona no painel aberto no seu PC." };
    const file = uploadPath(str(form, "uploadId", 60));
    if (!file) return { error: "Envie o clipe antes de gerar as versões." };
    await createScaleJob(userId, { ...common, base_kind: "file", clip_id: null, base_path: file, base_name: str(form, "uploadName", 200) });
  } else {
    return { error: "Escolha o vídeo base." };
  }

  revalidatePath("/painel/scale");
  redirect("/painel/scale?criado=1");
}

export async function deleteScaleAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  await deleteScaleJob(await requireUserId(), id);
  revalidatePath("/painel/scale");
  redirect("/painel/scale");
}

export async function retryScaleAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const job = await getOwnedScaleJob(await requireUserId(), id);
  if (job?.status !== "failed") return;
  await updateScaleJob(id, { status: "queued", error: null, progress: null });
  revalidatePath(`/painel/scale/${id}`);
}

/** Troca a manchete (ou o template) de uma versão e renderiza de novo, sem custo extra. */
export async function updateVariationAction(form: FormData) {
  const id = str(form, "id", 40);
  const headline = str(form, "headline", 90);
  const template = str(form, "template", 20);
  if (!isDbConfigured() || !UUID.test(id) || !isTemplateId(template)) return;
  const owned = await getOwnedVariation(await requireUserId(), id);
  if (!owned || owned.variation.status === "approved" || owned.variation.status === "rendering") return;
  await updateVariation(id, { headline, template, status: "pending" });
  revalidatePath(`/painel/scale/${owned.job.id}`);
}

async function approve(userId: string, variationId: string) {
  const owned = await getOwnedVariation(userId, variationId);
  if (!owned) return null;
  const { variation, job } = owned;
  if (variation.status !== "rendered" || !variation.local_path) return null;
  const title = (variation.headline || job.topic || job.base_name || "Short").slice(0, 90);
  const video = await createReadyVideo(userId, {
    accountId: job.account_id,
    reference: null,
    title,
    description: `${title}\n\n#shorts`,
    localPath: variation.local_path,
    duration: Number(variation.duration_seconds ?? 0),
  });
  await updateVariation(variation.id, { status: "approved", video_id: video.id });
  return job.id;
}

/** Aprova a versão: ela vira um vídeo pronto e a Agenda posta no próximo horário. */
export async function approveVariationAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const jobId = await approve(await requireUserId(), id);
  if (jobId) revalidatePath(`/painel/scale/${jobId}`);
}

/** Aprova de uma vez todas as versões prontas do job. */
export async function approveAllAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const userId = await requireUserId();
  if (!(await getOwnedScaleJob(userId, id))) return;
  for (const v of await listVariations(id)) {
    if (v.status === "rendered") await approve(userId, v.id);
  }
  revalidatePath(`/painel/scale/${id}`);
}
