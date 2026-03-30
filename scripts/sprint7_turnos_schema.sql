-- ============================================================
-- SPRINT 7.1 — Schema de turnos, OPs e seções operacionais
-- Executar no Supabase SQL Editor após a Sprint 6 concluída
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.turnos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrado_em TIMESTAMPTZ,
  operadores_disponiveis INTEGER NOT NULL CHECK (operadores_disponiveis > 0),
  minutos_turno INTEGER NOT NULL CHECK (minutos_turno > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'encerrado')),
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_unico_aberto
  ON public.turnos(status)
  WHERE status = 'aberto';

COMMENT ON TABLE public.turnos IS
  'Cabeçalho operacional do turno na V2.';

CREATE TABLE IF NOT EXISTS public.turno_operadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  operador_id UUID NOT NULL REFERENCES public.operadores(id),
  setor_id UUID REFERENCES public.setores(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_id, operador_id)
);

CREATE INDEX IF NOT EXISTS idx_turno_operadores_turno_id
  ON public.turno_operadores(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_operadores_setor_id
  ON public.turno_operadores(setor_id);

COMMENT ON TABLE public.turno_operadores IS
  'Alocação dinâmica de operadores por turno na V2.';

CREATE TABLE IF NOT EXISTS public.turno_ops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  numero_op VARCHAR(60) NOT NULL,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade_planejada INTEGER NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_realizada INTEGER NOT NULL DEFAULT 0
    CHECK (quantidade_realizada >= 0 AND quantidade_realizada <= quantidade_planejada),
  status VARCHAR(30) NOT NULL DEFAULT 'planejada'
    CHECK (status IN ('planejada', 'em_andamento', 'concluida', 'encerrada_manualmente')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_id, numero_op)
);

CREATE INDEX IF NOT EXISTS idx_turno_ops_turno_id
  ON public.turno_ops(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_ops_produto_id
  ON public.turno_ops(produto_id);

COMMENT ON TABLE public.turno_ops IS
  'OPs planejadas dentro de um turno na arquitetura V2.';

CREATE TABLE IF NOT EXISTS public.turno_setor_ops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  turno_op_id UUID NOT NULL REFERENCES public.turno_ops(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  quantidade_planejada INTEGER NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_realizada INTEGER NOT NULL DEFAULT 0
    CHECK (quantidade_realizada >= 0 AND quantidade_realizada <= quantidade_planejada),
  qr_code_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status VARCHAR(30) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('planejada', 'aberta', 'em_andamento', 'concluida', 'encerrada_manualmente')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_op_id, setor_id)
);

CREATE INDEX IF NOT EXISTS idx_turno_setor_ops_turno_id
  ON public.turno_setor_ops(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_ops_turno_op_id
  ON public.turno_setor_ops(turno_op_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_ops_setor_id
  ON public.turno_setor_ops(setor_id);

COMMENT ON TABLE public.turno_setor_ops IS
  'Seções operacionais derivadas automaticamente por setor + OP do turno.';

COMMENT ON COLUMN public.turno_setor_ops.qr_code_token IS
  'Token temporário do QR operacional válido apenas no contexto do turno.';

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_ops(p_turno_op_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_turno_id UUID;
  v_produto_id UUID;
  v_quantidade_planejada INTEGER;
  v_tem_realizado BOOLEAN;
  v_total_setores INTEGER;
BEGIN
  SELECT
    turno_id,
    produto_id,
    quantidade_planejada
  INTO
    v_turno_id,
    v_produto_id,
    v_quantidade_planejada
  FROM public.turno_ops
  WHERE id = p_turno_op_id;

  IF v_turno_id IS NULL OR v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Turno OP % não encontrada para sincronização.', p_turno_op_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turno_setor_ops
    WHERE turno_op_id = p_turno_op_id
      AND quantidade_realizada > 0
  )
  INTO v_tem_realizado;

  IF v_tem_realizado THEN
    RAISE EXCEPTION 'Não é possível regerar seções de uma OP que já possui produção apontada.'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.turno_setor_ops
  WHERE turno_op_id = p_turno_op_id;

  INSERT INTO public.turno_setor_ops (
    turno_id,
    turno_op_id,
    setor_id,
    quantidade_planejada,
    quantidade_realizada,
    status
  )
  SELECT DISTINCT
    v_turno_id,
    p_turno_op_id,
    operacao.setor_id,
    v_quantidade_planejada,
    0,
    'aberta'
  FROM public.produto_operacoes produto_operacao
  JOIN public.operacoes operacao
    ON operacao.id = produto_operacao.operacao_id
  WHERE produto_operacao.produto_id = v_produto_id
    AND operacao.setor_id IS NOT NULL;

  GET DIAGNOSTICS v_total_setores = ROW_COUNT;

  IF v_total_setores = 0 THEN
    RAISE EXCEPTION 'Produto % não possui setores válidos no roteiro.', v_produto_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total_setores;
END;
$$;

CREATE OR REPLACE FUNCTION public.turno_ops_sincronizar_setores_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sincronizar_turno_setor_ops(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_ops_sincronizar_setores ON public.turno_ops;

CREATE TRIGGER trg_turno_ops_sincronizar_setores
AFTER INSERT OR UPDATE OF produto_id, quantidade_planejada
ON public.turno_ops
FOR EACH ROW
EXECUTE FUNCTION public.turno_ops_sincronizar_setores_trigger();

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno_operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno_setor_ops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_turnos_autenticados" ON public.turnos
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_operadores_autenticados" ON public.turno_operadores
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_ops_autenticados" ON public.turno_ops
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_setor_ops_autenticados" ON public.turno_setor_ops
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;

-- ============================================================
-- VALIDAÇÃO RECOMENDADA
-- ============================================================
-- 1. Crie um turno:
--
-- INSERT INTO public.turnos (operadores_disponiveis, minutos_turno)
-- VALUES (12, 540)
-- RETURNING id;
--
-- 2. Adicione uma OP ao turno usando um produto já roteirizado:
--
-- INSERT INTO public.turno_ops (turno_id, numero_op, produto_id, quantidade_planejada)
-- VALUES ('<turno_id>', 'OP-TESTE-001', '<produto_id>', 100)
-- RETURNING id;
--
-- 3. Verifique as seções derivadas automaticamente:
--
-- SELECT
--   tso.turno_op_id,
--   setor.nome AS setor,
--   tso.quantidade_planejada,
--   tso.status,
--   tso.qr_code_token
-- FROM public.turno_setor_ops tso
-- JOIN public.setores setor ON setor.id = tso.setor_id
-- WHERE tso.turno_op_id = '<turno_op_id>'
-- ORDER BY setor.nome;
