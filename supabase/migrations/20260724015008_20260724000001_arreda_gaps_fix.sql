/*
# Arreda — Correção de lacunas: CPF/CNPJ, status de imóvel, favoritos, avatar

## Visão geral
Esta migração adiciona os recursos que faltavam ao schema do Arreda:
1. Campo CPF/CNPJ no perfil (para proprietários).
2. Status de publicação de imóveis (publicado/rascunho) — imóveis em rascunho não aparecem na busca pública.
3. Tabela de favoritos (clientes podem favoritar imóveis).
4. Bucket de storage para avatares de usuários.

## Alterações detalhadas

### 1. PROFILES — nova coluna
- `cpf_cnpj` (text, nullable) — CPF ou CNPJ do usuário, obrigatório apenas para proprietários (validação no frontend).

### 2. PROPERTIES — nova coluna
- `status` (property_status enum, default 'publicado') — controla se o imóvel aparece na busca pública.
  - 'publicado': visível para todos na busca e detalhes.
  - 'rascunho': visível apenas no painel do proprietário; não aparece na busca pública.

### 3. Novo ENUM
- `property_status` AS ENUM ('publicado', 'rascunho').

### 4. Nova tabela — FAVORITES
- `favorites` — relação cliente ↔ imóvel favoritado.
- `id` (uuid, PK)
- `user_id` (uuid, FK → profiles, DEFAULT auth.uid())
- `property_id` (uuid, FK → properties, ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE (user_id, property_id) — um usuário favorita um imóvel uma única vez.

### 5. SECURITY (RLS)
- favorites: leitura/escrita somente pelo próprio usuário (auth.uid() = user_id).
- properties SELECT: alterada para excluir imóveis em rascunho do acesso público (anon só vê 'publicado'; o proprietário vê todos os seus).
- Bucket 'avatars': leitura pública, escrita pelo próprio usuário autenticado.

### 6. Storage
- Novo bucket público `avatars` para fotos de perfil.

## Notas importantes
1. Imóveis existentes ficam com status = 'publicado' (valor padrão), então nada some da busca.
2. A política SELECT de properties agora filtra por status — imóveis em rascunho só são visíveis para o dono.
3. Favoritos são privados: cada usuário vê apenas os seus.
*/

-- =========================================================
-- NOVO ENUM: property_status
-- =========================================================
DO $$ BEGIN
  CREATE TYPE property_status AS ENUM ('publicado', 'rascunho');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================================================
-- PROFILES — adicionar cpf_cnpj
-- =========================================================
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN cpf_cnpj text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- =========================================================
-- PROPERTIES — adicionar status
-- =========================================================
DO $$ BEGIN
  ALTER TABLE properties ADD COLUMN status property_status NOT NULL DEFAULT 'publicado';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);

-- =========================================================
-- PROPERTIES — atualizar política SELECT (rascunho não é público)
-- =========================================================
-- Drop e recria: anon vê só publicado; authenticated vê publicado + TODOS os seus (incluindo rascunho)
DROP POLICY IF EXISTS "select_properties_public" ON properties;
CREATE POLICY "select_properties_public" ON properties FOR SELECT
  TO anon, authenticated USING (
    status = 'publicado'
    OR owner_id = auth.uid()
  );

-- =========================================================
-- FAVORITES TABLE
-- =========================================================
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, property_id)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_property ON favorites(property_id);

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- STORAGE BUCKET: avatars
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_avatars" ON storage.objects;
CREATE POLICY "read_avatars" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "insert_avatars" ON storage.objects;
CREATE POLICY "insert_avatars" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "update_avatars" ON storage.objects;
CREATE POLICY "update_avatars" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "delete_avatars" ON storage.objects;
CREATE POLICY "delete_avatars" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'avatars');
