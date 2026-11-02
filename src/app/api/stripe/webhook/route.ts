import type Stripe from "stripe";
import { NextResponse, type NextRequest } from "next/server";
import { settleCheckout, stripe } from "@/lib/coins/stripe";
import { expirePurchase } from "@/lib/coins/wallet";

/**
 * Webhook da Stripe: credita os CityCoins quando o pagamento é confirmado.
 * Fica fora do middleware (não tem sessão); a assinatura STRIPE_WEBHOOK_SECRET garante a origem.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Webhook não configurado." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await settleCheckout(session.id);
    } else if (event.type === "checkout.session.expired") {
      await expirePurchase(session.id);
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    // 500 faz a Stripe tentar de novo mais tarde; creditar é idempotente
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
