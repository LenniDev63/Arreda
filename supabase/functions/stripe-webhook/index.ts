import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Assinatura ausente', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    );
  } catch (err) {
    console.error('Falha na verificação do webhook', err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent;
      const bookingId = pi.metadata?.bookingId;

      await supabase
        .from('payments')
        .update({ stripe_status: 'paid', status: 'confirmado' })
        .eq('stripe_payment_intent_id', pi.id);

      if (bookingId) {
        await supabase
          .from('bookings')
          .update({ status: 'confirmada' })
          .eq('id', bookingId);
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from('payments')
        .update({ stripe_status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from('payments')
        .update({ stripe_status: 'canceled', status: 'cancelado' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
