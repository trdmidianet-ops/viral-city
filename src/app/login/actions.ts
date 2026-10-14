"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) redirect("/painel");

  const { error } = await supabase.auth.signInWithPassword(credentials(formData));
  if (error) return { error: "E-mail ou senha inválidos." };
  redirect("/painel");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  if (!supabase) redirect("/painel");

  const { email, password } = credentials(formData);
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Conta criada! Confirme pelo link enviado ao seu e-mail." };
  redirect("/painel");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
