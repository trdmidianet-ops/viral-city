import type { NextConfig } from "next";

// Endereço antigo da Vercel. Tudo que chega nele vai para o domínio oficial, para o site ter
// um endereço só: o login com Google guarda um cookie no domínio onde começou e falha se
// voltar para o outro (era o que mandava a pessoa para a página inicial na primeira tentativa).
// Os endereços de prévia da Vercel (viral-city-xxxx.vercel.app) continuam funcionando.
const OLD_HOST = "viral-city.vercel.app";
const CANONICAL = "https://viralcity.app";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }],
  },
  async redirects() {
    // 307: mantém o método (um formulário no meio do caminho continua sendo POST)
    return [{ source: "/:path*", has: [{ type: "host", value: OLD_HOST }], destination: `${CANONICAL}/:path*`, permanent: false }];
  },
};

export default nextConfig;
