import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { appUrl, getProvider, isConfigured, redirectUri } from "@/lib/oauth/providers";

export async function GET(_req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  const provider = getProvider(platform);
  if (!provider) return NextResponse.json({ error: "Plataforma inválida" }, { status: 404 });
  if (!isConfigured(provider)) {
    return NextResponse.redirect(`${appUrl()}/painel/contas?erro=${encodeURIComponent(`${provider.label} ainda não configurado.`)}`);
  }

  const state = randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(provider.authUrl({ state, redirectUri: redirectUri(provider) }));
  res.cookies.set(`oauth_state_${platform}`, state, {
    httpOnly: true,
    secure: appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/api/oauth",
    maxAge: 600,
  });
  return res;
}
