"use server";

import { redirect } from "next/navigation";
import { currentUser, requireUserId } from "@/lib/auth";
import { isCurrency, parseAmount, purchaseError, quote } from "@/lib/coins/pricing";
import { createCoinCheckout, isStripeConfigured } from "@/lib/coins/stripe";
import { usdRates } from "@/lib/coins/wallet";
import { isDbConfigured } from "@/lib/db";

export type BuyState = { error?: string };

/** Valor livre na moeda escolhida → cotação travada → checkout da Stripe. */
export async function buyCoinsAction(_: BuyState, form: FormData): Promise<BuyState> {
  const userId = await requireUserId();
  if (!isDbConfigured() || !isStripeConfigured()) return { error: "Pagamentos ainda não configurados." };

  const currency = String(form.get("currency") ?? "");
  const amountMinor = parseAmount(String(form.get("amount") ?? "").slice(0, 20));
  if (!isCurrency(currency) || !Number.isFinite(amountMinor)) return { error: "Digite um valor válido." };

  let url: string;
  try {
    const q = quote(amountMinor, currency, await usdRates());
    const invalid = purchaseError(q);
    if (invalid) return { error: invalid };
    url = await createCoinCheckout(userId, (await currentUser())?.email ?? undefined, q);
  } catch (err) {
    console.error("[carteira] checkout", err);
    return { error: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." };
  }
  redirect(url);
}
