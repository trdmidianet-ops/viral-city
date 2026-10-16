import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Banco da Viral City (tabelas vc_ no Supabase), acessado só pelo servidor/worker
 * com a chave secreta. Não usa o login do Supabase: o painel é protegido por APP_PASSWORD.
 */
let client: SupabaseClient | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function db(): SupabaseClient {
  if (!isDbConfigured()) throw new Error("Banco não configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  client ??= createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Lança erro legível se a consulta falhou. */
export function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}
