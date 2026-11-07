"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { createTokenAction, type TokenState } from "./actions";

function CopyLine({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{label}</p>
      <div className="flex items-start gap-2 rounded-lg bg-night/70 p-2 ring-1 ring-white/5">
        <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-ink/90">{value}</code>
        <button
          type="button"
          aria-label={`Copiar: ${label}`}
          onClick={async () => {
            await navigator.clipboard.writeText(value).catch(() => {});
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          }}
          className="shrink-0 rounded-md p-1 text-muted hover:bg-white/10 hover:text-ink"
        >
          {done ? <Check size={14} className="text-cyan" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export function TokenForm({ appUrl }: { appUrl: string }) {
  const [state, action, pending] = useActionState<TokenState, FormData>(createTokenAction, {});
  const endpoint = `${appUrl}/api/mcp`;

  return (
    <div className="space-y-4">
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input
          name="name"
          maxLength={40}
          placeholder="Nome da chave (ex.: Claude do PC)"
          aria-label="Nome da chave"
          className="w-64 rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink"
        />
        <button disabled={pending} className="btn-sunset flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <KeyRound size={15} /> {pending ? "Criando…" : "Criar chave"}
        </button>
        {state.error && <span className="text-sm text-pink">{state.error}</span>}
      </form>

      {state.token && (
        <div className="space-y-3 rounded-xl border border-sun/40 bg-sun/5 p-4">
          <p className="text-sm text-sun">Copie agora: a chave aparece só desta vez. Quem tiver a chave age na sua conta.</p>
          <CopyLine label="Chave" value={state.token} />
          <CopyLine label="Claude Code (terminal)" value={`claude mcp add --transport http viral-city ${endpoint} --header "Authorization: Bearer ${state.token}"`} />
          <CopyLine label="claude.ai › Configurações › Conectores › Adicionar conector personalizado (URL)" value={`${endpoint}/${state.token}`} />
          <CopyLine
            label="Claude Desktop (claude_desktop_config.json)"
            value={JSON.stringify({ mcpServers: { "viral-city": { command: "npx", args: ["-y", "mcp-remote", endpoint, "--header", `Authorization: Bearer ${state.token}`] } } })}
          />
        </div>
      )}
    </div>
  );
}
