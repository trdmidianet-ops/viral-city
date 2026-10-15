import { Logo } from "@/components/brand";
import { safeNext } from "@/lib/gate";
import { GateForm } from "./gate-form";

export default async function AcessoPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,46,136,0.25),transparent_55%)]" />
      <div className="glass relative w-full max-w-sm rounded-2xl p-7">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="mt-6 text-center text-xl font-semibold">Área restrita</h1>
        <p className="mt-1 text-center text-sm text-muted">Digite a senha para abrir o painel.</p>
        <GateForm next={safeNext(next)} />
      </div>
    </main>
  );
}
