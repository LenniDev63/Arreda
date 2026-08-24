# Implementação — Integração Stripe (Checkout Embutido) no Arreda

## Objetivo

Integrar o Stripe como gateway de pagamento no projeto **Arreda**, usando **checkout embutido**
(Payment Intents API + Stripe Elements), com backend em **Supabase Edge Functions** e
persistência de status de pagamento no banco. A arquitetura deve ficar preparada para,
numa fase futura, evoluir para **Stripe Connect** (split de repasse aos locatários),
sem exigir refatoração estrutural.

Stack do projeto: React 19 + Vite + TypeScript, Tailwind, shadcn/ui, TanStack Query,
React Hook Form, Zod, Supabase (Auth + DB + Edge Functions).

---

## Passo 0 — Dependência do frontend (ação manual do usuário)

Antes de começar a etapa de frontend, pare e peça para o usuário rodar:

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

Não rode esse comando pelo agente — apenas avise quando chegar nesse ponto e aguarde confirmação
antes de prosseguir com os arquivos que importam essas libs.

---

## Passo 1 — Migration SQL (supabase/migrations)

Criar o arquivo `supabase/migrations/<timestamp>_create_payments_table.sql`
(o agente deve gerar o timestamp no formato `YYYYMMDDHHMMSS` correspondente ao momento da criação).

```sql
-- Tabela de pagamentos
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stripe_payment_intent_id text unique,
  stripe_client_secret text,
  amount integer not null, -- em centavos
  currency text not null default 'brl',
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'refunded', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payments_booking_id on public.payments(booking_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_stripe_pi on public.payments(stripe_payment_intent_id);

-- Trigger para updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- RLS
alter table public.payments enable row level security;

create policy "Usuários veem apenas seus próprios pagamentos"
  on public.payments for select
  using (auth.uid() = user_id);

-- Inserts e updates de pagamento só via service_role (Edge Functions), nunca client-side
create policy "Bloqueia insert direto do client"
  on public.payments for insert
  with check (false);

create policy "Bloqueia update direto do client"
  on public.payments for update
  using (false);
```

> Ajustar o nome/colunas da tabela `bookings` caso o schema real do Arreda use nomes diferentes —
> o agente deve conferir as migrations existentes antes de aplicar esta.

Rodar localmente com:
```bash
supabase db reset
```
ou aplicar em produção com:
```bash
supabase db push
```

---

## Passo 2 — Secrets do Supabase

Documentar no `implementation.md` (não executar automaticamente, orientar o usuário):

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

O `STRIPE_WEBHOOK_SECRET` só existe depois do Passo 4 (deploy + cadastro do endpoint no Stripe
Dashboard) — sinalizar isso claramente na ordem de execução.

---

## Passo 3 — Edge Function: criar Payment Intent

Criar `supabase/functions/create-payment-intent/index.ts`:

```typescript
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
});

const requestSchema = z.object({
  bookingId: z.string().uuid(),
  amount: z.number().int().positive(),
});

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401 });
    }

    const body = requestSchema.parse(await req.json());

    // Validar booking pertence ao usuário e recuperar valor real do servidor
    // (nunca confiar em amount vindo do client em produção — buscar da tabela bookings)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, total_amount, user_id')
      .eq('id', body.bookingId)
      .single();

    if (bookingError || !booking || booking.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Reserva inválida' }), { status: 403 });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.total_amount, // usar o valor do banco, não o enviado pelo client
      currency: 'brl',
      automatic_payment_methods: { enabled: true },
      metadata: { bookingId: booking.id, userId: userData.user.id },
    });

    await supabase.from('payments').insert({
      user_id: userData.user.id,
      booking_id: booking.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_client_secret: paymentIntent.client_secret,
      amount: booking.total_amount,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Erro ao criar payment intent', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
});
```

Deploy:
```bash
supabase functions deploy create-payment-intent
```
(mantém verificação de JWT — sem `--no-verify-jwt`, pois esta function exige usuário autenticado)

---

## Passo 4 — Edge Function: webhook

Criar `supabase/functions/stripe-webhook/index.ts`:

```typescript
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
      await supabase
        .from('payments')
        .update({ status: 'paid' })
        .eq('stripe_payment_intent_id', pi.id);

      // Aqui: confirmar a reserva (booking) automaticamente, se aplicável
      break;
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }
    case 'payment_intent.canceled': {
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from('payments')
        .update({ status: 'canceled' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
    }
    default:
      // eventos não tratados são ignorados intencionalmente
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

Deploy (sem verificação de JWT, pois quem chama é o Stripe, não um usuário logado):
```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

