/**
 * Senha de acesso ao painel enquanto o login do Supabase não está ativo.
 * Roda no middleware (Edge), por isso usa Web Crypto.
 */
export const GATE_COOKIE = "vc_gate";

export function gatePassword(): string {
  return process.env.APP_PASSWORD ?? "";
}

export async function gateToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`viral-city-gate:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Só aceita destinos internos do painel (evita redirecionamento aberto). */
export function safeNext(next: unknown): string {
  return typeof next === "string" && /^\/painel(\/[\w-]*)*$/.test(next) ? next : "/painel";
}

/** Confere o acesso dentro de uma rota (para rotas que não passam pelo middleware). */
export async function hasAccess(cookieValue: string | undefined, loggedIn: () => Promise<boolean>): Promise<boolean> {
  const { isSupabaseConfigured } = await import("@/lib/supabase/config");
  if (isSupabaseConfigured) return loggedIn();
  const password = gatePassword();
  if (!password) return true;
  return cookieValue === (await gateToken(password));
}
