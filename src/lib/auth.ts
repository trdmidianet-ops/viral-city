import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthConfigured } from "@/lib/auth-config";
import { auth } from "@/lib/better-auth";
import { isDbConfigured } from "@/lib/db";

/** Dono usado no modo demo (sem banco): os dados ficam no arquivo local. */
export const LOCAL_USER = "local";

export type CurrentUser = { id: string; email: string | null };

/** Quem está logado (Better Auth), ou null. No modo demo, o usuário "local". */
export async function currentUser(): Promise<CurrentUser | null> {
  if (isAuthConfigured()) {
    const session = await auth().api.getSession({ headers: await headers() });
    return session ? { id: session.user.id, email: session.user.email } : null;
  }
  // banco sem login não é suportado: cada dado do banco precisa de um dono de verdade
  return isDbConfigured() ? null : { id: LOCAL_USER, email: null };
}

export async function currentUserId(): Promise<string | null> {
  return (await currentUser())?.id ?? null;
}

/** Igual a currentUserId, mas manda para o login quando não há usuário. */
export async function requireUserId(): Promise<string> {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}
