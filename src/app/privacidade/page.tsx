import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = { title: "Política de Privacidade — Viral City" };

const ext = "underline underline-offset-2 hover:text-ink";

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <p>
        Esta política explica quais dados a Viral City coleta, como usa e quais são os seus direitos,
        de acordo com a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).
      </p>

      <Section title="1. Dados que coletamos">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Conta:</strong> nome, e-mail e senha (guardada só como hash). Se você entrar com o Google, recebemos nome, e-mail e foto do perfil.</li>
          <li><strong>Vídeos e conteúdo:</strong> os vídeos que você envia ou indica, as transcrições e os cortes gerados.</li>
          <li><strong>Contas conectadas:</strong> ao conectar YouTube, TikTok ou Instagram, guardamos os tokens de acesso (criptografados) e dados básicos do canal, como nome e foto.</li>
          <li><strong>Pagamentos:</strong> compras de CityCoins são processadas pela Stripe. Não recebemos nem guardamos dados do seu cartão; ficamos só com valor, moeda e status da compra.</li>
          <li><strong>Uso técnico:</strong> registros de acesso e erros necessários para manter o serviço funcionando e seguro.</li>
        </ul>
      </Section>

      <Section title="2. Como usamos os dados">
        <ul className="list-disc space-y-2 pl-5">
          <li>Criar e manter sua conta e sua sessão de login.</li>
          <li>Transcrever seus vídeos, encontrar os melhores trechos e gerar os cortes.</li>
          <li>Publicar ou agendar cortes nas contas que você conectou, somente quando você pedir.</li>
          <li>Controlar seu saldo de CityCoins e as compras.</li>
          <li>Responder a pedidos de suporte e cumprir obrigações legais.</li>
        </ul>
        <p>Não vendemos seus dados e não os usamos para publicidade.</p>
      </Section>

      <Section title="3. Dados do Google e do YouTube">
        <p>
          A Viral City usa os Serviços de API do YouTube. Com sua autorização, acessamos seu canal para ler
          informações básicas e enviar os vídeos que você escolher publicar. Ao usar esse recurso você também
          concorda com os{" "}
          <a className={ext} href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Termos de Serviço do YouTube</a>{" "}
          e com a{" "}
          <a className={ext} href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Política de Privacidade do Google</a>.
        </p>
        <p>
          O uso de informações recebidas das APIs do Google segue a{" "}
          <a className={ext} href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de uso limitado. Você pode desconectar o canal a qualquer momento no painel
          ou revogar o acesso em{" "}
          <a className={ext} href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">myaccount.google.com/permissions</a>.
        </p>
      </Section>

      <Section title="4. Com quem compartilhamos">
        <p>Apenas com fornecedores necessários para o serviço funcionar, e só o que cada um precisa:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Hospedagem e banco de dados (Vercel e Neon).</li>
          <li>Processamento de pagamentos (Stripe).</li>
          <li>Inteligência artificial para analisar transcrições e sugerir cortes (Anthropic).</li>
          <li>As redes sociais que você conectar, para publicar o que você pedir.</li>
        </ul>
        <p>Também podemos compartilhar dados quando a lei ou uma ordem judicial exigir.</p>
      </Section>

      <Section title="5. Por quanto tempo guardamos">
        <p>
          Mantemos seus dados enquanto sua conta existir. Ao excluir a conta, apagamos vídeos, cortes e tokens
          em até 30 dias, exceto registros que a lei nos obriga a guardar (como os de pagamento).
        </p>
      </Section>

      <Section title="6. Seus direitos">
        <p>
          Você pode pedir acesso, correção, portabilidade ou exclusão dos seus dados, e retirar consentimentos,
          escrevendo para <a className={ext} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="7. Segurança">
        <p>
          Usamos conexões HTTPS, senhas com hash, tokens criptografados e acesso restrito ao banco de dados.
          Nenhum sistema é 100% seguro, mas avisaremos você se algum incidente afetar seus dados.
        </p>
      </Section>

      <Section title="8. Mudanças nesta política">
        <p>Se mudarmos esta política, atualizaremos a data no topo e avisaremos no site quando a mudança for importante.</p>
      </Section>
    </LegalPage>
  );
}
