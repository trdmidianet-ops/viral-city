import { Bot, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { listApiTokens } from "@/lib/api-tokens";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { appUrl } from "@/lib/oauth/providers";
import { deleteTokenAction } from "./actions";
import { TokenForm } from "./token-form";

export const dynamic = "force-dynamic";

const examples = [
  "Pega meu corte com maior nota e cria 10 versões com o template Post de página.",
  "Como estão os lotes do Scale? Aprova todas as versões prontas do último.",
  "Quanto tenho de CityCoins e o que está na fila da Agenda?",
];

export default async function ConfiguracoesPage() {
  const userId = await requireUserId();
  const tokens = isDbConfigured() ? await listApiTokens(userId) : [];

  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências da sua conta e integrações." />

      <section className="glass rounded-2xl p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-semibold">
          <Bot size={18} className="text-pink" /> Claude (MCP)
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Controle a Viral City conversando com o Claude: ver cortes, criar lotes do Scale, acompanhar e aprovar para a Agenda, sem abrir o painel.
          Crie uma chave e cole no Claude Code, no claude.ai ou no Claude Desktop.
        </p>

        <div className="mt-5">{isDbConfigured() ? <TokenForm appUrl={appUrl()} /> : <p className="text-sm text-muted">Precisa do banco de dados configurado.</p>}</div>

        {tokens.length > 0 && (
          <ul className="mt-6 divide-y divide-line rounded-xl border border-line">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{t.name}</span>
                <code className="font-mono text-xs text-muted">vc_…{t.last4}</code>
                <span className="text-xs text-muted">
                  criada em {new Date(t.created_at).toLocaleDateString("pt-BR")}
                  {t.last_used_at ? ` · usada em ${new Date(t.last_used_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : " · ainda não usada"}
                </span>
                <form action={deleteTokenAction} className="ml-auto">
                  <input type="hidden" name="id" value={t.id} />
                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-white/5 hover:text-pink">
                    <Trash2 size={13} /> Apagar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 rounded-xl bg-night/50 p-4 text-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted">Peça assim</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            {examples.map((e) => (
              <li key={e}>“{e}”</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
