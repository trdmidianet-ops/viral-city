import Link from "next/link";
import { Flame } from "lucide-react";
import { Logo } from "@/components/brand";
import { SunsetScene } from "@/components/sunset-scene";
import { HeroCity, HeroPhone, HeroReveal } from "@/components/hero3d/hero-3d";
import { YoutubeIcon } from "@/components/platform-icons";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { ShortsShowcase } from "@/components/landing/showcase";
import { Faq, FinalCta, Footer } from "@/components/landing/closing";
import "./landing.css";

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

      <ShortsShowcase />
      <HowItWorks />
      <Features />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
