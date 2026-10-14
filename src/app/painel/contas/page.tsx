import { Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";

export default function ContasPage() {
  return (
    <>
      <PageHeader title="Contas" subtitle="Conecte várias contas de cada rede." phase={3} />
      <EmptyState
        icon={Users}
        title="Nenhuma conta conectada"
        text="Na fase 3 você conecta quantos canais e perfis quiser via login oficial (OAuth) do YouTube, TikTok e Instagram."
      />
    </>
  );
}