Depois do deploy, cadastrar no Stripe Dashboard → Developers → Webhooks:
```
https://<project-ref>.supabase.co/functions/v1/stripe-webhook
```
Eventos a assinar: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.

Copiar o `Signing secret` gerado e só então rodar:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Passo 5 — Frontend: services

Criar `src/services/paymentService.ts`:

```typescript
import { supabase } from '@/services/supabaseClient';

interface CreatePaymentIntentParams {
  bookingId: string;
  amount: number;
}

interface CreatePaymentIntentResult {
  clientSecret: string;
}

export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResult> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResult>(
    'create-payment-intent',
    { body: params }
  );

  if (error || !data) {
    throw new Error(error?.message ?? 'Falha ao iniciar pagamento');
  }

  return data;
}
```

> Ajustar o import de `supabase` para o caminho real do client já existente no projeto.

---

## Passo 6 — Frontend: hook

Criar `src/hooks/usePaymentIntent.ts`:

```typescript
import { useMutation } from '@tanstack/react-query';
import { createPaymentIntent } from '@/services/paymentService';

export function usePaymentIntent() {
  return useMutation({
    mutationFn: createPaymentIntent,
  });
}
```

---

## Passo 7 — Frontend: componente de checkout embutido

Criar `src/components/CheckoutForm/CheckoutForm.tsx`:

```tsx
import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface CheckoutFormProps {
  onSuccess: () => void;
}

export function CheckoutForm({ onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/reserva/sucesso`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message ?? 'Erro ao processar pagamento');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {errorMessage && (
        <p className="text-sm text-red-500 mt-2">{errorMessage}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || isSubmitting}
        className="mt-4 w-full rounded-md bg-orange-500 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Processando...' : 'Confirmar pagamento'}
      </button>
    </form>
  );
}

// index.ts (re-export)
// export { CheckoutForm } from './CheckoutForm';
```

Criar `src/components/CheckoutForm/index.ts`:
```typescript
export { CheckoutForm } from './CheckoutForm';
```

---

## Passo 8 — Frontend: página/feature que envolve o Elements Provider

Criar (ou ajustar) `src/pages/Checkout/CheckoutPage.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useParams, useNavigate } from 'react-router-dom';
import { usePaymentIntent } from '@/hooks/usePaymentIntent';
import { CheckoutForm } from '@/components/CheckoutForm';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function CheckoutPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { mutate, data, isPending, isError } = usePaymentIntent();
  const [amount, setAmount] = useState<number | null>(null);

  useEffect(() => {
    if (bookingId && amount !== null) {
      mutate({ bookingId, amount });
    }
    // amount deve vir do fluxo de reserva já existente (ex: contexto/estado da reserva)
  }, [bookingId, amount, mutate]);

  if (isPending) return <p>Carregando checkout...</p>;
  if (isError) return <p>Não foi possível iniciar o pagamento.</p>;
  if (!data?.clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret: data.clientSecret }}>
      <CheckoutForm onSuccess={() => navigate('/reserva/sucesso')} />
    </Elements>
  );
}
```

> Adaptar a origem de `amount` e a rota conforme o fluxo real de reservas já existente no Arreda
> (o agente deve localizar onde o valor da reserva é calculado antes desta tela).

---

## Passo 9 — Variável de ambiente do frontend

Adicionar em `.env` (e `.env.example`):
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Passo 10 — Checklist final antes de considerar concluído

- [ ] Migration aplicada (`payments` criada com RLS)
- [ ] `STRIPE_SECRET_KEY` configurada nos secrets do Supabase
- [ ] Edge Function `create-payment-intent` deployada e testada
- [ ] Edge Function `stripe-webhook` deployada, endpoint cadastrado no Stripe, `STRIPE_WEBHOOK_SECRET` configurado
- [ ] `npm install @stripe/stripe-js @stripe/react-stripe-js` confirmado pelo usuário
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY` presente no `.env`
- [ ] Fluxo testado ponta a ponta com cartão de teste `4242 4242 4242 4242`
- [ ] Nenhuma secret key exposta no frontend (apenas a publishable key)

---

## Observação sobre evolução futura (Stripe Connect)

Esta estrutura já isola toda a lógica de pagamento em `paymentService` + Edge Functions,
então quando o split para locatários for implementado, a mudança fica concentrada em:
1. Adicionar `stripe.accounts` (Connect Express) por locatário na tabela de usuários/perfis
2. Ajustar `create-payment-intent` para incluir `application_fee_amount` e `transfer_data.destination`
3. Nenhuma mudança estrutural é necessária no frontend além dos campos de valor exibidos

Não implementar isso agora — apenas manter a arquitetura compatível.
