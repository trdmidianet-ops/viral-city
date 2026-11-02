import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand";

export const LEGAL_UPDATED = "2 de novembro de 2026";
export const CONTACT_EMAIL = "trdmidianet@gmail.com";

/** Moldura das páginas públicas de texto (privacidade, termos). */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
          <Logo />
          <Link href="/login" className="text-sm text-muted hover:text-ink">
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">Atualizado em {LEGAL_UPDATED}</p>
        <div className="mt-10 space-y-8 leading-relaxed text-ink/90">{children}</div>
      </main>
      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
        <span className="mx-3">·</span>
        <Link href="/termos" className="hover:text-ink">Termos de uso</Link>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3 text-[15px]">{children}</div>
    </section>
  );
}
