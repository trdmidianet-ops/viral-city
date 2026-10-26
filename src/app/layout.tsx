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
      <body className={`${display.variable} ${body.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
