"use server";

import { revalidatePath } from "next/cache";
import { createApiToken, deleteApiToken } from "@/lib/api-tokens";
import { requireUserId } from "@/lib/auth";
import { isDbConfigured } from "@/lib/db";

export type TokenState = { error?: string; token?: string };

export async function createTokenAction(_: TokenState, form: FormData): Promise<TokenState> {
  if (!isDbConfigured()) return { error: "Banco não configurado." };
  const res = await createApiToken(await requireUserId(), String(form.get("name") ?? "").slice(0, 40));
  if ("error" in res) return { error: res.error };
  revalidatePath("/painel/configuracoes");
  return { token: res.token };
}

export async function deleteTokenAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  if (!isDbConfigured() || !/^[0-9a-f-]{36}$/i.test(id)) return;
  await deleteApiToken(await requireUserId(), id);
  revalidatePath("/painel/configuracoes");
}
