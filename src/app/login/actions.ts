"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/auth-config";
import { auth } from "@/lib/better-auth";
import { safeNext } from "@/lib/gate";
import { isDbConfigured } from "@/lib/db";
import { applyReferral } from "@/lib/referrals";

export type AuthState = { error?: string; message?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200),
    password: String(formData.get("password") ?? "").slice(0, 200),
    next: safeNext(formData.get("next")),
  };
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = credentials(formData);
  if (!isAuthConfigured()) redirect(next);
  try {
    await auth().api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (err) {
    if (err instanceof APIError) return { error: "E-mail ou senha inválidos." };
    console.error("[login]", err);
    return { error: "Não foi possível entrar agora. Tente de novo em instantes." };
  }
  redirect(next);
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password, next } = credentials(formData);
  if (!isAuthConfigured()) redirect(next);
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  const coupon = String(formData.get("coupon") ?? "").trim().slice(0, 40);
  try {
    const res = await auth().api.signUpEmail({ body: { email, password, name: email.split("@")[0] }, headers: await headers() });
    // cupom de indicação: bônus de cadastro já na criação da conta (erro aqui não impede o cadastro)
    if (coupon && isDbConfigured() && res?.user?.id) await applyReferral(res.user.id, coupon).catch(() => null);
  } catch (err) {
    if (err instanceof APIError) {
      const msg = String(err.body?.message ?? "");
      if (/exist/i.test(msg)) return { error: "Já existe uma conta com esse e-mail. Entre com ela." };
      if (/email/i.test(msg)) return { error: "Digite um e-mail válido." };
      return { error: "Não foi possível criar a conta. Confira os dados." };
    }
    console.error("[cadastro]", err);
    return { error: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }
  redirect(next);
}

export async function signOut() {
  if (isAuthConfigured()) await auth().api.signOut({ headers: await headers() });
  redirect("/");
}
