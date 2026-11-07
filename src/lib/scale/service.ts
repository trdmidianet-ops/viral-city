import { getOwnedAccount } from "@/lib/accounts/store";
import { isAdminUser } from "@/lib/admin";
import { MAX_VARIATIONS, costForVariations, formatCoins } from "@/lib/coins/pricing";
import { getBalance } from "@/lib/coins/wallet";
import { getOwnedClip } from "@/lib/clips/repo";
import { canUseLocalFiles, uploadPath } from "@/lib/clips/local-files";
import { createReadyVideo } from "@/lib/videos/repo";
import { cleanHeadlines } from "./headlines";
import { createScaleJob, getOwnedScaleJob, getOwnedVariation, listVariations, updateVariation, type ScaleJob } from "./repo";
import { isTemplateId } from "./templates";

/** Regras de criar e aprovar lotes do Scale, usadas pelo painel e pelo Claude (MCP). */

const UUID = /^[0-9a-f-]{36}$/i;

export type ScaleInput = {
  base: "clip" | "file";
  clipId?: string;
  uploadId?: string;
  uploadName?: string;
  templates: string[];
  topic: string;
  headlines: string | string[];
  useAi: boolean;
  count: number;
  accountId?: string;
  handle?: string;
  profileName?: string;
  verified?: boolean;
  cta?: string;
};

export async function createScale(userId: string, input: ScaleInput): Promise<{ job: ScaleJob } | { error: string }> {
  const count = Math.trunc(Number(input.count));
  if (!Number.isFinite(count) || count < 1 || count > MAX_VARIATIONS) return { error: `Escolha de 1 a ${MAX_VARIATIONS} versões.` };
  const cost = costForVariations(count);
  if (!(await isAdminUser(userId)) && (await getBalance(userId)) < cost) {
    return { error: `Saldo insuficiente: ${count} versões custam ${formatCoins(cost)} CityCoins. Recarregue na Carteira.` };
  }

  const templates = [...new Set(input.templates.map(String))].filter(isTemplateId);
  if (!templates.length) return { error: "Escolha pelo menos um template." };

  const topic = String(input.topic ?? "").trim().slice(0, 200);
  const headlines = cleanHeadlines(input.headlines ?? "", MAX_VARIATIONS);
  if (!headlines.length && !input.useAi) return { error: "Escreva pelo menos uma manchete ou deixe a IA criar." };
  if (input.useAi && !topic && !headlines.length) return { error: "Conte o assunto do vídeo para a IA escrever as manchetes." };

  const accountId = (input.accountId ?? "").trim();
  const account = accountId && UUID.test(accountId) ? await getOwnedAccount(userId, accountId) : null;
  if (accountId && !account) return { error: "Conta inválida." };
  const rawHandle = String(input.handle ?? "").trim().slice(0, 40).replace(/^@+/, "").replace(/\s+/g, "");

  const common = {
    account_id: account?.id ?? null,
    topic,
    templates,
    headlines,
    use_ai: input.useAi,
    count,
    handle: rawHandle ? `@${rawHandle}` : "",
    profile_name: String(input.profileName ?? account?.name ?? "").trim().slice(0, 40),
    // a foto vem só da conta conectada (nunca de um link digitado)
    avatar_url: account?.avatarUrl && /^https:\/\//i.test(account.avatarUrl) ? account.avatarUrl : null,
    verified: input.verified ?? true,
    cta: String(input.cta ?? "").trim().slice(0, 90),
  };

  if (input.base === "clip") {
    const clipId = String(input.clipId ?? "");
    const owned = UUID.test(clipId) ? await getOwnedClip(userId, clipId) : null;
    if (!owned?.clip.local_path) return { error: "Escolha um corte já renderizado." };
    const job = await createScaleJob(userId, { ...common, base_kind: "clip", clip_id: clipId, base_path: null, base_name: owned.clip.hook || owned.source.title });
    return { job };
  }
  if (input.base === "file") {
    if (!canUseLocalFiles()) return { error: "Envio de arquivo só funciona no painel aberto no seu PC." };
    const file = uploadPath(String(input.uploadId ?? ""));
    if (!file) return { error: "Envie o clipe antes de gerar as versões." };
    const job = await createScaleJob(userId, { ...common, base_kind: "file", clip_id: null, base_path: file, base_name: String(input.uploadName ?? "").slice(0, 200) });
    return { job };
  }
  return { error: "Escolha o vídeo base." };
}

/** Aprova uma versão pronta: ela vira um vídeo da Agenda. Devolve o ID do lote, ou null. */
export async function approveVariation(userId: string, variationId: string): Promise<string | null> {
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

/** Aprova todas as versões prontas de um lote. Devolve quantas foram aprovadas (null se o lote não é do usuário). */
export async function approveAllVariations(userId: string, jobId: string): Promise<number | null> {
  if (!(await getOwnedScaleJob(userId, jobId))) return null;
  let n = 0;
  for (const v of await listVariations(jobId)) {
    if (v.status === "rendered" && (await approveVariation(userId, v.id))) n++;
  }
  return n;
}
