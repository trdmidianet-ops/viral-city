"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { APPLY_MESSAGES, REFERRAL_COOKIE, applyReferral, changeCode } from "@/lib/referrals";

export type CouponState = { error?: string; ok?: string };

/** Aplica o cupom guardado no navegador (link de indicação) e apaga o cookie. */
export async function claimReferralAction(code: string): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const userId = await requireUserId();
  const store = await cookies();
  store.delete(REFERRAL_COOKIE);
  const result = await applyReferral(userId, code);
  if (result === "ok") {
    revalidatePath("/painel", "layout");
    return APPLY_MESSAGES.ok;
  }
  return null;
}

/** "Tenho um cupom" na Carteira. */
export async function applyCouponAction(_: CouponState, form: FormData): Promise<CouponState> {
  if (!isDbConfigured()) return { error: "Banco não configurado." };
  const userId = await requireUserId();
  const result = await applyReferral(userId, String(form.get("coupon") ?? "").slice(0, 40));
  if (result !== "ok") return { error: APPLY_MESSAGES[result] };
  revalidatePath("/painel", "layout");
  return { ok: APPLY_MESSAGES.ok };
}

/** Troca o cupom do indicador. */
export async function changeCodeAction(_: CouponState, form: FormData): Promise<CouponState> {
  if (!isDbConfigured()) return { error: "Banco não configurado." };
  const res = await changeCode(await requireUserId(), String(form.get("code") ?? "").slice(0, 40));
  if (!res.ok) return { error: res.error };
  revalidatePath("/painel/indique");
  return { ok: `Seu cupom agora é ${res.code}.` };
}
