import { notFound } from "next/navigation";
import { Crown } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { adminStats, isAdminUser, listUsersForAdmin } from "@/lib/admin";
import { currentUserId } from "@/lib/auth";
import { formatCoins } from "@/lib/coins/pricing";
import { isDbConfigured } from "@/lib/db";
import { GrantForm } from "./grant-form";

export const dynamic = "force-dynamic";

const usd = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!isDbConfigured() || !(await isAdminUser(await currentUserId()))) notFound();
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const [stats, users] = await Promise.all([adminStats(), listUsersForAdmin(q)]);

  const cards = [
    { label: "Usuários", value: (stats?.users ?? 0).toLocaleString("pt-BR") },
    { label: "Vendido (Stripe)", value: usd(stats?.paid_usd_cents ?? 0) },
    { label: "CityCoins nas carteiras", value: formatCoins(Number(stats?.coins_in_wallets ?? 0)) },
    { label: "CityCoins gastos", value: formatCoins(Number(stats?.coins_spent ?? 0)) },
  ];

  return (
    <>
      <PageHeader title="Admin" subtitle="Usuários, saldos e CityCoins. Sua conta usa tudo sem gastar CityCoins." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="glass rounded-2xl p-5">
            <p className="text-xs text-muted">{c.label}</p>
            <p className="num mt-2 font-heading text-3xl font-medium tracking-[-0.03em]">{c.value}</p>
          </div>
        ))}
      </div>

      <section className="glass mt-6 rounded-2xl">
        <form className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Crown size={16} className="text-sun" /> Usuários
          </h2>
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por e-mail ou nome"
            className="ml-auto w-full rounded-lg border border-line bg-night/60 px-3 py-2 text-sm outline-none focus:border-pink sm:w-72"
          />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Usuário</th>
                <th className="px-4 py-2 font-medium">Login</th>
                <th className="px-4 py-2 font-medium">Uso</th>
                <th className="px-4 py-2 text-right font-medium">Comprou</th>
                <th className="px-4 py-2 text-right font-medium">Saldo</th>
                <th className="px-4 py-2 font-medium">Dar / tirar CityCoins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="align-middle">
                  <td className="px-4 py-3">
                    <p className="font-medium">{u.name || "—"}</p>
                    <p className="text-xs text-muted">{u.email}</p>
                    <p className="text-[11px] text-muted">desde {new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{u.logins.map((l) => (l === "credential" ? "e-mail" : l)).join(", ") || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.sources} vídeos · {u.scale_jobs} lotes
                  </td>
                  <td className="num px-4 py-3 text-right text-xs">{usd(u.purchased_usd_cents)}</td>
                  <td className="num px-4 py-3 text-right font-semibold text-sun">{formatCoins(Number(u.balance))}</td>
                  <td className="px-4 py-3">
                    <GrantForm userId={u.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="p-6 text-center text-sm text-muted">Nenhum usuário encontrado.</p>}
        </div>
      </section>
    </>
  );
}
