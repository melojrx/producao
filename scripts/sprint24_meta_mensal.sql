-- ============================================================
-- SPRINT 24.1 — Meta mensal global da fabrica
-- Migracao incremental sobre o schema atual
-- ============================================================

CREATE TABLE IF NOT EXISTS metas_mensais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia DATE NOT NULL UNIQUE,
  meta_pecas INTEGER NOT NULL CHECK (meta_pecas > 0),
  dias_produtivos INTEGER NOT NULL CHECK (dias_produtivos > 0 AND dias_produtivos <= 31),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metas_mensais_competencia
  ON metas_mensais(competencia);

ALTER TABLE metas_mensais ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_metas_mensais_autenticados" ON metas_mensais
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Validacoes
-- ============================================================
SELECT 'metas_mensais ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = 'metas_mensais'
);

SELECT 'metas_mensais.competencia ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'metas_mensais'
    AND column_name = 'competencia'
);
