"use client";

import { useActionState, useEffect, useRef } from "react";
import { Wand2 } from "lucide-react";
import { voices } from "@/lib/video/script";
import { createVideoAction, type GenState } from "./actions";

type Props = {
  defaults: { title: string; script: string; description: string };
  reference: { id: string; title: string; channel: string; niche: string } | null;
  accounts: { id: string; name: string }[];
};

const field = "mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 text-sm outline-none focus:border-pink";

export function GeneratorForm({ defaults, reference, accounts }: Props) {
  const [state, action, pending] = useActionState<GenState, FormData>(createVideoAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="glass space-y-4 rounded-2xl p-5 sm:p-6">
      {reference && (
        <div className="rounded-xl border border-line bg-night/40 p-3 text-xs text-muted">
          Referência: <span className="text-ink">{reference.title}</span> · {reference.channel}
          <input type="hidden" name="ref" value={reference.id} />
          <input type="hidden" name="refTitle" value={reference.title} />
          <input type="hidden" name="refChannel" value={reference.channel} />
          <input type="hidden" name="refNiche" value={reference.niche} />
        </div>
      )}

      <label className="block text-sm">
        <span className="text-muted">Título do novo vídeo (aparece no topo e no YouTube)</span>
        <input name="title" required maxLength={100} defaultValue={defaults.title} className={field} />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Roteiro da narração (complete os trechos entre colchetes)</span>
        <textarea name="script" required rows={7} maxLength={1500} defaultValue={defaults.script} className={`${field} leading-relaxed`} />
      </label>

      <label className="block text-sm">
        <span className="text-muted">Descrição no YouTube (opcional)</span>
        <textarea name="description" rows={2} maxLength={4000} defaultValue={defaults.description} className={field} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted">Voz</span>
          <select name="voice" defaultValue={voices[0].id} className={field}>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-muted">Postar em</span>
          <select name="account" defaultValue="" className={field}>
            <option value="">Qualquer canal (o próximo horário livre)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.error && <p className="text-sm text-pink">{state.error}</p>}
      {state.ok && <p className="text-sm text-cyan">Vídeo na fila! O worker no seu PC vai gerá-lo em instantes.</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-sunset flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-8"
      >
        <Wand2 size={18} /> {pending ? "Enviando…" : "Gerar vídeo"}
      </button>
    </form>
  );
}
