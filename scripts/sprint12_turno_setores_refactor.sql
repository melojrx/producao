-- ============================================================
-- SPRINT 12.1 — Base estrutural para turno por setor
-- Executar via Supabase Management API
-- Estratégia: migração aditiva e compatível com o modelo atual
-- ============================================================

BEGIN;

ALTER TABLE public.turno_ops
  ADD COLUMN IF NOT EXISTS turno_op_origem_id UUID
    REFERENCES public.turno_ops(id);

ALTER TABLE public.turno_ops
  ADD COLUMN IF NOT EXISTS quantidade_planejada_original INTEGER;

ALTER TABLE public.turno_ops
  ADD COLUMN IF NOT EXISTS quantidade_planejada_remanescente INTEGER;

UPDATE public.turno_ops
SET quantidade_planejada_original = quantidade_planejada
WHERE quantidade_planejada_original IS NULL;

UPDATE public.turno_ops
SET quantidade_planejada_remanescente = GREATEST(quantidade_planejada - quantidade_realizada, 0)
WHERE quantidade_planejada_remanescente IS NULL;

ALTER TABLE public.turno_ops
  ALTER COLUMN quantidade_planejada_original SET DEFAULT 0;

ALTER TABLE public.turno_ops
  ALTER COLUMN quantidade_planejada_remanescente SET DEFAULT 0;

UPDATE public.turno_ops
SET
  quantidade_planejada_original = quantidade_planejada,
  quantidade_planejada_remanescente = GREATEST(quantidade_planejada - quantidade_realizada, 0)
WHERE quantidade_planejada_original = 0
   OR quantidade_planejada_remanescente = 0;

ALTER TABLE public.turno_ops
  ALTER COLUMN quantidade_planejada_original SET NOT NULL;

ALTER TABLE public.turno_ops
  ALTER COLUMN quantidade_planejada_remanescente SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'turno_ops_quantidade_planejada_original_check'
      AND conrelid = 'public.turno_ops'::regclass
  ) THEN
    ALTER TABLE public.turno_ops
      ADD CONSTRAINT turno_ops_quantidade_planejada_original_check
      CHECK (quantidade_planejada_original > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'turno_ops_quantidade_planejada_remanescente_check'
      AND conrelid = 'public.turno_ops'::regclass
  ) THEN
    ALTER TABLE public.turno_ops
      ADD CONSTRAINT turno_ops_quantidade_planejada_remanescente_check
      CHECK (
        quantidade_planejada_remanescente >= 0
        AND quantidade_planejada_remanescente <= quantidade_planejada_original
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_turno_ops_turno_op_origem_id
  ON public.turno_ops(turno_op_origem_id);

CREATE TABLE IF NOT EXISTS public.turno_setores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  quantidade_planejada INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_planejada >= 0),
  quantidade_realizada INTEGER NOT NULL DEFAULT 0
    CHECK (quantidade_realizada >= 0 AND quantidade_realizada <= quantidade_planejada),
  qr_code_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status VARCHAR(30) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('planejada', 'aberta', 'em_andamento', 'concluida', 'encerrada_manualmente')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_id, setor_id)
);

