/*
# Atualizar trigger handle_new_user para incluir cpf_cnpj

O trigger on_auth_user_created cria o perfil automaticamente no signup.
Agora precisamos que ele também salve o cpf_cnpj passado via user_meta_data
quando o usuário se cadastra como proprietário.

## Alteração
- Recria a função handle_new_user() para ler raw_user_meta_data->>'cpf_cnpj'
  e inserir na coluna cpf_cnpj de profiles.
*/
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, tipo, cpf_cnpj)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'tipo')::user_type, 'client'),
    NULLIF(NEW.raw_user_meta_data->>'cpf_cnpj', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    tipo = EXCLUDED.tipo,
    cpf_cnpj = COALESCE(NULLIF(EXCLUDED.cpf_cnpj, ''), profiles.cpf_cnpj);
  RETURN NEW;
END;
$$;
