"use client";

import { useActionState } from "react";
import { grantCoinsAction, type GrantState } from "./actions";

const field = "rounded-lg border border-line bg-night/60 px-2.5 py-1.5 text-xs outline-none focus:border-pink";

export function GrantForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<GrantState, FormData>(grantCoinsAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="user" value={userId} />
      <input name="amount" inputMode="numeric" placeholder="+100 ou -50" aria-label="CityCoins" className={`${field} w-24`} />
      <input name="reason" placeholder="Motivo (opcional)" aria-label="Motivo" className={`${field} w-40`} />
      <button disabled={pending} className="rounded-lg border border-sun/40 px-2.5 py-1.5 text-xs text-sun hover:bg-sun/10 disabled:opacity-50">
        {pending ? "…" : "Aplicar"}
      </button>
      {state.error && <span className="text-xs text-pink">{state.error}</span>}
      {state.ok && <span className="text-xs text-cyan">{state.ok}</span>}
    </form>
  );
}
