import { Settings } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";

export default function ConfiguracoesPage() {
  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências da sua conta e integrações." />
      <EmptyState
        icon={Settings}
        title="Tudo certo por aqui"
        text="As chaves de API e preferências de nicho aparecerão aqui conforme as fases forem liberadas."
      />
    </>
  );
}
