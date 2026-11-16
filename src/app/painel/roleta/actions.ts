"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";
import { availableSpins, spinRoulette } from "@/lib/roulette/store";

export type SpinState = { prize: number; balance: number; left: number } | { error: string };

/** Gira a roleta: o sorteio e o crédito acontecem no servidor; a tela só anima o resultado. */
export async function spinAction(): Promise<SpinState> {
  const userId = await requireUserId();
  if (!isDbConfigured()) return { error: "A roleta ainda não está disponível." };
  try {
    const result = await spinRoulette(userId);
    if (!result) return { error: "Você não tem giros disponíveis agora." };
    const { count } = await availableSpins(userId);
    revalidatePath("/painel", "layout");
    return { prize: result.prize, balance: result.balance, left: count };
  } catch (err) {
    console.error("[roleta] giro", err);
    return { error: "Não foi possível girar agora. Seu giro continua guardado: tente de novo em instantes." };
  }
}
