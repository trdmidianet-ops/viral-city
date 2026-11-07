"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { deleteScaleJob, getOwnedScaleJob, getOwnedVariation, updateScaleJob, updateVariation } from "@/lib/scale/repo";
import { approveAllVariations, approveVariation, createScale } from "@/lib/scale/service";
import { isTemplateId } from "@/lib/scale/templates";

export type ScaleFormState = { error?: string };

const UUID = /^[0-9a-f-]{36}$/i;
const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function createScaleAction(_: ScaleFormState, form: FormData): Promise<ScaleFormState> {
  if (!isDbConfigured()) return { error: "Banco de dados não configurado." };
  const result = await createScale(await requireUserId(), {
    base: str(form, "base", 10) as "clip" | "file",
    clipId: str(form, "clip", 40),
    uploadId: str(form, "uploadId", 60),
    uploadName: str(form, "uploadName", 200),
    templates: form.getAll("templates").map(String),
    topic: str(form, "topic", 200),
    headlines: str(form, "headlines", 4000),
    useAi: form.get("use_ai") === "on",
    count: Number(str(form, "count", 3)),
    accountId: str(form, "account", 40),
    handle: str(form, "handle", 40),
    profileName: str(form, "profile_name", 40),
    verified: form.get("verified") === "on",
    cta: str(form, "cta", 90),
  });
  if ("error" in result) return { error: result.error };
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

/** Aprova a versão: ela vira um vídeo pronto e a Agenda posta no próximo horário. */
export async function approveVariationAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  const jobId = await approveVariation(await requireUserId(), id);
  if (jobId) revalidatePath(`/painel/scale/${jobId}`);
}

/** Aprova de uma vez todas as versões prontas do job. */
export async function approveAllAction(form: FormData) {
  const id = str(form, "id", 40);
  if (!isDbConfigured() || !UUID.test(id)) return;
  if ((await approveAllVariations(await requireUserId(), id)) !== null) revalidatePath(`/painel/scale/${id}`);
}
