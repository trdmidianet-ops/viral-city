import { CheckCircle2, Plus, TriangleAlert, Unplug } from "lucide-react";
import { PageHeader } from "@/components/painel-ui";
import { activePlatforms } from "@/components/platform-icons";
import { canStoreAccounts, listAccounts, type Account } from "@/lib/accounts/store";
import { appUrl, isConfigured, providers, redirectUri } from "@/lib/oauth/providers";
import { disconnectAccount } from "./actions";
import { setupGuides } from "./setup-guides";

export const dynamic = "force-dynamic";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const { conectado, erro } = await searchParams;
  const accounts = await listAccounts();
  const httpsReady = appUrl().startsWith("https://");
  // Na Vercel o disco é somente leitura: sem banco configurado não dá para guardar contas
  const canStore = canStoreAccounts();

  return (
    <>
      <PageHeader title="Contas" subtitle="Conecte quantas contas quiser em cada rede, pelo login oficial." />

      {!canStore && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-sun/30 bg-sun/10 px-4 py-3 text-sm text-sun">
          <TriangleAlert size={18} className="shrink-0" />
          Na versão online, conectar contas depende do banco de dados (Supabase), que ainda não foi ativado. Por
          enquanto, conecte as contas pela versão no seu computador.
        </p>
      )}

      {conectado && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-cyan/30 bg-cyan/10 px-4 py-3 text-sm text-cyan">
          <CheckCircle2 size={18} /> Conta “{conectado}” conectada.
        </p>
      )}
      {erro && (
        <p className="mb-6 flex items-center gap-2 rounded-xl border border-pink/40 bg-pink/10 px-4 py-3 text-sm text-pink">
          <TriangleAlert size={18} /> {erro}
        </p>
      )}

      <div className="space-y-6">
        {activePlatforms.map(({ id, name, Icon, color }) => {
          const provider = providers[id];
          const configured = isConfigured(provider);
          const list = accounts.filter((a) => a.platform === id);
          const blockedByHttps = provider.needsHttps && !httpsReady;

          return (
            <section key={id} className="glass rounded-2xl p-5 sm:p-6">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Icon className={color} />
                  <h2 className="font-semibold">{name}</h2>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted">
                    {list.length} conta{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                {configured && !blockedByHttps && canStore ? (
                  <a
                    href={`/api/oauth/${id}/start`}
                    className="btn-sunset flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
                  >
                    <Plus size={16} /> Conectar conta
                  </a>
                ) : (
                  <span className="rounded-full border border-sun/30 bg-sun/10 px-3 py-1 text-xs text-sun">
                    {!configured ? "Falta configurar" : !canStore ? "Precisa do banco de dados" : "Precisa de endereço HTTPS"}
                  </span>
                )}
              </header>

              {list.length > 0 && (
                <ul className="mt-5 divide-y divide-line">
                  {list.map((a) => (
                    <AccountRow key={a.id} account={a} />
                  ))}
                </ul>
              )}

              {(!configured || blockedByHttps) && (
                <SetupGuide
                  platform={id}
                  env={provider.env}
                  callback={redirectUri(provider)}
                  configured={configured}
                  blockedByHttps={blockedByHttps}
                />
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted">
        Os tokens ficam criptografados (no banco da Viral City ou nesta máquina). Nenhuma senha é guardada.
      </p>
    </>
  );
}

function AccountRow({ account }: { account: Account }) {
  const expired = account.expiresAt && new Date(account.expiresAt) < new Date();
  return (
    <li className="flex items-center gap-3 py-3">
      {account.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatares vêm de CDNs variadas
        <img src={account.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-night-3 font-semibold">
          {account.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.name}</p>
        <p className="truncate text-xs text-muted">
          {account.handle ? `${account.handle} · ` : ""}
          conectada em {new Date(account.connectedAt).toLocaleDateString("pt-BR")}
          {expired && " · token será renovado ao postar"}
        </p>
      </div>
      <form action={disconnectAccount}>
        <input type="hidden" name="id" value={account.id} />
        <button className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/5 hover:text-pink">
          <Unplug size={14} /> Desconectar
        </button>
      </form>
    </li>
  );
}

function SetupGuide({
  platform,
  env,
  callback,
  configured,
  blockedByHttps,
}: {
  platform: keyof typeof setupGuides;
  env: [string, string];
  callback: string;
  configured: boolean;
  blockedByHttps: boolean;
}) {
  const guide = setupGuides[platform];
  return (
    <div className="mt-5 rounded-xl border border-line bg-night/40 p-4 text-sm">
      {blockedByHttps && (
        <p className="mb-3 text-sun">
          Esta rede só aceita retorno em HTTPS. Rode um túnel (ex.: <code>cloudflared tunnel --url http://localhost:3000</code>)
          e coloque o endereço gerado em <code>APP_URL</code> no .env.local.
        </p>
      )}
      {!configured && (
        <ol className="list-decimal space-y-1.5 pl-5 text-muted">
          {guide.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <dl className="mt-4 space-y-2 text-xs">
        <div>
          <dt className="text-muted">Endereço de retorno (redirect URI)</dt>
          <dd className="mt-1 break-all rounded-md bg-night px-2 py-1.5 font-mono text-orange">{callback}</dd>
        </div>
        {!configured && (
          <div>
            <dt className="text-muted">No .env.local</dt>
            <dd className="mt-1 rounded-md bg-night px-2 py-1.5 font-mono text-ink">
              {env[0]}=...
              <br />
              {env[1]}=...
            </dd>
          </div>
        )}
      </dl>
      {guide.note && <p className="mt-3 text-xs text-muted">{guide.note}</p>}
    </div>
  );
}
