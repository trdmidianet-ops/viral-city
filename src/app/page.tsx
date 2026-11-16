import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand";
import { SunsetScene } from "@/components/sunset-scene";
import { HeroCity, HeroReveal } from "@/components/hero3d/hero-3d";
import { AiPanel } from "@/components/landing/ai-panel";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Faq, FinalCta, Footer } from "@/components/landing/closing";
import "./landing.css";
import { RefCapture } from "@/components/ref-capture";

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <RefCapture />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-night/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 [&>a:first-child]:whitespace-nowrap">
          <Logo />
          <nav className="hidden gap-8 text-sm text-muted md:flex">
            <a href="#como-funciona" className="hover:text-ink">Como funciona</a>
            <a href="#recursos" className="hover:text-ink">Recursos</a>
            <a href="#faq" className="hover:text-ink">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-2.5 py-2 text-sm text-muted hover:text-ink sm:px-4">
              Entrar
            </Link>
            <Link href="/login?modo=cadastro" className="btn-sunset whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-bold text-night sm:px-4">
              Criar conta
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
            className="absolute inset-0 max-lg:bg-night/55 bg-[linear-gradient(180deg,rgba(11,6,24,0.55),transparent_35%,transparent_70%,rgba(11,6,24,0.9)),radial-gradient(ellipse_at_22%_50%,rgba(11,6,24,0.8),transparent_65%)]"
          />
        </HeroReveal>
        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <HeroReveal className="text-center lg:text-left">
            <span className="glass-flat inline-flex items-center gap-2.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-cyan sm:text-xs sm:tracking-[0.18em]">
              <span className="vc-blink h-1.5 w-1.5 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)]" />
              IA de cortes para YouTube Shorts
            </span>
            <h1 className="mt-6 font-serif text-5xl leading-[0.98] tracking-[-0.01em] [filter:drop-shadow(0_2px_18px_rgba(11,6,24,0.9))] sm:text-6xl lg:text-7xl">
              A IA que encontra os <span className="text-sunset pr-1 italic">virais escondidos</span> no seu vídeo longo.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-ink [text-shadow:0_2px_12px_rgba(11,6,24,0.95)] sm:text-lg lg:mx-0">
              Ela ouve cada minuto, entende o que prende a atenção e entrega 5 Shorts com nota
              viral, legenda e enquadramento 9:16. Você só aprova. Ela publica no seu canal na
              hora certa.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/login?modo=cadastro"
                className="btn-sunset inline-flex w-full items-center justify-center gap-2.5 rounded-full px-7 py-3.5 font-bold text-night sm:w-auto"
              >
                Colocar a IA para trabalhar <ArrowRight size={18} strokeWidth={2.4} aria-hidden="true" />
              </Link>
              <a href="#como-funciona" className="glass-flat w-full rounded-full px-7 py-3.5 text-center font-medium sm:w-auto">
                Ver a IA em ação
              </a>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 font-mono text-xs tracking-wide text-ink/80 [text-shadow:0_1px_8px_rgba(11,6,24,0.95)] lg:justify-start">
              <li>Conexão oficial do Google</li>
              <li>Só o seu conteúdo</li>
              <li>Você aprova antes de publicar</li>
            </ul>
          </HeroReveal>
          <HeroReveal delay={350}>
            <AiPanel />
          </HeroReveal>
        </div>
      </section>

      <HowItWorks />
      <Features />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
