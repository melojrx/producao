import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:taDuqiUL6EuDWrre@db.jsuufbgdcqxogimmocof.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  family: 4,
})

async function run(label, sql) {
  try {
    const result = await client.query(sql)
    console.log(`✅ ${label}`)
    if (result.rows?.length) console.log('   →', JSON.stringify(result.rows))
  } catch (err) {
    console.error(`❌ ${label}: ${err.message}`)
  }
}

await client.connect()

// 1.1 — tipos_maquina
await run('1.1 tipos_maquina', `
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
`)
await run('1.1 contagem', `SELECT COUNT(*)::int AS total FROM tipos_maquina`)

// 1.2 — operadores
await run('1.2 operadores', `
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
`)
await run('1.2 teste inserção', `
  INSERT INTO operadores (nome, matricula) VALUES ('Teste Operador', 'TEST-001')
  ON CONFLICT (matricula) DO NOTHING
  RETURNING id, matricula, qr_code_token
`)

// 1.3 — maquinas
await run('1.3 maquinas', `
  CREATE TABLE IF NOT EXISTS maquinas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    marca VARCHAR(50),
    numero_patrimonio VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ativa'
      CHECK (status IN ('ativa', 'parada', 'manutencao')),
    qr_code_token VARCHAR(64) UNIQUE NOT NULL
      DEFAULT encode(gen_random_bytes(32), 'hex'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
`)
await run('1.3 teste inserção', `
  INSERT INTO maquinas (codigo, marca, modelo) VALUES ('TEST-M001', 'Teste', 'Modelo 1')
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id, codigo, qr_code_token
`)

// 1.4 — operacoes
await run('1.4 operacoes', `
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
`)
await run('1.4 teste inserção', `
  INSERT INTO operacoes (codigo, descricao, tipo_maquina_codigo, tempo_padrao_min, meta_hora, meta_dia)
  VALUES ('TEST-OP001', 'Operação teste', 'rt', 0.280000, 214, 1928)
  ON CONFLICT (codigo) DO NOTHING
  RETURNING id, codigo, tempo_padrao_min
`)

// 1.5 — produtos e produto_operacoes
await run('1.5 produtos', `
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
`)
await run('1.5 teste inserção', `
  WITH p AS (
    INSERT INTO produtos (referencia, nome) VALUES ('TEST-PROD', 'Produto Teste')
    ON CONFLICT (referencia) DO UPDATE SET nome = EXCLUDED.nome
    RETURNING id
  ),
  op AS (SELECT id FROM operacoes WHERE codigo = 'TEST-OP001' LIMIT 1)
  INSERT INTO produto_operacoes (produto_id, operacao_id, sequencia)
  SELECT p.id, op.id, 1 FROM p, op
  ON CONFLICT DO NOTHING
  RETURNING id
`)

// 1.6 — registros_producao
await run('1.6 registros_producao', `
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
  CREATE INDEX IF NOT EXISTS idx_registros_data ON registros_producao(data_producao);
  CREATE INDEX IF NOT EXISTS idx_registros_operador ON registros_producao(operador_id, data_producao);
  CREATE INDEX IF NOT EXISTS idx_registros_hora ON registros_producao(hora_registro);
`)
await run('1.6 teste inserção', `
  WITH o AS (SELECT id FROM operadores WHERE matricula = 'TEST-001'),
       m AS (SELECT id FROM maquinas WHERE codigo = 'TEST-M001'),
       op AS (SELECT id FROM operacoes WHERE codigo = 'TEST-OP001')
  INSERT INTO registros_producao (operador_id, maquina_id, operacao_id, quantidade)
  SELECT o.id, m.id, op.id, 1 FROM o, m, op
  RETURNING id, quantidade, data_producao
`)

// 1.7 — Views analíticas
await run('1.7 vw_producao_hoje', `
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
`)
await run('1.7 vw_status_maquinas', `
  CREATE OR REPLACE VIEW vw_status_maquinas AS
  SELECT
    m.id,
    m.codigo,
    COALESCE(
      NULLIF(concat_ws(' · ', NULLIF(trim(m.marca), ''), NULLIF(trim(m.modelo), '')), ''),
      CASE
        WHEN NULLIF(trim(m.numero_patrimonio), '') IS NOT NULL
          THEN 'Patrimônio ' || trim(m.numero_patrimonio)
        ELSE NULL
      END,
      'Máquina patrimonial'
    ) AS descricao,
    m.status,
    MAX(rp.hora_registro) AS ultimo_uso,
    EXTRACT(EPOCH FROM (NOW() - MAX(rp.hora_registro)))/60 AS minutos_sem_uso
  FROM maquinas m
  LEFT JOIN registros_producao rp
    ON rp.maquina_id = m.id AND rp.data_producao = CURRENT_DATE
  GROUP BY m.id, m.codigo, m.marca, m.modelo, m.numero_patrimonio, m.status;
`)
await run('1.7 vw_producao_por_hora', `
  CREATE OR REPLACE VIEW vw_producao_por_hora AS
  SELECT
    DATE_TRUNC('hour', hora_registro) AS hora,
    COUNT(*) AS total_registros,
    SUM(quantidade) AS total_pecas
  FROM registros_producao
  WHERE data_producao = CURRENT_DATE
  GROUP BY DATE_TRUNC('hour', hora_registro)
  ORDER BY hora;
`)
await run('1.7 validar views', `SELECT * FROM vw_producao_hoje LIMIT 2`)

// 1.8 — RLS
await run('1.8 RLS enable', `
  ALTER TABLE registros_producao ENABLE ROW LEVEL SECURITY;
  ALTER TABLE operadores ENABLE ROW LEVEL SECURITY;
  ALTER TABLE maquinas ENABLE ROW LEVEL SECURITY;
  ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
`)
await run('1.8 policies leitura pública', `
  DO $$ BEGIN
    CREATE POLICY "leitura_publica_operadores" ON operadores FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE POLICY "leitura_publica_maquinas" ON maquinas FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  DO $$ BEGIN
    CREATE POLICY "leitura_publica_operacoes" ON operacoes FOR SELECT USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`)
await run('1.8 policy inserção produção', `
  DO $$ BEGIN
    CREATE POLICY "insercao_producao_publica" ON registros_producao FOR INSERT WITH CHECK (true);
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`)
await run('1.8 policy leitura produção autenticados', `
  DO $$ BEGIN
    CREATE POLICY "leitura_producao_autenticados" ON registros_producao
      FOR SELECT USING (auth.role() = 'authenticated');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`)

await client.end()
console.log('\nMigração concluída.')
