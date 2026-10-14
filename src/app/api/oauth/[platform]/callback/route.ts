import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { upsertAccount } from "@/lib/accounts/store";
import { OAuthError, appUrl, getProvider, redirectUri } from "@/lib/oauth/providers";

function back(query: Record<string, string>) {
  return NextResponse.redirect(`${appUrl()}/painel/contas?${new URLSearchParams(query)}`);
}

function sameState(a: string | undefined, b: string | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const provider = getProvider(platform);
  if (!provider) return NextResponse.json({ error: "Plataforma inválida" }, { status: 404 });

  const url = req.nextUrl;
  const cookieName = `oauth_state_${platform}`;
  const done = (query: Record<string, string>) => {
    const res = back(query);
    res.cookies.delete({ name: cookieName, path: "/api/oauth" });
    return res;
  };

  if (url.searchParams.get("error")) {
    return done({ erro: `${provider.label}: autorização cancelada ou negada.` });
  }
  if (!sameState(req.cookies.get(cookieName)?.value, url.searchParams.get("state"))) {
    return done({ erro: "Sessão de conexão expirou. Tente conectar de novo." });
  }
  const code = url.searchParams.get("code");
  if (!code) return done({ erro: `${provider.label} não devolveu o código de autorização.` });

  try {
    const { profile, tokens } = await provider.exchange({ code, redirectUri: redirectUri(provider) });
    const account = await upsertAccount({ platform: provider.platform, ...profile }, tokens);
    return done({ conectado: account.name });
  } catch (err) {
    const message = err instanceof OAuthError ? err.message : "Falha inesperada ao conectar a conta.";
    if (!(err instanceof OAuthError)) console.error("[oauth]", platform, err);
    return done({ erro: message });
  }
}
