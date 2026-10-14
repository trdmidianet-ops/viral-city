import Link from "next/link";
import {
  CalendarClock,
  Flame,
  Layers,
  Link2,
  Radar,
  Sparkles,
  Wand2,
  ShieldCheck,
} from "lucide-react";
import { Logo, SunsetScene } from "@/components/brand";
import { InstagramIcon, TiktokIcon, YoutubeIcon } from "@/components/platform-icons";

const steps = [
  {
    icon: Radar,
    title: "Radar de virais",
    text: "Vemos os vídeos mais assistidos por nicho e país em cada plataforma.",
  },
  {
    icon: Wand2,
    title: "IA recria do zero",
    text: "O viral vira referência: gancho, ritmo e formato. O vídeo novo é 100% original.",
  },
  {
    icon: CalendarClock,
    title: "Posta sozinho",
    text: "Você define dias e horários por conta e a fila publica no automático.",
  },
];

const features = [
  {
    icon: Flame,
    title: "Ranking por nicho",
    text: "Games, finanças, humor, fitness, curiosidades… veja o que está explodindo agora, por região.",
  },
  {
    icon: Layers,
    title: "Várias contas ao mesmo tempo",
    text: "Conecte quantos canais e perfis quiser no YouTube, TikTok e Instagram e gerencie tudo num painel.",
  },
  {
    icon: Sparkles,
    title: "Vídeos originais com IA",
    text: "Roteiro, narração, legendas animadas e cortes verticais 9:16 gerados a partir do padrão viral.",
  },
  {
    icon: CalendarClock,
    title: "Agenda autônoma",
    text: "Grade semanal por conta: escolha os dias e horários e a Viral City faz o resto.",
  },
  {
    icon: Link2,
    title: "APIs oficiais",
    text: "Conexão via OAuth oficial de cada rede, sem senha guardada e sem risco de bot.",
  },
  {
    icon: ShieldCheck,
    title: "Seguro para monetizar",
    text: "Sem reupload de conteúdo alheio: tudo que sai daqui é original e elegível a programas de criadores.",
  },
];

const faqs = [
  {
    q: "A Viral City baixa e reposta vídeos de outras pessoas?",
    a: "Não. Os virais servem de referência de formato. A IA cria um vídeo novo e original, o que protege suas contas contra strikes e mantém a monetização.",
  },
  {
    q: "Em quais redes posso publicar?",
    a: "YouTube (Shorts), TikTok e Instagram (Reels), com várias contas por rede.",
  },
  {
    q: "Preciso saber editar?",
    a: "Não. Você escolhe o nicho e os horários; roteiro, narração, legendas e cortes são automáticos.",
  },
  {
    q: "Quando posso conectar minhas contas?",
    a: "A conexão de contas entra na próxima fase do produto. Crie sua conta agora para acessar o painel.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-night/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden gap-8 text-sm text-muted md:flex">
            <a href="#como-funciona" className="hover:text-ink">Como funciona</a>
            <a href="#recursos" className="hover:text-ink">Recursos</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm text-muted hover:text-ink">
              Entrar
            </Link>
            <Link href="/login?modo=cadastro" className="btn-sunset rounded-full px-4 py-2 text-sm font-semibold text-white">
              Começar
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative flex min-h-[100svh] items-start justify-center pt-28">
        <SunsetScene />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest text-sun">
            <Flame size={14} /> Bem-vindo à cidade dos virais
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.05] sm:text-6xl md:text-7xl">
            <span className="text-sunset">Domine</span>{" "}
            <span className="text-neon">os virais</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-ink [text-shadow:0_2px_12px_rgba(11,6,24,0.95)] sm:text-lg">
            Descubra o que está bombando por nicho, crie vídeos originais com IA e poste no
            YouTube, TikTok e Instagram no piloto automático.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login?modo=cadastro" className="btn-sunset w-full rounded-full px-7 py-3.5 font-semibold text-white sm:w-auto">
              Entrar na cidade
            </Link>
            <a href="#como-funciona" className="glass w-full rounded-full px-7 py-3.5 font-medium sm:w-auto">
              Ver como funciona
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-5 text-ink/70">
            <YoutubeIcon aria-label="YouTube" />
            <TiktokIcon aria-label="TikTok" />
            <InstagramIcon aria-label="Instagram" />
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-pink">Como funciona</p>
        <h2 className="mt-3 text-center font-display text-3xl sm:text-4xl">
          Do radar ao post, <span className="text-sunset">em 3 passos</span>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <article key={s.title} className="glass relative rounded-2xl p-6">
              <span className="absolute right-5 top-4 font-display text-4xl text-white/5">0{i + 1}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-pink to-orange">
                <s.icon size={22} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="relative scroll-mt-20 border-y border-line bg-night-2/60 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-cyan">Recursos</p>
          <h2 className="mt-3 text-center font-display text-3xl sm:text-4xl">
            Tudo para <span className="text-sunset">viralizar</span>
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article key={f.title} className="glass rounded-2xl p-6 transition hover:border-pink/40">
                <f.icon className="text-orange" size={24} />
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24">
        <h2 className="text-center font-display text-3xl sm:text-4xl">Perguntas frequentes</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="glass group rounded-xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="text-pink transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-purple via-pink to-orange p-px">
          <div className="rounded-3xl bg-night-2 px-6 py-14 text-center">
            <h2 className="font-display text-3xl sm:text-4xl">
              A cidade está <span className="text-sunset">esperando</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Crie sua conta e comece a montar sua máquina de vídeos virais.
            </p>
            <Link href="/login?modo=cadastro" className="btn-sunset mt-8 inline-block rounded-full px-8 py-3.5 font-semibold text-white">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted sm:flex-row">
          <Logo />
          <p>© {new Date().getFullYear()} Viral City. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
