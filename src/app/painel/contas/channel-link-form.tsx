"use client";

import { Check, Copy, Link2 } from "lucide-react";
import { useActionState, useState } from "react";
import { findChannelAction, verifyChannelAction, type ChannelLinkState } from "./actions";

/**
 * Ligar o canal do YouTube pelo link, sem login do Google: 1) cola o link, 2) coloca o código
 * na descrição do canal, 3) verifica. Depois disso o código pode sair da descrição.
 */
export function ChannelLinkForm() {
  const [found, find, finding] = useActionState<ChannelLinkState, FormData>(findChannelAction, {});
  const [checked, verify, verifying] = useActionState<ChannelLinkState, FormData>(verifyChannelAction, {});
  const [copied, setCopied] = useState(false);
  const pending = found.pending;

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* o código continua na tela para copiar à mão */
    }
  }

  const field = "w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

  return (
    <div className="mt-4 rounded-xl border border-line bg-night/40 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Link2 size={16} className="text-cyan" /> Ligar canal pelo link
        <span className="rounded-full bg-cyan/10 px-2 py-0.5 text-[11px] font-normal text-cyan">sem login do Google</span>
      </p>
      <p className="mt-1 text-xs text-muted">Para cortar vídeos do seu canal. Postar continua sendo pela página Postar.</p>

      <form action={find} className="mt-3 flex flex-wrap gap-2">
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Link do canal</span>
          <input name="channel" required placeholder="youtube.com/@seucanal" className={field} />
        </label>
        <button disabled={finding} className="btn-sunset min-h-11 rounded-full px-5 text-sm font-bold text-night disabled:opacity-60">
          {finding ? "Buscando…" : "Buscar canal"}
        </button>
      </form>
      {found.error && <p className="mt-2 text-sm text-pink">{found.error}</p>}

      {pending && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="flex items-center gap-3">
            {pending.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- avatar vem do CDN do YouTube
              <img src={pending.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : null}
            <p className="font-medium">{pending.title}</p>
          </div>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>
              Copie o código:
              <span className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-night px-2 py-1 font-mono text-sm text-sun">{pending.code}</code>
                <button
                  type="button"
                  onClick={() => copy(pending.code)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-ink hover:bg-white/5"
                >
                  {copied ? <Check size={14} className="text-cyan" /> : <Copy size={14} />} {copied ? "Copiado" : "Copiar"}
                </button>
              </span>
            </li>
            <li>
              No{" "}
              <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="text-cyan underline-offset-4 hover:underline">
                YouTube Studio
              </a>
              , vá em Personalização › Informações básicas e cole o código em qualquer lugar da descrição. Publique.
            </li>
            <li>Volte aqui e toque em Verificar. Depois, pode tirar o código da descrição.</li>
          </ol>
          <form action={verify}>
            <input type="hidden" name="channelId" value={pending.channelId} />
            <button disabled={verifying} className="btn-sunset min-h-11 rounded-full px-5 text-sm font-bold text-night disabled:opacity-60">
              {verifying ? "Verificando…" : "Verificar"}
            </button>
          </form>
          {checked.error && <p className="text-sm text-pink">{checked.error}</p>}
        </div>
      )}
    </div>
  );
}
