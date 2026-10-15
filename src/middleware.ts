import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gatePassword, gateToken } from "@/lib/gate";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/config";

const isProtected = (pathname: string) => pathname.startsWith("/painel") || pathname.startsWith("/api/oauth");

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isSupabaseConfigured) {
    // Sem Supabase: protege o painel com APP_PASSWORD, se definida
    const password = gatePassword();
    if (!password || !isProtected(pathname)) return NextResponse.next();
    if (request.cookies.get(GATE_COOKIE)?.value === (await gateToken(password))) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/acesso";
    url.search = pathname.startsWith("/painel") ? `?next=${encodeURIComponent(pathname)}` : "";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/painel/:path*", "/login", "/api/oauth/:path*"],
};