CREATE INDEX IF NOT EXISTS idx_turno_setores_turno_id
  ON public.turno_setores(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_setores_setor_id
  ON public.turno_setores(setor_id);

COMMENT ON TABLE public.turno_setores IS
  'Setores ativos do turno. Esta passa a ser a unidade operacional física reaproveitada da Sprint 12.';

COMMENT ON COLUMN public.turno_setores.qr_code_token IS
  'Token temporário do QR operacional por turno + setor.';

CREATE TABLE IF NOT EXISTS public.turno_setor_demandas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_setor_id UUID NOT NULL REFERENCES public.turno_setores(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  turno_op_id UUID NOT NULL REFERENCES public.turno_ops(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  turno_setor_op_legacy_id UUID UNIQUE REFERENCES public.turno_setor_ops(id) ON DELETE SET NULL,
  quantidade_planejada INTEGER NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_realizada INTEGER NOT NULL DEFAULT 0
    CHECK (quantidade_realizada >= 0 AND quantidade_realizada <= quantidade_planejada),
  status VARCHAR(30) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('planejada', 'aberta', 'em_andamento', 'concluida', 'encerrada_manualmente')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_setor_id, turno_op_id)
);

CREATE INDEX IF NOT EXISTS idx_turno_setor_demandas_turno_setor_id
  ON public.turno_setor_demandas(turno_setor_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_demandas_turno_id
  ON public.turno_setor_demandas(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_demandas_turno_op_id
  ON public.turno_setor_demandas(turno_op_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_demandas_setor_id
  ON public.turno_setor_demandas(setor_id);

COMMENT ON TABLE public.turno_setor_demandas IS
  'Demandas por OP/produto dentro de um setor ativo do turno.';

ALTER TABLE public.turno_setor_operacoes
  ADD COLUMN IF NOT EXISTS turno_setor_id UUID
    REFERENCES public.turno_setores(id);

ALTER TABLE public.turno_setor_operacoes
  ADD COLUMN IF NOT EXISTS turno_setor_demanda_id UUID
    REFERENCES public.turno_setor_demandas(id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_turno_setor_id
  ON public.turno_setor_operacoes(turno_setor_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_turno_setor_demanda_id
  ON public.turno_setor_operacoes(turno_setor_demanda_id);

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS turno_setor_id UUID
    REFERENCES public.turno_setores(id);

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS turno_setor_demanda_id UUID
    REFERENCES public.turno_setor_demandas(id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_turno_setor_id
  ON public.registros_producao(turno_setor_id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_turno_setor_demanda_id
  ON public.registros_producao(turno_setor_demanda_id);

CREATE OR REPLACE FUNCTION public.recalcular_turno_setor(p_turno_setor_id UUID)
RETURNS TABLE (
  turno_setor_id UUID,
  quantidade_planejada INTEGER,
  quantidade_realizada INTEGER,
  status TEXT,
  encerrado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno_setor RECORD;
  v_total_demandas INTEGER;
  v_total_concluidas INTEGER;
  v_total_encerradas INTEGER;
  v_soma_planejada INTEGER;
  v_soma_realizada INTEGER;
  v_primeiro_inicio TIMESTAMPTZ;
  v_encerrou_em TIMESTAMPTZ;
  v_possui_realizado BOOLEAN;
  v_status TEXT;
BEGIN
  SELECT id
  INTO v_turno_setor
  FROM public.turno_setores
  WHERE id = p_turno_setor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE demanda.status = 'concluida')::INTEGER,
    COUNT(*) FILTER (WHERE demanda.status = 'encerrada_manualmente')::INTEGER,
    COALESCE(SUM(demanda.quantidade_planejada), 0)::INTEGER,
    COALESCE(SUM(demanda.quantidade_realizada), 0)::INTEGER,
    MIN(demanda.iniciado_em),
    MAX(demanda.encerrado_em),
    COALESCE(BOOL_OR(demanda.quantidade_realizada > 0), false)
  INTO
    v_total_demandas,
    v_total_concluidas,
    v_total_encerradas,
    v_soma_planejada,
    v_soma_realizada,
    v_primeiro_inicio,
    v_encerrou_em,
    v_possui_realizado
  FROM public.turno_setor_demandas AS demanda
  WHERE demanda.turno_setor_id = p_turno_setor_id;

  IF v_total_demandas = 0 THEN
    DELETE FROM public.turno_setores
    WHERE id = p_turno_setor_id;
    RETURN;
  END IF;

  v_status := CASE
    WHEN v_total_concluidas = v_total_demandas THEN 'concluida'
    WHEN v_total_encerradas = v_total_demandas THEN 'encerrada_manualmente'
    WHEN v_possui_realizado THEN 'em_andamento'
    ELSE 'aberta'
  END;

  UPDATE public.turno_setores
  SET
    quantidade_planejada = v_soma_planejada,
    quantidade_realizada = v_soma_realizada,
    status = v_status,
    iniciado_em = COALESCE(v_primeiro_inicio, iniciado_em),
    encerrado_em = CASE
      WHEN v_status IN ('concluida', 'encerrada_manualmente') THEN COALESCE(v_encerrou_em, NOW())
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_turno_setor_id;

  RETURN QUERY
  SELECT
    turno_setor.id,
    turno_setor.quantidade_planejada,
    turno_setor.quantidade_realizada,
    turno_setor.status::TEXT,
    turno_setor.encerrado_em
  FROM public.turno_setores AS turno_setor
  WHERE turno_setor.id = p_turno_setor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_demanda_legada(p_turno_setor_op_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secao RECORD;
  v_turno_setor_id UUID;
  v_turno_setor_demanda_id UUID;
BEGIN
  SELECT
    secao.id,
    secao.turno_id,
    secao.turno_op_id,
    secao.setor_id,
    secao.quantidade_planejada,
    secao.quantidade_realizada,
    secao.status,
    secao.iniciado_em,
    secao.encerrado_em,
    turno_op.produto_id
  INTO v_secao
  FROM public.turno_setor_ops AS secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  WHERE secao.id = p_turno_setor_op_id;

  IF NOT FOUND THEN
    DELETE FROM public.turno_setor_demandas
    WHERE turno_setor_op_legacy_id = p_turno_setor_op_id;
    RETURN NULL;
  END IF;

  INSERT INTO public.turno_setores (
    turno_id,
    setor_id,
    quantidade_planejada,
    quantidade_realizada,
    status,
    iniciado_em,
    encerrado_em
  )
  VALUES (
    v_secao.turno_id,
    v_secao.setor_id,
    0,
    0,
    'aberta',
    v_secao.iniciado_em,
    v_secao.encerrado_em
  )
  ON CONFLICT (turno_id, setor_id) DO UPDATE
  SET
    updated_at = NOW(),
    iniciado_em = COALESCE(public.turno_setores.iniciado_em, EXCLUDED.iniciado_em)
  RETURNING id
  INTO v_turno_setor_id;

  INSERT INTO public.turno_setor_demandas (
    turno_setor_id,
    turno_id,
    turno_op_id,
    produto_id,
    setor_id,
    turno_setor_op_legacy_id,
    quantidade_planejada,
    quantidade_realizada,
    status,
    iniciado_em,
    encerrado_em
  )
  VALUES (
    v_turno_setor_id,
    v_secao.turno_id,
    v_secao.turno_op_id,
    v_secao.produto_id,
    v_secao.setor_id,
    v_secao.id,
    v_secao.quantidade_planejada,
    v_secao.quantidade_realizada,
    v_secao.status,
    v_secao.iniciado_em,
    v_secao.encerrado_em
  )
  ON CONFLICT (turno_setor_op_legacy_id) DO UPDATE
  SET
    turno_setor_id = EXCLUDED.turno_setor_id,
    turno_id = EXCLUDED.turno_id,
    turno_op_id = EXCLUDED.turno_op_id,
    produto_id = EXCLUDED.produto_id,
    setor_id = EXCLUDED.setor_id,
    quantidade_planejada = EXCLUDED.quantidade_planejada,
    quantidade_realizada = EXCLUDED.quantidade_realizada,
    status = EXCLUDED.status,
    iniciado_em = EXCLUDED.iniciado_em,
    encerrado_em = EXCLUDED.encerrado_em,
    updated_at = NOW()
  RETURNING id
  INTO v_turno_setor_demanda_id;

  PERFORM public.recalcular_turno_setor(v_turno_setor_id);

  RETURN v_turno_setor_demanda_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.turno_setor_ops_espelhar_em_turno_setor_demandas_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_turno_setor_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT turno_setor_id
    INTO v_turno_setor_id
    FROM public.turno_setor_demandas
    WHERE turno_setor_op_legacy_id = OLD.id;

    DELETE FROM public.turno_setor_demandas
    WHERE turno_setor_op_legacy_id = OLD.id;

    IF v_turno_setor_id IS NOT NULL THEN
      PERFORM public.recalcular_turno_setor(v_turno_setor_id);
    END IF;

    RETURN OLD;
  END IF;

  PERFORM public.sincronizar_turno_setor_demanda_legada(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_setor_ops_espelhar_em_turno_setor_demandas
  ON public.turno_setor_ops;

CREATE TRIGGER trg_turno_setor_ops_espelhar_em_turno_setor_demandas
AFTER INSERT OR UPDATE OF turno_id, turno_op_id, setor_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em
OR DELETE
ON public.turno_setor_ops
FOR EACH ROW
EXECUTE FUNCTION public.turno_setor_ops_espelhar_em_turno_setor_demandas_trigger();

INSERT INTO public.turno_setores (
  turno_id,
  setor_id,
  quantidade_planejada,
  quantidade_realizada,
  status,
  iniciado_em,
  encerrado_em
)
SELECT
  secao.turno_id,
  secao.setor_id,
  COALESCE(SUM(secao.quantidade_planejada), 0)::INTEGER,
  COALESCE(SUM(secao.quantidade_realizada), 0)::INTEGER,
  CASE
    WHEN COUNT(*) FILTER (WHERE secao.status = 'concluida') = COUNT(*) THEN 'concluida'
    WHEN COUNT(*) FILTER (WHERE secao.status = 'encerrada_manualmente') = COUNT(*) THEN 'encerrada_manualmente'
    WHEN BOOL_OR(secao.quantidade_realizada > 0 OR secao.status = 'em_andamento') THEN 'em_andamento'
    ELSE 'aberta'
  END,
  MIN(secao.iniciado_em),
  MAX(secao.encerrado_em)
FROM public.turno_setor_ops AS secao
GROUP BY secao.turno_id, secao.setor_id
ON CONFLICT (turno_id, setor_id) DO UPDATE
SET
  quantidade_planejada = EXCLUDED.quantidade_planejada,
  quantidade_realizada = EXCLUDED.quantidade_realizada,
  status = EXCLUDED.status,
  iniciado_em = COALESCE(public.turno_setores.iniciado_em, EXCLUDED.iniciado_em),
  encerrado_em = EXCLUDED.encerrado_em,
  updated_at = NOW();

INSERT INTO public.turno_setor_demandas (
  turno_setor_id,
  turno_id,
  turno_op_id,
  produto_id,
  setor_id,
  turno_setor_op_legacy_id,
  quantidade_planejada,
  quantidade_realizada,
  status,
  iniciado_em,
  encerrado_em
)
SELECT
  turno_setor.id,
  secao.turno_id,
  secao.turno_op_id,
  turno_op.produto_id,
  secao.setor_id,
  secao.id,
  secao.quantidade_planejada,
  secao.quantidade_realizada,
  secao.status,
  secao.iniciado_em,
  secao.encerrado_em
FROM public.turno_setor_ops AS secao
JOIN public.turno_ops AS turno_op
  ON turno_op.id = secao.turno_op_id
JOIN public.turno_setores AS turno_setor
  ON turno_setor.turno_id = secao.turno_id
 AND turno_setor.setor_id = secao.setor_id
ON CONFLICT (turno_setor_op_legacy_id) DO UPDATE
SET
  turno_setor_id = EXCLUDED.turno_setor_id,
  turno_id = EXCLUDED.turno_id,
  turno_op_id = EXCLUDED.turno_op_id,
  produto_id = EXCLUDED.produto_id,
  setor_id = EXCLUDED.setor_id,
  quantidade_planejada = EXCLUDED.quantidade_planejada,
  quantidade_realizada = EXCLUDED.quantidade_realizada,
  status = EXCLUDED.status,
  iniciado_em = EXCLUDED.iniciado_em,
  encerrado_em = EXCLUDED.encerrado_em,
  updated_at = NOW();

UPDATE public.turno_setor_operacoes AS operacao_secao
SET
  turno_setor_id = demanda.turno_setor_id,
  turno_setor_demanda_id = demanda.id
FROM public.turno_setor_demandas AS demanda
WHERE demanda.turno_setor_op_legacy_id = operacao_secao.turno_setor_op_id
  AND (
    operacao_secao.turno_setor_id IS NULL
    OR operacao_secao.turno_setor_demanda_id IS NULL
  );

UPDATE public.registros_producao AS registro
SET
  turno_setor_id = demanda.turno_setor_id,
  turno_setor_demanda_id = COALESCE(
    (
      SELECT operacao_secao.turno_setor_demanda_id
      FROM public.turno_setor_operacoes AS operacao_secao
      WHERE operacao_secao.id = registro.turno_setor_operacao_id
      LIMIT 1
    ),
    demanda.id
  )
FROM public.turno_setor_demandas AS demanda
WHERE demanda.turno_setor_op_legacy_id = registro.turno_setor_op_id
  AND (
    registro.turno_setor_id IS NULL
    OR registro.turno_setor_demanda_id IS NULL
  );

ALTER TABLE public.turno_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turno_setor_demandas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_setores_autenticados" ON public.turno_setores
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_setor_demandas_autenticados" ON public.turno_setor_demandas
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
