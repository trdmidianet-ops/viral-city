import Link from "next/link";
import { CalendarClock, Clapperboard, TrendingUp, Users } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { platforms } from "@/components/platform-icons";

const stats = [
  { label: "Contas conectadas", value: "0", icon: Users },
  { label: "Vídeos gerados", value: "0", icon: Clapperboard },
  { label: "Posts agendados", value: "0", icon: CalendarClock },
  { label: "Virais monitorados", value: "0", icon: TrendingUp },
];

const roadmap = [
  { phase: 1, title: "Base, visual e login", done: true },
  { phase: 2, title: "Tendências do YouTube por nicho", done: true },
  { phase: 3, title: "Conectar várias contas (OAuth)", done: false },
  { phase: 4, title: "Gerador de vídeos originais", done: false },
  { phase: 5, title: "Agenda e postagem autônoma", done: false },
];

export default function PainelHome() {
  return (
    <>
      <PageHeader title="Visão geral" subtitle="Sua central de comando na Viral City." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="glass rounded-2xl p-5">
            <Icon size={18} className="text-orange" />
            <p className="mt-3 font-display text-3xl">{value}</p>
            <p className="text-xs text-muted">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="glass rounded-2xl p-6 lg:col-span-3">
          <h2 className="font-semibold">Comece por aqui</h2>
          <p className="mt-1 text-sm text-muted">Conecte suas contas para a cidade começar a trabalhar.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {platforms.map(({ id, name, Icon, color }) => (
              <Link
                key={id}
                href="/painel/contas"
                className="flex items-center gap-3 rounded-xl border border-line bg-night/40 p-4 transition hover:border-pink/40"
              >
                <Icon className={color} />
                <span className="text-sm">{name}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold">Roteiro do MVP</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {roadmap.map((r) => (
              <li key={r.phase} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    r.done ? "bg-gradient-to-br from-pink to-orange text-white" : "border border-line text-muted"
                  }`}
                >
                  {r.phase}
                </span>
                <span className={r.done ? "text-ink" : "text-muted"}>{r.title}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
