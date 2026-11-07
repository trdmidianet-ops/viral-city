import Link from "next/link";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { TEMPLATES } from "@/lib/scale/templates";
import { TemplateThumb } from "../scale/template-thumb";

export default function TemplatesPage() {
  return (
    <>
      <PageHeader title="Templates" subtitle="Layouts prontos para o feed. Escolha um, coloque a manchete e aplique no seu vídeo." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-6">
        {TEMPLATES.map((t) => (
          <article key={t.id} className="glass flex flex-col rounded-2xl p-3">
            <TemplateThumb id={t.id} />
            <h2 className="mt-3 text-sm font-semibold">{t.name}</h2>
            <p className="mt-1 text-xs text-muted">{t.description}</p>
            <div className="mt-auto flex flex-col gap-2 pt-4">
              <Link href={`/painel/scale?template=${t.id}&versoes=1`} className="btn-sunset rounded-full py-2 text-center text-xs font-semibold text-white">
                Usar template
              </Link>
              <Link
                href={`/painel/scale?template=${t.id}&versoes=10`}
                className="flex items-center justify-center gap-1 rounded-full border border-line py-2 text-xs text-muted hover:text-ink"
              >
                <Layers size={13} /> Gerar 10 versões
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
