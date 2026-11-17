import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { isGoogleLoginConfigured } from "@/lib/auth-config";
import { authDb } from "@/lib/db";
import { appUrl } from "@/lib/oauth/providers";
import { sendPasswordResetEmail } from "@/lib/email";

/**
 * Login próprio (Better Auth): usuários e sessões ficam no nosso Postgres, sem provedor
 * externo de login. E-mail e senha sempre; Google quando GOOGLE_CLIENT_ID estiver definido.
 */
/** Endereço de retorno do login com Google: GOOGLE_LOGIN_REDIRECT_URI, ou o cadastrado no Google em produção. */
function googleLoginRedirect(): string | undefined {
  if (process.env.GOOGLE_LOGIN_REDIRECT_URI) return process.env.GOOGLE_LOGIN_REDIRECT_URI;
  return process.env.VERCEL_ENV === "production" ? "https://viral-city.vercel.app/api/auth/callback/google" : undefined;
}

function create() {
  return betterAuth({
    appName: "Viral City",
    baseURL: appUrl(),
    secret: process.env.BETTER_AUTH_SECRET,
    database: authDb(),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        await sendPasswordResetEmail(user.email, url);
      },
    },
    socialProviders: isGoogleLoginConfigured()
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            // O login pede só nome, e-mail e foto. Sem isto, o Google soma as permissões do YouTube
            // que a pessoa já deu ao conectar um canal, e o login passa a mostrar a tela
            // "O Google não verificou este app" a cada entrada.
            includeGrantedScopes: false,
            // Em produção, o Google devolve sempre para o endereço de retorno que está cadastrado
            // no Google Cloud (o antigo, da Vercel); o next.config.ts encaminha de lá para o domínio
            // oficial, onde está o cookie do login. Assim o login funciona seja qual for o APP_URL.
            redirectURI: googleLoginRedirect(),
          },
        }
      : {},
    // Se o login com Google falhar, volta para a tela de login com o aviso (o padrão em produção
    // era mandar para a página inicial, sem explicar nada)
    onAPIError: { errorURL: "/login" },
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
