/**
 * Nichos do radar. "category" usa o chart oficial de mais populares (1 unidade de cota);
 * "search" usa a busca por palavras-chave ordenada por views (100 unidades de cota).
 */
export type Niche =
  | { id: string; label: string; kind: "category"; categoryId: string }
  | { id: string; label: string; kind: "search"; query: { pt: string; en: string } };

export const niches: Niche[] = [
  { id: "geral", label: "Todos os nichos", kind: "category", categoryId: "0" },
  { id: "games", label: "Games", kind: "category", categoryId: "20" },
  { id: "gta6", label: "GTA 6", kind: "search", query: { pt: "GTA 6", en: "GTA 6" } },
  { id: "humor", label: "Humor", kind: "category", categoryId: "23" },
  { id: "entretenimento", label: "Entretenimento", kind: "category", categoryId: "24" },
  { id: "musica", label: "Música", kind: "category", categoryId: "10" },
  { id: "esportes", label: "Esportes", kind: "category", categoryId: "17" },
  { id: "tecnologia", label: "Ciência e tecnologia", kind: "category", categoryId: "28" },
  { id: "educacao", label: "Educação", kind: "category", categoryId: "27" },
  { id: "estilo", label: "Estilo e tutoriais", kind: "category", categoryId: "26" },
  { id: "vlogs", label: "Pessoas e vlogs", kind: "category", categoryId: "22" },
  { id: "filmes", label: "Filmes e animação", kind: "category", categoryId: "1" },
  { id: "carros", label: "Carros", kind: "category", categoryId: "2" },
  { id: "pets", label: "Pets e animais", kind: "category", categoryId: "15" },
  { id: "noticias", label: "Notícias", kind: "category", categoryId: "25" },
  { id: "financas", label: "Finanças e renda extra", kind: "search", query: { pt: "renda extra dinheiro investimentos", en: "make money investing" } },
  { id: "fitness", label: "Fitness", kind: "search", query: { pt: "treino academia", en: "workout gym" } },
  { id: "receitas", label: "Receitas", kind: "search", query: { pt: "receita fácil", en: "easy recipe" } },
  { id: "curiosidades", label: "Curiosidades", kind: "search", query: { pt: "curiosidades fatos", en: "interesting facts" } },
  { id: "motivacao", label: "Motivação", kind: "search", query: { pt: "motivação", en: "motivation" } },
  { id: "beleza", label: "Beleza", kind: "search", query: { pt: "maquiagem skincare", en: "makeup skincare" } },
];

export const regions = [
  { code: "BR", label: "Brasil", lang: "pt" },
  { code: "PT", label: "Portugal", lang: "pt" },
  { code: "US", label: "Estados Unidos", lang: "en" },
  { code: "GB", label: "Reino Unido", lang: "en" },
  { code: "MX", label: "México", lang: "es" },
  { code: "ES", label: "Espanha", lang: "es" },
  { code: "IN", label: "Índia", lang: "en" },
] as const;

export const formats = [
  { id: "shorts", label: "Shorts (até 3 min)" },
  { id: "longos", label: "Vídeos longos" },
  { id: "todos", label: "Todos" },
] as const;

export const periods = [
  { id: "24h", label: "Últimas 24h", hours: 24 },
  { id: "7d", label: "Últimos 7 dias", hours: 24 * 7 },
  { id: "30d", label: "Últimos 30 dias", hours: 24 * 30 },
] as const;

export const sorts = [
  { id: "views", label: "Mais vistos" },
  { id: "velocidade", label: "Mais rápidos (views/hora)" },
  { id: "engajamento", label: "Mais engajamento" },
] as const;

export type FormatId = (typeof formats)[number]["id"];
export type PeriodId = (typeof periods)[number]["id"];
export type SortId = (typeof sorts)[number]["id"];
export type RegionCode = (typeof regions)[number]["code"];

export type TrendFilters = {
  region: RegionCode;
  niche: Niche;
  format: FormatId;
  period: PeriodId;
  sort: SortId;
};

function pick<T extends { id: string }>(list: readonly T[], value: unknown, fallback: T): T {
  return list.find((item) => item.id === value) ?? fallback;
}

/** Valida os parâmetros da URL contra as listas permitidas (nada livre chega na API). */
export function parseFilters(params: Record<string, string | string[] | undefined>): TrendFilters {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]);
  const region = regions.find((r) => r.code === get("regiao"))?.code ?? "BR";
  return {
    region,
    niche: pick(niches, get("nicho"), niches[0]),
    format: pick(formats, get("formato"), formats[0]).id,
    period: pick(periods, get("periodo"), periods[1]).id,
    sort: pick(sorts, get("ordem"), sorts[0]).id,
  };
}
