import Link from "next/link";
import { Logo } from "@/components/brand";
import { ForgotPasswordForm } from "./form";

export default function EsqueciSenhaPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,46,136,0.25),transparent_55%),radial-gradient(ellipse_at_50%_100%,rgba(139,61,255,0.2),transparent_60%)]" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-7">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold">Recuperar senha</h1>
        <p className="mt-2 text-center text-sm text-muted">
          Digite seu e-mail e enviaremos um link para redefinir a sua senha.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-center text-sm text-muted">
          <Link href="/login" className="text-pink hover:underline">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </main>
  );
}
