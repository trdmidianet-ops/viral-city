import { Clapperboard } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";

export default function GeradorPage() {
  return (
    <>
      <PageHeader title="Gerador" subtitle="Transforme um viral em um vídeo original." phase={4} />
      <EmptyState
        icon={Clapperboard}
        title="Gerador de vídeos em breve"
        text="Escolha um viral como referência e a IA monta roteiro, narração, legendas e cortes verticais 9:16, tudo original."
      />
    </>
  );
}
