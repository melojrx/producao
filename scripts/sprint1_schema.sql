-- ============================================================
-- SPRINT 1 — Schema completo
-- Executar no Supabase SQL Editor (uma vez, em ordem)
-- https://supabase.com/dashboard/project/jsuufbgdcqxogimmocof/sql
-- ============================================================

-- 1.1 tipos_maquina
CREATE TABLE IF NOT EXISTS tipos_maquina (
  codigo VARCHAR(10) PRIMARY KEY,
  nome VARCHAR(50) NOT NULL,
  descricao TEXT
);

INSERT INTO tipos_maquina VALUES
  ('rt',  'Máquina Reta', 'Ponto fixo, costura reta'),
  ('ov',  'Overloque', 'Corta e cose simultaneamente'),
  ('2ag', 'Duas Agulhas', 'Costura paralela dupla'),
  ('gal', 'Galoneira', 'Ponto corrente cobrindo borda'),
  ('man', 'Manual', 'Operação manual sem máquina'),
  ('bot', 'Botoneira', 'Pregar botões'),
  ('cas', 'Caseadeira', 'Fazer casas de botão')
ON CONFLICT DO NOTHING;

-- 1.2 operadores
CREATE TABLE IF NOT EXISTS operadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  matricula VARCHAR(20) UNIQUE NOT NULL,
  setor VARCHAR(50),
  funcao VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'inativo', 'afastado')),
  qr_code_token VARCHAR(64) UNIQUE NOT NULL
    DEFAULT encode(gen_random_bytes(32), 'hex'),
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 maquinas
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  tipo_maquina_codigo VARCHAR(10) REFERENCES tipos_maquina(codigo),
  modelo VARCHAR(100),
  marca VARCHAR(50),
  numero_patrimonio VARCHAR(50),
  setor VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'parada', 'manutencao')),
  qr_code_token VARCHAR(64) UNIQUE NOT NULL
    DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 operacoes
CREATE TABLE IF NOT EXISTS operacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  imagem_url TEXT,
  tipo_maquina_codigo VARCHAR(10) REFERENCES tipos_maquina(codigo),
  tempo_padrao_min DECIMAL(8,6) NOT NULL,
  meta_hora INTEGER,
  meta_dia INTEGER,
  qr_code_token VARCHAR(64) UNIQUE NOT NULL
    DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 produtos + produto_operacoes
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referencia VARCHAR(20) UNIQUE NOT NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  imagem_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produto_operacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  operacao_id UUID REFERENCES operacoes(id),
  sequencia INTEGER NOT NULL,
  UNIQUE(produto_id, sequencia)
);

-- 1.6 registros_producao
CREATE TABLE IF NOT EXISTS registros_producao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  operador_id UUID REFERENCES operadores(id) NOT NULL,
  maquina_id UUID REFERENCES maquinas(id),
  operacao_id UUID REFERENCES operacoes(id) NOT NULL,
  produto_id UUID REFERENCES produtos(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  turno VARCHAR(10) CHECK (turno IN ('manha', 'tarde', 'noite')),
  data_producao DATE DEFAULT CURRENT_DATE,
  hora_registro TIMESTAMPTZ DEFAULT NOW(),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_data     ON registros_producao(data_producao);
CREATE INDEX IF NOT EXISTS idx_registros_operador ON registros_producao(operador_id, data_producao);
CREATE INDEX IF NOT EXISTS idx_registros_hora     ON registros_producao(hora_registro);

-- 1.7 Views analíticas
CREATE OR REPLACE VIEW vw_producao_hoje AS
SELECT
  o.id AS operador_id,
  o.nome AS operador_nome,
  o.status AS operador_status,
  COUNT(rp.id) AS total_registros,
  COALESCE(SUM(rp.quantidade), 0) AS total_pecas,
  COALESCE(SUM(rp.quantidade * op.tempo_padrao_min), 0) AS minutos_produtivos,
  COALESCE(ROUND(
    (SUM(rp.quantidade * op.tempo_padrao_min) / 540) * 100, 2
  ), 0) AS eficiencia_pct
FROM operadores o
LEFT JOIN registros_producao rp
  ON rp.operador_id = o.id AND rp.data_producao = CURRENT_DATE
LEFT JOIN operacoes op ON op.id = rp.operacao_id
WHERE o.status = 'ativo'
GROUP BY o.id, o.nome, o.status
ORDER BY eficiencia_pct DESC NULLS LAST;

CREATE OR REPLACE VIEW vw_status_maquinas AS
SELECT
  m.id,
  m.codigo,
  tm.nome AS tipo_nome,
  m.status,
  MAX(rp.hora_registro) AS ultimo_uso,
  EXTRACT(EPOCH FROM (NOW() - MAX(rp.hora_registro)))/60 AS minutos_sem_uso
FROM maquinas m
JOIN tipos_maquina tm ON tm.codigo = m.tipo_maquina_codigo
LEFT JOIN registros_producao rp
  ON rp.maquina_id = m.id AND rp.data_producao = CURRENT_DATE
GROUP BY m.id, m.codigo, tm.nome, m.status;

CREATE OR REPLACE VIEW vw_producao_por_hora AS
SELECT
  DATE_TRUNC('hour', hora_registro) AS hora,
  COUNT(*) AS total_registros,
  SUM(quantidade) AS total_pecas
FROM registros_producao
WHERE data_producao = CURRENT_DATE
GROUP BY DATE_TRUNC('hour', hora_registro)
ORDER BY hora;

-- 1.8 Row Level Security
ALTER TABLE registros_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE operadores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE operacoes          ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_publica_operadores" ON operadores FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_publica_maquinas" ON maquinas FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_publica_operacoes" ON operacoes FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "insercao_producao_publica" ON registros_producao
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_producao_autenticados" ON registros_producao
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Validações (rodar após executar o schema)
-- ============================================================
SELECT COUNT(*) AS tipos FROM tipos_maquina;       -- esperado: 7
SELECT 'operadores ok' WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operadores');
SELECT 'maquinas ok'   WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maquinas');
SELECT 'operacoes ok'  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operacoes');
SELECT 'registros ok'  WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'registros_producao');
SELECT * FROM vw_producao_hoje;
SELECT * FROM vw_status_maquinas;
