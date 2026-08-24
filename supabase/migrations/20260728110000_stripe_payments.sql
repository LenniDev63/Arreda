/*
# Arreda — Integração Stripe (Payment Intents)

Adapta a tabela `payments` existente para suportar Stripe Checkout embutido,
mantendo colunas legadas (Asaas) para compatibilidade futura com Stripe Connect.
*/

-- Colunas Stripe na tabela payments existente
DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_payment_intent_id text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_client_secret text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN currency text NOT NULL DEFAULT 'brl';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE payments ADD COLUMN stripe_status text
    CHECK (stripe_status IS NULL OR stripe_status IN (
      'pending', 'processing', 'paid', 'failed', 'refunded', 'canceled'
    ));
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_pi
  ON payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- RLS: clientes veem pagamentos das suas reservas (já existe via booking)
-- Inserts/updates continuam restritos ao service_role (Edge Functions)
