import { listAccounts } from "@/lib/accounts/store";
import { isAdminUser } from "@/lib/admin";
import { listRenderedClips } from "@/lib/clips/repo";
import { COINS_PER_VARIATION, MAX_VARIATIONS } from "@/lib/coins/pricing";
import { getBalance } from "@/lib/coins/wallet";
import { getOwnedScaleJob, listScaleJobs, listVariations } from "@/lib/scale/repo";
import { approveAllVariations, approveVariation, createScale } from "@/lib/scale/service";
import { TEMPLATES } from "@/lib/scale/templates";
import { listSlotsFor } from "@/lib/schedule/repo";
import { listVideos } from "@/lib/videos/repo";

/**
 * Ferramentas que o Claude pode usar na Viral City (MCP). Cada uma recebe o usuário
 * dono da chave e devolve dados simples, que viram JSON para o Claude ler.
 */

type Args = Record<string, unknown>;
export type Tool = {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  run(userId: string, args: Args): Promise<unknown>;
};

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const UUID = /^[0-9a-f-]{36}$/i;

export class ToolError extends Error {}

export const TOOLS: Tool[] = [
  {
    name: "ver_saldo",
    description: "Mostra o saldo de CityCoins do usuário (1 CityCoin = US$ 0,01) e quanto custa cada versão do Scale.",
    inputSchema: { type: "object", properties: {} },
    async run(userId) {
      const admin = await isAdminUser(userId);
      return { citycoins: await getBalance(userId), administrador_sem_cobranca: admin, custo_por_versao: COINS_PER_VARIATION };
    },
  },
  {
    name: "listar_contas",
    description: "Lista as contas conectadas (YouTube, Instagram, TikTok), com o id usado como destino das postagens.",
    inputSchema: { type: "object", properties: {} },
    async run(userId) {
      return (await listAccounts(userId)).map((a) => ({ id: a.id, rede: a.platform, nome: a.name, arroba: a.handle ?? null }));
    },
  },
  {
    name: "listar_cortes",
    description: "Lista os cortes já renderizados (base para o Scale), do mais novo ao mais antigo, com nota viral.",
    inputSchema: { type: "object", properties: { limite: { type: "number", description: "Quantos cortes (padrão 20, máx. 60)." } } },
    async run(userId, args) {
      const limit = Math.min(60, Math.max(1, Number(args.limite) || 20));
      return (await listRenderedClips(userId, limit)).map((c) => ({
        id: c.id,
        gancho: c.hook,
        video_longo: c.source_title,
        nota_viral: c.score,
        duracao_s: Math.round(Number(c.end_seconds) - Number(c.start_seconds)),
        status: c.status,
      }));
    },
  },
  {
    name: "listar_templates",
    description: "Lista os templates de layout disponíveis para o Scale.",
    inputSchema: { type: "object", properties: {} },
    async run() {
      return TEMPLATES.map((t) => ({ id: t.id, nome: t.name, descricao: t.description }));
    },
  },
  {
    name: "criar_scale",
    description:
      "Cria um lote do Scale: um corte vira várias versões com templates e manchetes diferentes. O worker no PC do usuário renderiza. Custa 2 CityCoins por versão (as que falham voltam).",
    inputSchema: {
      type: "object",
      properties: {
        corte_id: { type: "string", description: "ID do corte base (veja listar_cortes)." },
        quantidade: { type: "number", description: `Quantas versões (1 a ${MAX_VARIATIONS}).` },
        templates: { type: "array", items: { type: "string" }, description: "IDs dos templates (veja listar_templates). Padrão: perfil." },
        manchetes: { type: "array", items: { type: "string" }, description: "Manchetes que vão no vídeo (opcional se usar a IA)." },
        assunto: { type: "string", description: "Assunto do vídeo, usado pela IA para escrever manchetes." },
        ia_escreve_manchetes: { type: "boolean", description: "Deixar a IA completar as manchetes (padrão: true)." },
        conta_id: { type: "string", description: "Conta de destino (veja listar_contas). Define também a foto e o nome no template." },
        arroba: { type: "string", description: "@ mostrado no vídeo." },
        chamada: { type: "string", description: "Texto de baixo do template 'perfil-cta'." },
      },
      required: ["corte_id", "quantidade"],
    },
    async run(userId, args) {
      const result = await createScale(userId, {
        base: "clip",
        clipId: str(args.corte_id, 40),
        count: Number(args.quantidade),
        templates: Array.isArray(args.templates) && args.templates.length ? args.templates.map(String) : ["perfil"],
        headlines: Array.isArray(args.manchetes) ? args.manchetes.map(String) : [],
        topic: str(args.assunto),
        useAi: args.ia_escreve_manchetes !== false,
        accountId: str(args.conta_id, 40),
        handle: str(args.arroba, 40),
        cta: str(args.chamada, 90),
      });
      if ("error" in result) throw new ToolError(result.error);
      return { lote_id: result.job.id, versoes: result.job.count, status: "na fila (o worker no PC renderiza)" };
    },
  },
  {
    name: "listar_lotes",
    description: "Lista os lotes do Scale com o status de cada um.",
    inputSchema: { type: "object", properties: {} },
    async run(userId) {
      return (await listScaleJobs(userId, 20)).map((j) => ({
        id: j.id,
        assunto: j.topic || j.base_name,
        versoes: j.count,
        status: j.status,
        progresso: j.progress,
        erro: j.error,
        criado_em: j.created_at,
      }));
    },
  },
  {
    name: "ver_lote",
    description: "Mostra as versões de um lote do Scale (template, manchete e status).",
    inputSchema: { type: "object", properties: { lote_id: { type: "string" } }, required: ["lote_id"] },
    async run(userId, args) {
      const id = str(args.lote_id, 40);
      const job = UUID.test(id) ? await getOwnedScaleJob(userId, id) : null;
      if (!job) throw new ToolError("Lote não encontrado.");
      const versions = await listVariations(id);
      return {
        status: job.status,
        versoes: versions.map((v) => ({ id: v.id, numero: v.position, template: v.template, manchete: v.headline, status: v.status, erro: v.error })),
      };
    },
  },
  {
    name: "aprovar_versoes",
    description: "Aprova versões prontas para a Agenda postar nos próximos horários. Passe versao_ids, ou lote_id para aprovar todas as prontas do lote.",
    inputSchema: {
      type: "object",
      properties: { lote_id: { type: "string" }, versao_ids: { type: "array", items: { type: "string" } } },
    },
    async run(userId, args) {
      const jobId = str(args.lote_id, 40);
      if (jobId) {
        const n = UUID.test(jobId) ? await approveAllVariations(userId, jobId) : null;
        if (n === null) throw new ToolError("Lote não encontrado.");
        return { aprovadas: n };
      }
      const ids = Array.isArray(args.versao_ids) ? args.versao_ids.map(String).filter((x) => UUID.test(x)).slice(0, 30) : [];
      if (!ids.length) throw new ToolError("Passe lote_id ou versao_ids.");
      let n = 0;
      for (const id of ids) if (await approveVariation(userId, id)) n++;
      return { aprovadas: n, ignoradas: ids.length - n };
    },
  },
  {
    name: "ver_agenda",
    description: "Mostra os horários de postagem por conta e os vídeos aprovados esperando na fila.",
    inputSchema: { type: "object", properties: {} },
    async run(userId) {
      const [slots, videos, accounts] = await Promise.all([listSlotsFor(userId), listVideos(userId, 50), listAccounts(userId)]);
      const name = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "qualquer conta";
      const days = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
      return {
        horarios: slots.map((s) => ({ conta: name(s.account_id), dia: days[s.weekday], hora: s.post_time.slice(0, 5) })),
        fila: videos.filter((v) => v.status === "ready").map((v) => ({ titulo: v.title, conta: name(v.account_id) })),
        publicados_recentes: videos
          .filter((v) => v.status === "published")
          .slice(0, 10)
          .map((v) => ({ titulo: v.title, conta: name(v.account_id), em: v.published_at })),
      };
    },
  },
];
