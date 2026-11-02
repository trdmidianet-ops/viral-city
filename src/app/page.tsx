import Link from "next/link";
import {
  CalendarClock,
  Captions,
  Crop,
  Flame,
  Radar,
  Scissors,
  ShieldCheck,
  Star,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { SunsetScene } from "@/components/sunset-scene";
import { HeroCity, HeroPhone, HeroReveal } from "@/components/hero3d/hero-3d";
import { YoutubeIcon } from "@/components/platform-icons";

const steps = [
  {
    icon: Upload,
    title: "Mande o vídeo longo",
    text: "Escolha um vídeo do seu canal, suba um arquivo do PC ou cole o link de um material autorizado.",
  },
  {
    icon: Scissors,
    title: "A IA escolhe 5 cortes",
    text: "Ela transcreve a fala, encontra os ganchos mais fortes e dá uma nota viral para cada trecho.",
  },
  {
    icon: CalendarClock,
    title: "Aprove e agende",
    text: "Você aprova os cortes e a agenda posta no YouTube Shorts nos dias e horários que escolher.",
  },
];

const features = [
  {
    icon: Star,
    title: "Nota viral em cada corte",
    text: "Cada trecho vem com nota e o motivo da escolha, para você publicar primeiro o que tem mais chance.",
  },
  {
    icon: Crop,
    title: "Vertical 9:16 sem esforço",
    text: "Enquadramento com fundo desfocado, centralizado ou tela dividida, pronto para Shorts.",
  },
  {
    icon: Captions,
    title: "Legendas e sua logo",
    text: "Legendas automáticas palavra por palavra, texto de gancho no topo e a logo do seu canal.",
  },
  {
    icon: Radar,
    title: "Radar de tendências",
    text: "Veja os Shorts que estão bombando no seu nicho e use os ganchos como inspiração para os cortes.",
  },
  {
    icon: CalendarClock,
    title: "Agenda autônoma",
    text: "Grade semanal por canal: os cortes aprovados entram na fila e saem no horário certo.",
  },
  {
    icon: ShieldCheck,
    title: "Seu conteúdo, conexão oficial",
    text: "Login oficial do Google, sem senha guardada. Só cortamos vídeos seus ou com autorização.",
  },
];

const faqs = [
  {
    q: "Posso cortar vídeos de outros canais?",
    a: "Não. A Viral City corta apenas vídeos do seu próprio canal ou materiais que você tem autorização para usar. As tendências servem só de inspiração para ganchos e formatos.",
  },
  {
    q: "Em quais redes posso publicar?",
    a: "Por enquanto, YouTube Shorts, com vários canais na mesma conta. TikTok e Instagram estão a caminho.",
  },
  {
    q: "Preciso saber editar?",
    a: "Não. A IA escolhe os trechos, enquadra em 9:16 e coloca legendas. Você só revisa, aprova e escolhe os horários.",
  },
  {
    q: "Que tipo de vídeo funciona melhor?",
    a: "Vídeos longos com bastante fala: podcasts, aulas, lives, entrevistas e vlogs. A IA usa a transcrição para achar os melhores momentos.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-night/85">
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
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pb-12 pt-24">
        <div className="vc-fallback-scene">
          <SunsetScene />
        </div>
        <HeroCity />
        {/* escurece o lado do texto para manter a leitura sobre a cidade */}
        <HeroReveal className="pointer-events-none absolute inset-0">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,6,24,0.55),transparent_35%,transparent_70%,rgba(11,6,24,0.9)),radial-gradient(ellipse_at_22%_50%,rgba(11,6,24,0.8),transparent_65%)]"
          />
        </HeroReveal>
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-6 px-4 lg:grid-cols-[1.1fr_1fr]">
          <HeroReveal className="text-center lg:text-left">
            <span className="glass-flat inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-widest text-sun">
              <Flame size={14} /> Bem-vindo à cidade dos virais
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[1] tracking-[-0.01em] sm:text-7xl md:text-8xl">
              <span className="text-sunset pr-1">Um vídeo longo,</span>{" "}
              <span className="text-neon italic">5 Shorts virais</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-ink [text-shadow:0_2px_12px_rgba(11,6,24,0.95)] sm:text-lg lg:mx-0">
              A IA encontra os melhores momentos do seu vídeo, dá nota para cada corte, coloca
              legenda e enquadra em 9:16. Você aprova e a Viral City posta no seu canal do
              YouTube no horário certo.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/login?modo=cadastro" className="btn-sunset w-full rounded-full px-7 py-3.5 font-semibold text-white sm:w-auto">
                Entrar na cidade
              </Link>
              <a href="#como-funciona" className="glass-flat w-full rounded-full px-7 py-3.5 font-medium sm:w-auto">
                Ver como funciona
              </a>
            </div>
            <p className="mt-8 flex items-center justify-center gap-2 text-sm text-ink/70 lg:justify-start">
              <YoutubeIcon aria-hidden="true" /> Feito para YouTube Shorts
            </p>
          </HeroReveal>
          <HeroReveal className="h-[440px] sm:h-[520px] lg:h-[600px]" delay={350}>
            <HeroPhone />
          </HeroReveal>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-pink">Como funciona</p>
        <h2 className="mt-3 text-center font-heading text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
          Do vídeo longo ao Short, <span className="text-sunset">em 3 passos</span>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <article key={s.title} className="glass relative rounded-2xl p-6">
              <span className="absolute right-5 top-4 font-heading text-4xl font-semibold text-white/5">0{i + 1}</span>
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
          <h2 className="mt-3 text-center font-heading text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
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
        <h2 className="text-center font-heading text-3xl font-medium tracking-[-0.04em] sm:text-5xl">Perguntas frequentes</h2>
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
            <h2 className="font-heading text-3xl font-medium tracking-[-0.04em] sm:text-5xl">
              A cidade está <span className="text-sunset">esperando</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted">
              Crie sua conta e transforme seu próximo vídeo longo em uma semana de Shorts.
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
          <div className="flex gap-5">
            <Link href="/privacidade" className="hover:text-ink">Privacidade</Link>
            <Link href="/termos" className="hover:text-ink">Termos de uso</Link>
          </div>
          <p>© {new Date().getFullYear()} Viral City. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
