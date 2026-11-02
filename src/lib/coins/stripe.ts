import "server-only";
import Stripe from "stripe";
import { appUrl } from "@/lib/oauth/providers";
import { CURRENCIES, formatCoins, type Quote } from "./pricing";
import { createPurchase, creditPurchase } from "./wallet";

let client: Stripe | null = null;

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe não configurada (STRIPE_SECRET_KEY).");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/**
 * Abre o checkout da Stripe para comprar CityCoins com valor livre na moeda escolhida.
 * A cotação fica travada no momento do checkout: o que entra na carteira é o que foi mostrado.
 */
export async function createCoinCheckout(userId: string, email: string | undefined, q: Quote): Promise<string> {
  const base = appUrl();
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    client_reference_id: userId,
    customer_email: email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: q.currency,
          unit_amount: q.amountMinor,
          product_data: {
            name: `${formatCoins(q.coins)} CityCoins`,
            description: `Créditos da Viral City (1 CityCoin = US$ 0,01). Pago em ${CURRENCIES[q.currency].label.toLowerCase()}.`,
          },
        },
      },
    ],
    metadata: { user_id: userId, coins: String(q.coins), usd_cents: String(q.usdCents) },
    success_url: `${base}/painel/carteira?compra=ok&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/painel/carteira?compra=cancelada`,
  });
  if (!session.url) throw new Error("A Stripe não devolveu o link do checkout.");
  await createPurchase({
    userId,
    sessionId: session.id,
    currency: q.currency,
    amountMinor: q.amountMinor,
    usdCents: q.usdCents,
    coins: q.coins,
    rate: q.rate,
  });
  return session.url;
}

/**
 * Confere na Stripe se a sessão foi paga e credita (idempotente). Usado pelo webhook e,
 * como reforço, pela tela de sucesso (útil quando o webhook ainda não chegou).
 */
export async function settleCheckout(sessionId: string, userId?: string): Promise<number | null> {
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (userId && session.client_reference_id !== userId) return null;
  if (session.payment_status !== "paid") return null;
  return creditPurchase(session.id);
}
