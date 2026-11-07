"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Pencil } from "lucide-react";
import { changeCodeAction, type CouponState } from "./actions";

export function ShareBox({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<CouponState, FormData>(changeCodeAction, {});

  async function copy(what: "code" | "link") {
    await navigator.clipboard.writeText(what === "code" ? code : link).catch(() => {});
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-xl border border-dashed border-sun/50 bg-sun/10 px-5 py-3 font-mono text-2xl font-semibold tracking-widest text-sun">{code}</span>
        <button type="button" onClick={() => copy("code")} className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:bg-white/5">
          {copied === "code" ? <Check size={15} className="text-cyan" /> : <Copy size={15} />} Copiar cupom
        </button>
        <button type="button" onClick={() => setEditing((v) => !v)} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:text-ink">
          <Pencil size={14} /> Trocar
        </button>
      </div>

      {editing && (
        <form action={action} className="flex flex-wrap items-center gap-2">
          <input
            name="code"
            defaultValue={code}
            maxLength={20}
            aria-label="Novo cupom"
            className="w-48 rounded-lg border border-line bg-night/60 px-3 py-2 font-mono text-sm uppercase outline-none focus:border-pink"
          />
          <button disabled={pending} className="rounded-lg border border-pink/50 px-3 py-2 text-xs hover:bg-pink/10 disabled:opacity-50">
            {pending ? "Salvando…" : "Salvar"}
          </button>
          {state.error && <span className="text-xs text-pink">{state.error}</span>}
          {state.ok && <span className="text-xs text-cyan">{state.ok}</span>}
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-night/60 p-2 pl-4 ring-1 ring-white/5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{link}</span>
        <button type="button" onClick={() => copy("link")} className="btn-sunset flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white">
          {copied === "link" ? <Check size={14} /> : <Copy size={14} />} {copied === "link" ? "Copiado!" : "Copiar link"}
        </button>
      </div>
    </div>
  );
}
