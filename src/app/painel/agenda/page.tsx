import { CalendarClock } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/painel-ui";

export default function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda" subtitle="Dias e horários de postagem por conta." phase={5} />
      <EmptyState
        icon={CalendarClock}
        title="Nenhum horário definido"
        text="Na fase 5 você monta a grade semanal de cada conta e a fila publica sozinha."
      />
    </>
  );
}
