-- ============================================================
-- SPRINT 6 — Multi-produto no mesmo dia (Pós-MVP)
-- Migração incremental sobre o schema atual do MVP
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracao_turno_blocos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  configuracao_turno_id UUID NOT NULL REFERENCES configuracao_turno(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES produtos(id),
  descricao_bloco VARCHAR(200) NOT NULL,
  sequencia INTEGER NOT NULL,
  funcionarios_ativos INTEGER NOT NULL CHECK (funcionarios_ativos > 0),
  minutos_planejados INTEGER NOT NULL CHECK (minutos_planejados > 0),
  tp_produto_min DECIMAL(10,4) NOT NULL CHECK (tp_produto_min > 0),
  origem_tp VARCHAR(20) NOT NULL CHECK (origem_tp IN ('produto', 'manual')),
  meta_grupo INTEGER NOT NULL CHECK (meta_grupo >= 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('planejado', 'ativo', 'concluido')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(configuracao_turno_id, sequencia),
  CHECK (
    (origem_tp = 'produto' AND produto_id IS NOT NULL) OR
    (origem_tp = 'manual' AND produto_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_configuracao_turno_blocos_ativo_unico
  ON configuracao_turno_blocos(configuracao_turno_id)
  WHERE status = 'ativo';

CREATE INDEX IF NOT EXISTS idx_configuracao_turno_blocos_configuracao
  ON configuracao_turno_blocos(configuracao_turno_id, sequencia);

CREATE INDEX IF NOT EXISTS idx_configuracao_turno_blocos_status
  ON configuracao_turno_blocos(configuracao_turno_id, status);

ALTER TABLE registros_producao
  ADD COLUMN IF NOT EXISTS configuracao_turno_bloco_id UUID
  REFERENCES configuracao_turno_blocos(id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_bloco
  ON registros_producao(configuracao_turno_bloco_id);

ALTER TABLE configuracao_turno_blocos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_configuracao_turno_blocos_autenticados" ON configuracao_turno_blocos
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "gestao_configuracao_turno_blocos_autenticados" ON configuracao_turno_blocos
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Validações
-- ============================================================
SELECT 'configuracao_turno_blocos ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_name = 'configuracao_turno_blocos'
);

SELECT 'registros_producao.configuracao_turno_bloco_id ok'
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_name = 'registros_producao'
    AND column_name = 'configuracao_turno_bloco_id'
);
