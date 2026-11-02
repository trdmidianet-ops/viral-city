import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { isGoogleLoginConfigured } from "@/lib/auth-config";
import { authDb } from "@/lib/db";
import { appUrl } from "@/lib/oauth/providers";

/**
 * Login próprio (Better Auth): usuários e sessões ficam no nosso Postgres, sem provedor
 * externo de login. E-mail e senha sempre; Google quando GOOGLE_CLIENT_ID estiver definido.
 */
function create() {
  return betterAuth({
    appName: "Viral City",
    baseURL: appUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: authDb(),
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
    socialProviders: isGoogleLoginConfigured()
      ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
      : {},
    // grava os cookies de sessão quando o login acontece numa server action
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof create> | null = null;

/** Criado na primeira vez que é usado (precisa das variáveis de ambiente). */
export function auth() {
  instance ??= create();
  return instance;
}
