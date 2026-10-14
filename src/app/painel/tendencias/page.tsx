import { TrendingUp } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";

export default function TendenciasPage() {
  return (
    <>
      <PageHeader title="Tendências" subtitle="Os vídeos mais vistos por nicho, país e plataforma." phase={2} />
      <EmptyState
        icon={TrendingUp}
        title="Radar de virais em construção"
        text="Na fase 2 você verá o ranking dos Shorts mais assistidos do YouTube por nicho e país. Instagram e TikTok entram quando os provedores de dados forem ativados."
      />
    </>
  );
}
