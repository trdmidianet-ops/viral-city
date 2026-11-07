"use server";

import { revalidatePath } from "next/cache";
import { grantCoins, isAdminUser } from "@/lib/admin";
import { requireUserId } from "@/lib/auth";

export type GrantState = { error?: string; ok?: string };

/** Admin: dá ou tira CityCoins de um usuário. */
export async function grantCoinsAction(_: GrantState, form: FormData): Promise<GrantState> {
  if (!(await isAdminUser(await requireUserId()))) return { error: "Só administradores." };
  const userId = String(form.get("user") ?? "").slice(0, 64);
  const amount = Math.trunc(Number(String(form.get("amount") ?? "").replace(/[^\d-]/g, "")));
  const reason = String(form.get("reason") ?? "").trim().slice(0, 120);
  if (!userId) return { error: "Usuário inválido." };
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    return { error: "Digite um valor entre -1.000.000 e 1.000.000 (diferente de zero)." };
  }
  try {
    const balance = await grantCoins(userId, amount, reason);
    revalidatePath("/painel/admin");
    return { ok: `Feito. Novo saldo: ${balance.toLocaleString("pt-BR")} CityCoins.` };
  } catch (err) {
    const negative = err instanceof Error && err.message.includes("saldo_insuficiente");
    return { error: negative ? "O saldo não pode ficar negativo." : "Não deu certo, tente de novo." };
  }
}
