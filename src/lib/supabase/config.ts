export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Sem as variáveis do Supabase o app roda em "modo demo" (painel aberto, sem login). */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
