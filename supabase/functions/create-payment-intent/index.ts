import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const requestSchema = z.object({
  bookingId: z.string().uuid(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = requestSchema.parse(await req.json());

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, valor_total, client_id, status')
      .eq('id', body.bookingId)
      .single();

    if (bookingError || !booking || booking.client_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Reserva inválida' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (booking.status !== 'aguardando_pagamento') {
      return new Response(JSON.stringify({ error: 'Esta reserva não está aguardando pagamento' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, stripe_client_secret, stripe_status')
      .eq('booking_id', booking.id)
      .eq('stripe_status', 'paid')
      .maybeSingle();

    if (existingPayment) {
      return new Response(JSON.stringify({ error: 'Pagamento já realizado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('stripe_client_secret')
      .eq('booking_id', booking.id)
      .eq('stripe_status', 'pending')
      .not('stripe_client_secret', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pendingPayment?.stripe_client_secret) {
      return new Response(
        JSON.stringify({ clientSecret: pendingPayment.stripe_client_secret }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const amountInCents = Math.round(Number(booking.valor_total) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId: booking.id, userId: userData.user.id },
    });

    const { error: insertError } = await supabase.from('payments').insert({
      user_id: userData.user.id,
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_client_secret: paymentIntent.client_secret,
      valor_total: booking.valor_total,
      stripe_status: 'pending',
      status: 'pendente',
      currency: 'brl',
    });

    if (insertError) {
      console.error('Erro ao salvar pagamento', insertError);
      return new Response(JSON.stringify({ error: 'Erro ao registrar pagamento' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro ao criar payment intent', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
