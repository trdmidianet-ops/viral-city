import Link from "next/link";
import { Logo, LogoMark } from "@/components/brand";
import { Reveal } from "./reveal";
import { Accent, SectionTitle } from "./section-title";

const faqs = [
  {
    q: "Como a IA escolhe os cortes?",
    a: "Ela transcreve a fala do vídeo inteiro, procura os ganchos mais fortes e dá uma nota viral para cada trecho, sempre com o motivo da escolha.",
  },
  {
    q: "A IA publica sozinha, sem eu ver?",
    a: "Não. Você revisa e aprova cada corte, e escolhe os dias e horários. Só depois a agenda publica.",
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
    q: "Posso cortar vídeos de outros canais?",
    a: "Não. A Viral City corta apenas vídeos do seu próprio canal ou materiais que você tem autorização para usar. As tendências servem só de inspiração para ganchos e formatos.",
  },
  {
    q: "Em quais redes posso publicar?",
    a: "YouTube Shorts, Instagram Reels e TikTok, com vários perfis na mesma conta.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Você compra CityCoins no valor que quiser, em real, dólar, euro ou libra. Cada vídeo processado gasta CityCoins de acordo com a duração, e o custo aparece antes de você confirmar.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-16 gap-10 px-4 py-24 sm:py-28 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
      <SectionTitle index="03" eyebrow="Dúvidas">
        O que todo mundo pergunta <Accent>antes de testar.</Accent>
      </SectionTitle>
      <Reveal className="border-t border-line">
        {faqs.map((f, i) => (
          <details key={f.q} open={i === 0} className="vc-faq group border-b border-line">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <span aria-hidden="true" className="font-mono text-xl text-cyan transition duration-300 group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="vc-faq-answer max-w-xl pb-6 leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </Reveal>
    </section>
  );
}

/** Chamada final: a logo da Viral City nascendo no horizonte, com raios de luz e a grade no chão. */
export function FinalCta() {
  return (
    <section className="px-4 pb-28">
      <Reveal className="vc-cta relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] ring-1 ring-pink/30">
        <div aria-hidden="true" className="vc-cta-logo">
          <div className="vc-cta-rays" />
          <div className="vc-cta-glow" />
          <div className="vc-cta-float">
            <LogoMark size={220} />
          </div>
        </div>
        <div aria-hidden="true" className="vc-cta-floor" />
        <div className="relative px-6 pb-[17rem] pt-16 text-center sm:pb-[20rem] sm:pt-20">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/90">A IA está pronta</p>
          <h2 className="mx-auto mt-4 max-w-3xl text-balance font-serif text-4xl font-normal leading-none tracking-[-0.01em] sm:text-6xl">
            Seu próximo vídeo longo já tem 5 cortes virais dentro.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-lg text-ink/90">Crie sua conta e deixe a IA encontrar.</p>
          <Link
            href="/login?modo=cadastro"
            className="btn-sunset mt-8 inline-block rounded-full px-8 py-3.5 font-bold text-night"
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
            A IA que transforma vídeos longos em cortes para Shorts, Reels e TikTok, com nota viral, legenda e agenda
            automática.
          </p>
        </div>
        <nav className="text-sm">
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/60">Produto</p>
          <ul className="mt-4 space-y-2.5 text-muted">
            <li><a href="#como-funciona" className="hover:text-ink">Como funciona</a></li>
            <li><a href="#recursos" className="hover:text-ink">Recursos</a></li>
            <li><a href="#faq" className="hover:text-ink">Dúvidas</a></li>
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
