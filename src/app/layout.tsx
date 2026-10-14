import type { Metadata } from "next";
import { Bungee, Rubik } from "next/font/google";
import "./globals.css";

const display = Bungee({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const body = Rubik({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viral City — vídeos virais no piloto automático",
  description:
    "Descubra os vídeos mais vistos por nicho, crie versões originais com IA e poste automaticamente no YouTube, TikTok e Instagram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
