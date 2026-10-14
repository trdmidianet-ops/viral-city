import type { Platform } from "@/lib/accounts/store";

/** Passo a passo para criar o app OAuth de cada plataforma. */
export const setupGuides: Record<Platform, { steps: string[]; note?: string }> = {
  youtube: {
    steps: [
      "No Google Cloud (projeto viral city), vá em “APIs e serviços › Tela de permissão OAuth”, tipo Externo, preencha nome e e-mail.",
      "Em “Público-alvo”, adicione seu e-mail como usuário de teste.",
      "Em “Credenciais › Criar credenciais › ID do cliente OAuth”, tipo Aplicativo da Web.",
      "Em “URIs de redirecionamento autorizados”, cole o endereço de retorno mostrado abaixo.",
      "Copie o ID e a chave secreta para o .env.local e reinicie o servidor.",
    ],
    note: "Com o app em modo Teste, o Google expira a conexão a cada 7 dias. Para uso contínuo, publique o app (“Em produção”); sem verificação ele mostra um aviso, mas funciona para até 100 usuários.",
  },
  tiktok: {
    steps: [
      "Crie uma conta em developers.tiktok.com e um app (Manage apps › Connect an app).",
      "Adicione os produtos Login Kit e Content Posting API (ative Direct Post).",
      "Em Login Kit, cole o endereço de retorno mostrado abaixo (precisa ser HTTPS).",
      "Copie Client key e Client secret para o .env.local e reinicie o servidor.",
    ],
    note: "Até o TikTok aprovar o app (auditoria), os vídeos postados pela API ficam privados.",
  },
  instagram: {
    steps: [
      "A conta do Instagram precisa ser Profissional (Criador ou Empresa).",
      "Em developers.facebook.com, crie um app do tipo Empresa e adicione o produto Instagram › “API com login do Instagram”.",
      "Em “Configurar login comercial do Instagram”, cole o endereço de retorno mostrado abaixo (precisa ser HTTPS).",
      "Em Funções do app, adicione sua conta do Instagram como testadora e aceite o convite no Instagram.",
      "Copie o ID e a chave secreta do app do Instagram para o .env.local e reinicie o servidor.",
    ],
  },
};
