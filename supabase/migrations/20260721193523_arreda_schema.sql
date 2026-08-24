/*
# Arreda — Schema inicial da plataforma de aluguel de acomodações

## Visão geral
Cria o schema completo do Arreda: perfis de usuário (proprietários e clientes),
imóveis com fotos/comodidades/preços/disponibilidade, reservas, pagamentos (Asaas),
contas de pagamento dos proprietários e avaliações.

## Novas tabelas
- `profiles` — extensão de auth.users com nome, tipo (owner/client), avatar, telefone, dados Asaas.
- `properties` — imóveis anunciados por proprietários.
- `property_photos` — fotos de cada imóvel (ordem).
- `property_amenities` — comodidades por imóvel.
- `rental_pricing` — preços por tipo de locação (diaria/semanal/mensal).
- `availability_blocks` — bloqueios de datas por imóvel (reserva ou indisponibilidade manual).
- `bookings` — reservas (status: pendente/aguardando_pagamento/paga/confirmada/recusada/cancelada/concluída).
- `payments` — pagamentos via Asaas (charge id, método, status, split comissão/repasse).
- `owner_payment_accounts` — subconta Asaas de cada proprietário.
- `reviews` — avaliações de imóveis por clientes (apenas após estadia confirmada).

## Segurança (RLS)
- profiles: leitura somente do próprio usuário.
- properties, property_photos, property_amenities, rental_pricing, reviews: leitura pública (anon + authenticated).
- Escrita de imóveis e derivados: somente o proprietário (owner_id = auth.uid()).
- bookings: cliente lê/edita as suas; proprietário lê as dos seus imóveis e aprova/recusa.
- payments: cliente lê os seus; proprietário lê dos seus imóveis; service role cria/atualiza.
- owner_payment_accounts: somente o próprio proprietário.
- availability_blocks: leitura pública; escrita pelo proprietário; inserção service role em reservas.

## Observações
1. Colunas de dono usam DEFAULT auth.uid() para inserts do frontend funcionarem.
2. Trigger `on_auth_user_created` cria perfil automaticamente no signup (tipo via user_meta_data).
3. Storage bucket `property-photos` público para leitura.
4. Tipos enum para tipo_locacao, booking_status, payment_method, payment_status.
5. Política de cancelamento: reembolso total se cancelado >= 3 dias antes do check-in.
*/

-- =========================================================
-- EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- ENUMS
-- =========================================================
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('client', 'owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rental_type AS ENUM ('diaria', 'semanal', 'mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pendente','aguardando_pagamento','paga','confirmada','recusada','cancelada','concluida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('pix','boleto','cartao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pendente','confirmado','estornado','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  tipo user_type NOT NULL DEFAULT 'client',
  avatar_url text,
  telefone text,
  asaas_account_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- PROPERTIES
-- =========================================================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  cidade text NOT NULL,
  bairro text NOT NULL,
  endereco text NOT NULL DEFAULT '',
  quartos int NOT NULL DEFAULT 1,
  banheiros int NOT NULL DEFAULT 1,
  capacidade int NOT NULL DEFAULT 1,
  regras text NOT NULL DEFAULT '',
  politica_cancelamento text NOT NULL DEFAULT 'Reembolso total até 3 dias antes do check-in.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_properties_cidade ON properties(cidade);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);

DROP POLICY IF EXISTS "select_properties_public" ON properties;
CREATE POLICY "select_properties_public" ON properties FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_properties" ON properties;
CREATE POLICY "insert_own_properties" ON properties FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_properties" ON properties;
CREATE POLICY "update_own_properties" ON properties FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_properties" ON properties;
CREATE POLICY "delete_own_properties" ON properties FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- =========================================================
-- PROPERTY PHOTOS
-- =========================================================
CREATE TABLE IF NOT EXISTS property_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_photos_property ON property_photos(property_id);

DROP POLICY IF EXISTS "select_photos_public" ON property_photos;
CREATE POLICY "select_photos_public" ON property_photos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_photos_owner" ON property_photos;
CREATE POLICY "insert_photos_owner" ON property_photos FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_photos_owner" ON property_photos;
CREATE POLICY "update_photos_owner" ON property_photos FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_photos_owner" ON property_photos;
CREATE POLICY "delete_photos_owner" ON property_photos FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

-- =========================================================
-- PROPERTY AMENITIES
-- =========================================================
CREATE TABLE IF NOT EXISTS property_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, amenity_name)
);
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_amenities_property ON property_amenities(property_id);

DROP POLICY IF EXISTS "select_amenities_public" ON property_amenities;
CREATE POLICY "select_amenities_public" ON property_amenities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_amenities_owner" ON property_amenities;
CREATE POLICY "insert_amenities_owner" ON property_amenities FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_amenities_owner" ON property_amenities;
CREATE POLICY "delete_amenities_owner" ON property_amenities FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

-- =========================================================
-- RENTAL PRICING
-- =========================================================
CREATE TABLE IF NOT EXISTS rental_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tipo rental_type NOT NULL,
  preco numeric(10,2) NOT NULL CHECK (preco >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, tipo)
);
ALTER TABLE rental_pricing ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_pricing_property ON rental_pricing(property_id);

