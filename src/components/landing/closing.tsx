import Link from "next/link";
import { Logo } from "@/components/brand";
import { Reveal } from "./reveal";
import { Accent, SectionTitle } from "./section-title";

const FORMATS = ["Podcasts", "Aulas", "Lives", "Entrevistas", "Vlogs", "Palestras", "Cursos", "Bate-papos"];

/** Letreiro neon correndo com os formatos que mais rendem cortes. */
export function FormatsMarquee() {
  const row = (hidden: boolean) => (
    <div className="vc-marquee-row flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {FORMATS.map((f) => (
        <span key={f} className="flex items-center">
          <span className="vc-outline px-6 font-serif text-4xl italic sm:text-5xl">{f}</span>
          <span className="text-xl text-pink">✦</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="vc-marquee relative overflow-hidden border-y border-line bg-night-2/70 py-6">
      <div className="vc-marquee-track flex w-max">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}

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
  {
    q: "Como funciona o pagamento?",
    a: "Você compra CityCoins no valor que quiser, em real, dólar, euro ou libra. Cada vídeo processado gasta CityCoins de acordo com a duração, e o custo aparece antes de você confirmar.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-28">
      <SectionTitle eyebrow="Dúvidas" tone="sun">
        Perguntas <Accent>frequentes</Accent>
      </SectionTitle>
      <div className="mt-14 space-y-3">
        {faqs.map((f, i) => (
          <Reveal key={f.q} delay={i * 60}>
            <details className="vc-faq group rounded-xl px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {f.q}
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg text-pink ring-1 ring-pink/40 transition duration-300 group-open:rotate-45 group-open:bg-pink group-open:text-white">
                  +
                </span>
              </summary>
              <p className="vc-faq-answer mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/** Chamada final: sol listrado do synthwave nascendo atrás do texto, com a grade no chão. */
export function FinalCta() {
  return (
    <section className="px-4 pb-28">
      <Reveal className="vc-cta relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] ring-1 ring-pink/30">
        <div aria-hidden="true" className="vc-cta-sun" />
        <div aria-hidden="true" className="vc-cta-floor" />
        <div className="relative px-6 pb-56 pt-16 text-center sm:pb-64 sm:pt-20">
          <h2 className="font-heading text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
            A cidade está <Accent>esperando</Accent>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-ink/80">
            Crie sua conta e transforme seu próximo vídeo longo em uma semana de Shorts.
          </p>
          <Link
            href="/login?modo=cadastro"
            className="btn-sunset mt-8 inline-block rounded-full px-8 py-3.5 font-semibold text-white"
          >
            Criar conta grátis
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="vc-footer relative">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            Seus vídeos longos viram Shorts com nota viral, legenda e agenda automática.
          </p>
        </div>
        <nav className="text-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Produto</p>
          <ul className="mt-4 space-y-2.5 text-muted">
            <li><a href="#como-funciona" className="hover:text-ink">Como funciona</a></li>
            <li><a href="#recursos" className="hover:text-ink">Recursos</a></li>
            <li><a href="#faq" className="hover:text-ink">Perguntas frequentes</a></li>
            <li><Link href="/login" className="hover:text-ink">Entrar</Link></li>
          </ul>
        </nav>
        <nav className="text-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Legal</p>
          <ul className="mt-4 space-y-2.5 text-muted">
            <li><Link href="/privacidade" className="hover:text-ink">Privacidade</Link></li>
            <li><Link href="/termos" className="hover:text-ink">Termos de uso</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-center text-xs text-muted sm:text-left">
          © {new Date().getFullYear()} Viral City. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
