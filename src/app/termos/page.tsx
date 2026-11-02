import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, LegalPage, Section } from "@/components/legal-page";

export const metadata: Metadata = { title: "Termos de Uso — Viral City" };

const ext = "underline underline-offset-2 hover:text-ink";

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <p>
        Ao criar uma conta ou usar a Viral City, você concorda com estes termos. Se não concordar, não use o serviço.
      </p>

      <Section title="1. O serviço">
        <p>
          A Viral City transforma vídeos longos em cortes curtos (Shorts, Reels, TikToks) com ajuda de
          inteligência artificial e permite publicar ou agendar esses cortes nas contas que você conectar.
        </p>
      </Section>

      <Section title="2. Sua conta">
        <p>
          Você precisa ter pelo menos 18 anos, ou autorização de um responsável. Mantenha sua senha em segredo:
          você responde pelo que acontece na sua conta.
        </p>
      </Section>

      <Section title="3. Seu conteúdo">
        <p>
          Os vídeos e cortes continuam sendo seus. Você nos dá apenas a permissão necessária para processar,
          guardar e publicar esse conteúdo conforme você pedir.
        </p>
        <p>
          Você garante que tem os direitos sobre o que envia e que o conteúdo não viola leis, direitos autorais
          ou as regras das plataformas onde será publicado. Podemos remover conteúdo ou suspender contas que
          desrespeitem isso.
        </p>
      </Section>

      <Section title="4. CityCoins">
        <ul className="list-disc space-y-2 pl-5">
          <li>CityCoins são créditos de uso da Viral City: 1 CityCoin equivale a US$ 0,01 no momento da compra.</li>
          <li>São gastos ao processar vídeos, de acordo com a duração, e o valor aparece antes de você confirmar.</li>
          <li>Se o processamento falhar por erro nosso, os CityCoins gastos voltam para o seu saldo.</li>
          <li>CityCoins não são dinheiro, não rendem juros e não podem ser transferidos ou trocados por dinheiro, salvo quando a lei exigir.</li>
          <li>Pedidos de reembolso de compras não usadas podem ser feitos em até 7 dias, pelo e-mail de contato.</li>
        </ul>
      </Section>

      <Section title="5. Contas conectadas">
        <p>
          Ao conectar YouTube, TikTok ou Instagram, você também segue os termos dessas plataformas, incluindo os{" "}
          <a className={ext} href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">Termos de Serviço do YouTube</a>.
          Só publicamos o que você mandar publicar, e você pode desconectar a conta quando quiser.
        </p>
      </Section>

      <Section title="6. Uso proibido">
        <p>
          Não use a Viral City para spam, para burlar limites das plataformas, para conteúdo ilegal ou de ódio,
          nem para tentar invadir, sobrecarregar ou copiar o serviço.
        </p>
      </Section>

      <Section title="7. Disponibilidade e responsabilidade">
        <p>
          Trabalhamos para manter o serviço no ar, mas ele é oferecido “como está”, sem garantia de
          funcionamento contínuo ou de resultados (como visualizações). Na medida permitida por lei, nossa
          responsabilidade fica limitada ao valor que você pagou nos últimos 3 meses.
        </p>
      </Section>

      <Section title="8. Encerramento">
        <p>
          Você pode excluir sua conta quando quiser. Podemos suspender ou encerrar contas que violem estes termos.
          O tratamento dos seus dados está descrito na <Link className={ext} href="/privacidade">Política de Privacidade</Link>.
        </p>
      </Section>

      <Section title="9. Mudanças e contato">
        <p>
          Podemos atualizar estes termos; a data no topo mostra a versão atual. Estes termos seguem as leis do
          Brasil. Dúvidas: <a className={ext} href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalPage>
  );
}