DROP POLICY IF EXISTS "select_pricing_public" ON rental_pricing;
CREATE POLICY "select_pricing_public" ON rental_pricing FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_pricing_owner" ON rental_pricing;
CREATE POLICY "insert_pricing_owner" ON rental_pricing FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_pricing_owner" ON rental_pricing;
CREATE POLICY "update_pricing_owner" ON rental_pricing FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_pricing_owner" ON rental_pricing;
CREATE POLICY "delete_pricing_owner" ON rental_pricing FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

-- =========================================================
-- AVAILABILITY BLOCKS
-- =========================================================
CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  motivo text NOT NULL DEFAULT 'indisponivel',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio)
);
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_avail_property ON availability_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_avail_dates ON availability_blocks(data_inicio, data_fim);

DROP POLICY IF EXISTS "select_avail_public" ON availability_blocks;
CREATE POLICY "select_avail_public" ON availability_blocks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_avail_owner" ON availability_blocks;
CREATE POLICY "insert_avail_owner" ON availability_blocks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_avail_owner" ON availability_blocks;
CREATE POLICY "delete_avail_owner" ON availability_blocks FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_avail_service" ON availability_blocks;
CREATE POLICY "insert_avail_service" ON availability_blocks FOR INSERT
  TO service_role WITH CHECK (true);

-- =========================================================
-- OWNER PAYMENT ACCOUNTS
-- =========================================================
CREATE TABLE IF NOT EXISTS owner_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  gateway_account_id text NOT NULL,
  cpf_cnpj text,
  nome_beneficiario text,
  banco text,
  agencia text,
  conta text,
  tipo_conta text,
  status_verificacao text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE owner_payment_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_account" ON owner_payment_accounts;
CREATE POLICY "select_own_payment_account" ON owner_payment_accounts FOR SELECT
  TO authenticated USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "insert_own_payment_account" ON owner_payment_accounts;
CREATE POLICY "insert_own_payment_account" ON owner_payment_accounts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "update_own_payment_account" ON owner_payment_accounts;
CREATE POLICY "update_own_payment_account" ON owner_payment_accounts FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- =========================================================
-- BOOKINGS
-- =========================================================
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_locacao rental_type NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  valor_total numeric(10,2) NOT NULL CHECK (valor_total >= 0),
  status booking_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim > data_inicio)
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

DROP POLICY IF EXISTS "select_bookings" ON bookings;
CREATE POLICY "select_bookings" ON bookings FOR SELECT
  TO authenticated USING (
    auth.uid() = client_id
    OR EXISTS (SELECT 1 FROM properties p WHERE p.id = bookings.property_id AND p.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_bookings" ON bookings;
CREATE POLICY "insert_bookings" ON bookings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "update_bookings" ON bookings;
CREATE POLICY "update_bookings" ON bookings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = bookings.property_id AND p.owner_id = auth.uid())
    OR auth.uid() = client_id
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM properties p WHERE p.id = bookings.property_id AND p.owner_id = auth.uid())
    OR auth.uid() = client_id
  );

DROP POLICY IF EXISTS "update_bookings_service" ON bookings;
CREATE POLICY "update_bookings_service" ON bookings FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

-- =========================================================
-- PAYMENTS
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  gateway_charge_id text,
  metodo payment_method,
  status payment_status NOT NULL DEFAULT 'pendente',
  valor_total numeric(10,2) NOT NULL CHECK (valor_total >= 0),
  valor_comissao_plataforma numeric(10,2) NOT NULL DEFAULT 0,
  valor_repasse_proprietario numeric(10,2) NOT NULL DEFAULT 0,
  pix_code text,
  boleto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);

DROP POLICY IF EXISTS "select_payments" ON payments;
CREATE POLICY "select_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND b.client_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM bookings b
      JOIN properties p ON p.id = b.property_id
      WHERE b.id = payments.booking_id AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_payments_service" ON payments;
CREATE POLICY "insert_payments_service" ON payments FOR INSERT
  TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "update_payments_service" ON payments;
CREATE POLICY "update_payments_service" ON payments FOR UPDATE
  TO service_role USING (true) WITH CHECK (true);

-- =========================================================
-- REVIEWS
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  client_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  nota int NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, client_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);

DROP POLICY IF EXISTS "select_reviews_public" ON reviews;
CREATE POLICY "select_reviews_public" ON reviews FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_reviews" ON reviews;
CREATE POLICY "insert_reviews" ON reviews FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.property_id = reviews.property_id
        AND b.client_id = auth.uid()
        AND b.status = 'concluida'
    )
  );

DROP POLICY IF EXISTS "delete_reviews_own" ON reviews;
CREATE POLICY "delete_reviews_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- =========================================================
-- TRIGGER: auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'tipo')::user_type, 'client')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- STORAGE BUCKET
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_property_photos" ON storage.objects;
CREATE POLICY "read_property_photos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "insert_property_photos" ON storage.objects;
CREATE POLICY "insert_property_photos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'property-photos');

DROP POLICY IF EXISTS "delete_property_photos" ON storage.objects;
CREATE POLICY "delete_property_photos" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'property-photos');

-- =========================================================
-- updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS properties_updated_at ON properties;
CREATE TRIGGER properties_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS bookings_updated_at ON bookings;
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS owner_payment_accounts_updated_at ON owner_payment_accounts;
CREATE TRIGGER owner_payment_accounts_updated_at BEFORE UPDATE ON owner_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
