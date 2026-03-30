-- ============================================================
-- SPRINT 6.2 — Usuarios do sistema (V2)
-- Migração incremental sobre o schema atual
-- ============================================================

CREATE TABLE IF NOT EXISTS usuarios_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  papel VARCHAR(20) NOT NULL CHECK (papel IN ('admin', 'supervisor')),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_sistema_auth_user_id
  ON usuarios_sistema(auth_user_id);

ALTER TABLE usuarios_sistema ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_proprio_usuario_sistema" ON usuarios_sistema
    FOR SELECT USING (auth.uid() = auth_user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Bootstrap do primeiro admin:
-- 1. crie ou confirme o usuário em auth.users
-- 2. insira manualmente o primeiro administrador na tabela abaixo
--
-- Exemplo:
-- INSERT INTO public.usuarios_sistema (auth_user_id, nome, email, papel, ativo)
-- VALUES (
--   'UUID_DO_AUTH_USER',
--   'Administrador Inicial',
--   'admin@empresa.com',
--   'admin',
--   true
-- );
--
-- A partir desse primeiro admin, o cadastro de novos admins e supervisores
-- deve ser feito pela tela /admin/usuarios.

-- ============================================================
-- Validações
-- ============================================================
SELECT 'usuarios_sistema ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = 'usuarios_sistema'
);

SELECT 'usuarios_sistema.auth_user_id ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'usuarios_sistema'
    AND column_name = 'auth_user_id'
);
