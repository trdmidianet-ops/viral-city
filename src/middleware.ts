import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthConfigured } from "@/lib/auth-config";
import { GATE_COOKIE, gatePassword, gateToken } from "@/lib/gate";

// /api/uploads fica fora do middleware (ele limitaria o corpo a 10 MB); a rota confere o acesso sozinha.
const PROTECTED = ["/painel", "/api/oauth", "/api/clips", "/api/scale", "/api/sources"];
const isProtected = (pathname: string) => PROTECTED.some((p) => pathname.startsWith(p));

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!isProtected(pathname)) return NextResponse.next();
    
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) return NextResponse.next();

  if (isAuthConfigured()) {
    // Aqui só olhamos se existe o cookie de sessão (rápido, na borda). A sessão é
    // validada de verdade no servidor, em cada página e ação (lib/auth.ts).
    if (getSessionCookie(request)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = pathname.startsWith("/painel") ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  // Sem login configurado (modo demo): protege o painel com APP_PASSWORD, se definida
  const password = gatePassword();
  if (!password) return NextResponse.next();
  if (request.cookies.get(GATE_COOKIE)?.value === (await gateToken(password))) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/acesso";
  url.search = pathname.startsWith("/painel") ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/painel/:path*", "/api/oauth/:path*", "/api/clips/:path*", "/api/scale/:path*", "/api/sources/:path*"],
};
