import { KeyRound, SearchX, TrendingUp } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";
import { platforms } from "@/components/platform-icons";
import { parseFilters } from "@/lib/youtube/niches";
import { fetchTrending, type TrendResult } from "@/lib/youtube/trending";
import { TrendFiltersForm } from "./filters";
import { VideoCard } from "./video-card";

export const dynamic = "force-dynamic";

export default async function TendenciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const result = await fetchTrending(filters);

  return (
    <>
      <PageHeader title="Tendências" subtitle="Os vídeos mais vistos por nicho, país e formato." />

      <div className="mb-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Plataforma">
        {platforms.map(({ id, name, Icon, color }) => {
          const active = id === "youtube";
          return (
            <span
              key={id}
              role="tab"
              aria-selected={active}
              aria-disabled={!active}
              title={active ? undefined : "Em pausa: precisa de provedor de dados pago"}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                active ? "border-pink/50 bg-pink/10 text-ink" : "border-line text-muted opacity-60"
              }`}
            >
              <Icon size={16} className={active ? color : undefined} />
              {name}
              {!active && <span className="text-[10px] uppercase tracking-wide">em pausa</span>}
            </span>
          );
        })}
      </div>

      <TrendFiltersForm filters={filters} />
      <Results result={result} niche={filters.niche.id} />
    </>
  );
}

function Results({ result, niche }: { result: TrendResult; niche: string }) {
  if (!result.ok) {
    if (result.reason === "missing-key" || result.reason === "invalid-key") return <KeySetup invalid={result.reason === "invalid-key"} />;
    const messages = {
      "no-chart": "O YouTube não publica ranking de populares para esse nicho nesse país. Tente outro país ou nicho.",
      quota: "A cota diária grátis da YouTube Data API acabou. Ela é renovada à meia-noite (horário do Pacífico).",
      error: result.message ?? "Erro ao consultar o YouTube.",
    } as const;
    return <EmptyState icon={SearchX} title="Não deu para buscar agora" text={messages[result.reason]} />;
  }

  if (!result.videos.length)
    return (
      <EmptyState
        icon={TrendingUp}
        title="Nenhum vídeo com esses filtros"
        text="Tente aumentar o período ou trocar o formato. Rankings de categoria trazem só os 50 vídeos mais populares do momento."
      />
    );

  return (
    <>
      <p className="mb-4 text-xs text-muted">
        {result.videos.length} vídeos · custo desta busca: {result.quotaCost} unidade{result.quotaCost > 1 && "s"} de cota
        (de 10.000/dia) · atualizado a cada hora
      </p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {result.videos.map((v, i) => (
          <VideoCard key={v.id} video={v} rank={i + 1} niche={niche} />
        ))}
      </div>
    </>
  );
}

function KeySetup({ invalid }: { invalid: boolean }) {
  return (
    <EmptyState
      icon={KeyRound}
      title={invalid ? "Chave do YouTube recusada" : "Conecte a YouTube Data API"}
      text={
        invalid
          ? "A chave em YOUTUBE_API_KEY foi recusada. Confira se copiou certo e se a YouTube Data API v3 está ativada no projeto."
          : "O radar usa a API oficial e gratuita do YouTube. Crie uma chave no Google Cloud e coloque em .env.local."
      }
    >
      <ol className="mx-auto max-w-md space-y-1.5 text-left text-sm text-muted">
        <li>1. Acesse console.cloud.google.com e crie um projeto.</li>
        <li>2. Em “APIs e serviços › Biblioteca”, ative a YouTube Data API v3.</li>
        <li>3. Em “Credenciais”, crie uma chave de API e restrinja à YouTube Data API v3.</li>
        <li>
          4. Coloque em <code className="text-ink">.env.local</code>:{" "}
          <code className="text-orange">YOUTUBE_API_KEY=sua_chave</code>
        </li>
        <li>5. Reinicie o servidor (npm run dev).</li>
      </ol>
    </EmptyState>
  );
}
