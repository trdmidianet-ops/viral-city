/**
 * Só leitura de variáveis de ambiente (sem banco nem bibliotecas pesadas), para poder ser
 * usado no middleware, que roda na borda (Edge).
 */

/** Login de verdade ligado: banco + segredo do Better Auth configurados. */
export const isAuthConfigured = () => Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);

/** "Entrar com Google" disponível (o mesmo cliente OAuth do YouTube serve). */
export const isGoogleLoginConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
