import type { Metadata } from "next";
import { Bungee, Geist_Mono, Inter, Inter_Tight, Instrument_Serif } from "next/font/google";
import "./globals.css";

// Tipografia no estilo do resend.com com fontes livres: serifa nos títulos grandes,
// grotesca nos subtítulos e números, Inter nos textos e Geist Mono em código. A Bungee fica só na logo.
const body = Inter({ variable: "--font-body", subsets: ["latin"] });
const heading = Inter_Tight({ variable: "--font-heading", subsets: ["latin"] });
const serif = Instrument_Serif({ variable: "--font-serif", weight: "400", style: ["normal", "italic"], subsets: ["latin"] });
const logo = Bungee({ variable: "--font-logo", weight: "400", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Viral City — cortes virais do seu vídeo longo",
  description:
    "A IA transforma seu vídeo longo em 5 Shorts com nota viral, legendas e enquadramento 9:16, e posta no seu canal do YouTube no horário certo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} ${heading.variable} ${serif.variable} ${logo.variable} ${mono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
