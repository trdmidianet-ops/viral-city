/**
 * Administradores da Viral City: usam tudo sem gastar CityCoins e veem o painel de admin.
 * Lista fixa aqui + ADMIN_EMAILS (separados por vírgula) nas variáveis de ambiente.
 */
const DEFAULT_ADMINS = ["rafhael.mourasaraiva@gmail.com"];

export function adminEmails(): string[] {
  const extra = (process.env.ADMIN_EMAILS ?? "").split(",");
  return [...new Set([...DEFAULT_ADMINS, ...extra].map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

export const isAdminEmail = (email: string | null | undefined) => Boolean(email && adminEmails().includes(email.trim().toLowerCase()));

export type AdminCheckRow = { email: string; google: boolean; password: boolean };

/** E-mail do usuário e como ele entra (Google e/ou senha). */
export const ADMIN_CHECK_SQL = `select u."email" as email,
    exists (select 1 from "account" a where a."userId" = u."id" and a."providerId" = 'google') as google,
    exists (select 1 from "account" a where a."userId" = u."id" and a."providerId" = 'credential') as password
  from "user" u where u."id" = $1`;

export const adminFromRow = (row: AdminCheckRow | null | undefined) => Boolean(row && row.google && !row.password && isAdminEmail(row.email));
