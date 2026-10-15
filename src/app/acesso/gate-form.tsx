"use client";

import { useActionState } from "react";
import { unlock, type GateState } from "./actions";

export function GateForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<GateState, FormData>(unlock, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        <span className="text-muted">Senha de acesso</span>
        <input
          name="password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-line bg-night/60 px-3 py-2.5 outline-none focus:border-pink"
        />
      </label>
      {state.error && <p className="text-sm text-pink">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-sunset w-full rounded-full py-3 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
