"use client";

import { useActionState } from "react";
import { Gift } from "lucide-react";
import { applyCouponAction, type CouponState } from "../indique/actions";

/** "Tenho um cupom": bônus de cadastro e +10% na primeira recarga. */
export function CouponForm() {
  const [state, action, pending] = useActionState<CouponState, FormData>(applyCouponAction, {});
  if (state.ok) {
    return <p className="mb-6 flex items-center gap-2 rounded-xl border border-sun/40 bg-sun/10 px-4 py-3 text-sm text-sun"><Gift size={18} /> {state.ok}</p>;
  }
  return (
    <form action={action} className="glass mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm">
      <Gift size={18} className="text-sun" />
      <span className="text-muted">Tem um cupom de indicação?</span>
      <input
        name="coupon"
        maxLength={20}
        placeholder="TORRES10"
        aria-label="Cupom"
        className="w-36 rounded-lg border border-line bg-night/60 px-3 py-1.5 font-mono uppercase outline-none focus:border-pink"
      />
      <button disabled={pending} className="rounded-full border border-sun/50 px-4 py-1.5 text-xs text-sun hover:bg-sun/10 disabled:opacity-50">
        {pending ? "Aplicando…" : "Aplicar"}
      </button>
      {state.error && <span className="text-xs text-pink">{state.error}</span>}
    </form>
  );
}
