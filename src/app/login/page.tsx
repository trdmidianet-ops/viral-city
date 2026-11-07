import Link from "next/link";
import { Logo } from "@/components/brand";
import { isAuthConfigured, isGoogleLoginConfigured } from "@/lib/auth-config";
import { safeNext } from "@/lib/gate";
import { cookies } from "next/headers";
import { RefCapture } from "@/components/ref-capture";
import { AuthForm } from "./auth-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; next?: string; cupom?: string; ref?: string }>;
}) {
  const { modo, next: nextParam, cupom, ref } = await searchParams;
  const next = safeNext(nextParam);
  const coupon = (cupom ?? ref ?? (await cookies()).get("vc_ref")?.value ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);
  // quem chega com cupom já cai no cadastro
  const mode = modo === "cadastro" || (coupon && modo !== "entrar") ? "signup" : "signin";

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <RefCapture />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,46,136,0.25),transparent_55%),radial-gradient(ellipse_at_50%_100%,rgba(139,61,255,0.2),transparent_60%)]" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-7">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold">
          {mode === "signup" ? "Crie sua conta" : "Bem-vindo de volta"}
        </h1>

        {isAuthConfigured() ? (
          <AuthForm mode={mode} next={next} google={isGoogleLoginConfigured()} coupon={coupon} />
        ) : (
          <div className="mt-6 space-y-4 text-sm">
            <p className="rounded-lg border border-sun/30 bg-sun/10 p-3 text-sun">
              Login ainda não configurado. O painel abre em <strong>modo demo</strong>, sem conta.
            </p>
            <Link href="/painel" className="btn-sunset block rounded-full py-3 text-center font-semibold text-white">
              Entrar no modo demo
            </Link>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "signup" ? (
            <>
              Já tem conta? <Link href={`/login?modo=entrar&next=${encodeURIComponent(next)}`} className="text-pink hover:underline">Entrar</Link>
            </>
          ) : (
            <>
              Novo por aqui?{" "}
              <Link href={`/login?modo=cadastro&next=${encodeURIComponent(next)}`} className="text-pink hover:underline">Criar conta</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
