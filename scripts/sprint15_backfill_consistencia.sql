-- ============================================================
-- SPRINT 15.2 — Backfill seguro da consolidação V2
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_demanda(
  p_turno_setor_demanda_id UUID
)
RETURNS TABLE (
  turno_setor_demanda_id UUID,
  turno_setor_id UUID,
  turno_op_id UUID,
  quantidade_realizada INTEGER,
  status TEXT,
  encerrado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_demanda RECORD;
  v_total_operacoes INTEGER;
  v_total_concluidas INTEGER;
  v_total_encerradas INTEGER;
  v_min_realizado INTEGER;
  v_possui_realizado BOOLEAN;
  v_primeiro_inicio TIMESTAMPTZ;
  v_encerrou_em TIMESTAMPTZ;
  v_quantidade_realizada INTEGER;
  v_status TEXT;
BEGIN
  SELECT
    demanda.id,
    demanda.turno_setor_id,
    demanda.turno_op_id,
    demanda.turno_setor_op_legacy_id,
    demanda.quantidade_planejada,
    demanda.status AS status_atual,
    demanda.iniciado_em AS iniciado_em_atual,
    demanda.encerrado_em AS encerrado_em_atual
  INTO v_demanda
  FROM public.turno_setor_demandas AS demanda
  WHERE demanda.id = p_turno_setor_demanda_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demanda setorial % não encontrada para sincronização.', p_turno_setor_demanda_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE operacao.status = 'concluida')::INTEGER,
    COUNT(*) FILTER (WHERE operacao.status = 'encerrada_manualmente')::INTEGER,
    COALESCE(MIN(operacao.quantidade_realizada), 0)::INTEGER,
    COALESCE(BOOL_OR(operacao.quantidade_realizada > 0), false),
    MIN(operacao.iniciado_em),
    MAX(operacao.encerrado_em)
  INTO
    v_total_operacoes,
    v_total_concluidas,
    v_total_encerradas,
    v_min_realizado,
    v_possui_realizado,
    v_primeiro_inicio,
    v_encerrou_em
  FROM public.turno_setor_operacoes AS operacao
  WHERE operacao.turno_setor_demanda_id = p_turno_setor_demanda_id
     OR (
       operacao.turno_setor_demanda_id IS NULL
       AND v_demanda.turno_setor_op_legacy_id IS NOT NULL
       AND operacao.turno_setor_op_id = v_demanda.turno_setor_op_legacy_id
     );

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Demanda setorial % não possui operações derivadas para sincronização.', p_turno_setor_demanda_id
      USING ERRCODE = 'P0002';
  END IF;

  v_quantidade_realizada := LEAST(v_min_realizado, v_demanda.quantidade_planejada);

  v_status := CASE
    WHEN v_total_concluidas = v_total_operacoes THEN 'concluida'
    WHEN (v_total_concluidas + v_total_encerradas) = v_total_operacoes
      AND v_total_encerradas > 0 THEN 'encerrada_manualmente'
    WHEN v_possui_realizado THEN 'em_andamento'
    WHEN v_demanda.status_atual = 'encerrada_manualmente' THEN 'encerrada_manualmente'
    ELSE 'aberta'
  END;

  UPDATE public.turno_setor_demandas AS demanda
  SET
    quantidade_realizada = v_quantidade_realizada,
    status = v_status,
    iniciado_em = CASE
      WHEN v_status = 'aberta' THEN demanda.iniciado_em
      ELSE COALESCE(demanda.iniciado_em, v_primeiro_inicio, demanda.encerrado_em, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(demanda.encerrado_em, v_encerrou_em, v_demanda.encerrado_em_atual, NOW())
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE demanda.id = p_turno_setor_demanda_id;

  RETURN QUERY
  SELECT
    demanda.id,
    demanda.turno_setor_id,
    demanda.turno_op_id,
    demanda.quantidade_realizada,
    demanda.status::TEXT,
    demanda.encerrado_em
  FROM public.turno_setor_demandas AS demanda
  WHERE demanda.id = p_turno_setor_demanda_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_andamento_turno_setor_op(p_turno_setor_op_id UUID)
RETURNS TABLE (
  turno_setor_op_id UUID,
  quantidade_realizada INTEGER,
  status TEXT,
  encerrado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secao RECORD;
  v_total_operacoes INTEGER;
  v_total_concluidas INTEGER;
  v_total_encerradas INTEGER;
  v_min_realizado INTEGER;
  v_possui_realizado BOOLEAN;
  v_primeiro_inicio TIMESTAMPTZ;
  v_status_turno_setor_op TEXT;
  v_quantidade_realizada_turno_setor_op INTEGER;
  v_encerrado_em_turno_setor_op TIMESTAMPTZ;
  v_turno_setor_demanda_id UUID;
  v_turno_setor_id UUID;
BEGIN
  SELECT
    secao.id,
    secao.quantidade_planejada,
    secao.status AS status_atual,
    secao.iniciado_em,
    secao.encerrado_em
  INTO v_secao
  FROM public.turno_setor_ops AS secao
  WHERE secao.id = p_turno_setor_op_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seção % não encontrada para sincronização.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE operacao.status = 'concluida')::INTEGER,
    COUNT(*) FILTER (WHERE operacao.status = 'encerrada_manualmente')::INTEGER,
    COALESCE(MIN(operacao.quantidade_realizada), 0)::INTEGER,
    COALESCE(BOOL_OR(operacao.quantidade_realizada > 0), false),
    MIN(operacao.iniciado_em),
    MAX(operacao.encerrado_em)
  INTO
    v_total_operacoes,
    v_total_concluidas,
    v_total_encerradas,
    v_min_realizado,
    v_possui_realizado,
    v_primeiro_inicio,
    v_encerrado_em_turno_setor_op
  FROM public.turno_setor_operacoes AS operacao
  WHERE operacao.turno_setor_op_id = p_turno_setor_op_id;

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Seção % não possui operações para sincronização.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
  END IF;

  v_quantidade_realizada_turno_setor_op := LEAST(v_min_realizado, v_secao.quantidade_planejada);

  v_status_turno_setor_op := CASE
    WHEN v_total_concluidas = v_total_operacoes THEN 'concluida'
    WHEN (v_total_concluidas + v_total_encerradas) = v_total_operacoes
      AND v_total_encerradas > 0 THEN 'encerrada_manualmente'
    WHEN v_possui_realizado THEN 'em_andamento'
    WHEN v_secao.status_atual = 'encerrada_manualmente' THEN 'encerrada_manualmente'
    ELSE 'aberta'
  END;

  UPDATE public.turno_setor_ops AS secao
  SET
    quantidade_realizada = v_quantidade_realizada_turno_setor_op,
    status = v_status_turno_setor_op,
    iniciado_em = CASE
      WHEN v_status_turno_setor_op = 'aberta' THEN secao.iniciado_em
      ELSE COALESCE(secao.iniciado_em, v_primeiro_inicio, secao.encerrado_em, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status_turno_setor_op IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(secao.encerrado_em, v_encerrado_em_turno_setor_op, v_secao.encerrado_em, NOW())
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE secao.id = p_turno_setor_op_id;

  SELECT
    demanda.id,
    demanda.turno_setor_id
  INTO
    v_turno_setor_demanda_id,
    v_turno_setor_id
  FROM public.turno_setor_demandas AS demanda
  WHERE demanda.turno_setor_op_legacy_id = p_turno_setor_op_id
  LIMIT 1;

  IF v_turno_setor_demanda_id IS NOT NULL THEN
    PERFORM public.sincronizar_turno_setor_demanda(v_turno_setor_demanda_id);

    IF v_turno_setor_id IS NOT NULL THEN
      PERFORM public.recalcular_turno_setor(v_turno_setor_id);
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p_turno_setor_op_id,
    v_quantidade_realizada_turno_setor_op,
    v_status_turno_setor_op,
    CASE
      WHEN v_status_turno_setor_op IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(v_encerrado_em_turno_setor_op, v_secao.encerrado_em, NOW())
      ELSE NULL
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_andamento_turno_op(p_turno_op_id UUID)
RETURNS TABLE (
  turno_op_id UUID,
  quantidade_realizada INTEGER,
  status TEXT,
  encerrado_em TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno_op RECORD;
  v_total_secoes INTEGER;
  v_total_concluidas INTEGER;
  v_total_encerradas INTEGER;
  v_min_realizado INTEGER;
  v_possui_realizado BOOLEAN;
  v_primeiro_inicio TIMESTAMPTZ;
  v_status_turno_op TEXT;
  v_quantidade_realizada_turno_op INTEGER;
  v_encerrado_em_turno_op TIMESTAMPTZ;
BEGIN
  SELECT
    op.id,
    op.turno_id,
    op.quantidade_planejada,
    op.status AS status_atual,
    op.iniciado_em,
    op.encerrado_em
  INTO v_turno_op
  FROM public.turno_ops AS op
  WHERE op.id = p_turno_op_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno OP % não encontrado para sincronização.', p_turno_op_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE secao.status = 'concluida')::INTEGER,
    COUNT(*) FILTER (WHERE secao.status = 'encerrada_manualmente')::INTEGER,
    COALESCE(MIN(secao.quantidade_realizada), 0)::INTEGER,
    COALESCE(BOOL_OR(secao.quantidade_realizada > 0), false),
    MIN(secao.iniciado_em),
    MAX(secao.encerrado_em)
  INTO
    v_total_secoes,
    v_total_concluidas,
    v_total_encerradas,
    v_min_realizado,
    v_possui_realizado,
    v_primeiro_inicio,
    v_encerrado_em_turno_op
  FROM public.turno_setor_ops AS secao
  WHERE secao.turno_op_id = p_turno_op_id;

  IF v_total_secoes = 0 THEN
    RAISE EXCEPTION 'Turno OP % não possui seções para sincronização.', p_turno_op_id
      USING ERRCODE = 'P0002';
  END IF;

  v_quantidade_realizada_turno_op := LEAST(v_min_realizado, v_turno_op.quantidade_planejada);

  v_status_turno_op := CASE
    WHEN v_total_concluidas = v_total_secoes THEN 'concluida'
    WHEN (v_total_concluidas + v_total_encerradas) = v_total_secoes
      AND v_total_encerradas > 0 THEN 'encerrada_manualmente'
    WHEN v_possui_realizado THEN 'em_andamento'
    WHEN v_turno_op.status_atual = 'encerrada_manualmente' THEN 'encerrada_manualmente'
    ELSE 'planejada'
  END;

  UPDATE public.turno_ops AS op
  SET
    quantidade_realizada = v_quantidade_realizada_turno_op,
    status = v_status_turno_op,
    iniciado_em = CASE
      WHEN v_status_turno_op = 'planejada' THEN op.iniciado_em
      ELSE COALESCE(op.iniciado_em, v_primeiro_inicio, op.encerrado_em, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status_turno_op IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(op.encerrado_em, v_encerrado_em_turno_op, v_turno_op.encerrado_em, NOW())
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE op.id = p_turno_op_id;

  UPDATE public.turnos
  SET updated_at = NOW()
  WHERE id = v_turno_op.turno_id;

  RETURN QUERY
  SELECT
    p_turno_op_id,
    v_quantidade_realizada_turno_op,
    v_status_turno_op,
    CASE
      WHEN v_status_turno_op IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(v_encerrado_em_turno_op, v_turno_op.encerrado_em, NOW())
      ELSE NULL
    END;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_consistencia_turno(
  p_turno_id UUID
)
RETURNS TABLE (
  turno_id UUID,
  demandas_recalculadas INTEGER,
  secoes_recalculadas INTEGER,
  setores_recalculados INTEGER,
  ops_recalculadas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno_existe BOOLEAN;
  v_demanda RECORD;
  v_secao RECORD;
  v_setor RECORD;
  v_op RECORD;
  v_demandas_recalculadas INTEGER := 0;
  v_secoes_recalculadas INTEGER := 0;
  v_setores_recalculados INTEGER := 0;
  v_ops_recalculadas INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.turnos
    WHERE id = p_turno_id
  )
  INTO v_turno_existe;

  IF NOT v_turno_existe THEN
    RAISE EXCEPTION 'Turno % não encontrado para backfill.', p_turno_id
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.turno_setor_operacoes AS operacao
  SET
    status = CASE
      WHEN operacao.status = 'concluida' THEN 'concluida'
      ELSE 'encerrada_manualmente'
    END,
    encerrado_em = COALESCE(
      operacao.encerrado_em,
      demanda.encerrado_em,
      secao.encerrado_em,
      turno_op.encerrado_em,
      NOW()
    ),
    updated_at = NOW()
  FROM public.turno_setor_ops AS secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  LEFT JOIN public.turno_setor_demandas AS demanda
    ON demanda.turno_setor_op_legacy_id = secao.id
  WHERE operacao.turno_id = p_turno_id
    AND operacao.turno_setor_op_id = secao.id
    AND (
      secao.status = 'encerrada_manualmente'
      OR demanda.status = 'encerrada_manualmente'
      OR turno_op.status = 'encerrada_manualmente'
    )
    AND operacao.status <> 'encerrada_manualmente';

  FOR v_demanda IN
    SELECT demanda.id
    FROM public.turno_setor_demandas AS demanda
    WHERE demanda.turno_id = p_turno_id
    ORDER BY demanda.created_at ASC, demanda.id ASC
  LOOP
    PERFORM public.sincronizar_turno_setor_demanda(v_demanda.id);
    v_demandas_recalculadas := v_demandas_recalculadas + 1;
  END LOOP;

  FOR v_secao IN
    SELECT secao.id
    FROM public.turno_setor_ops AS secao
    WHERE secao.turno_id = p_turno_id
    ORDER BY secao.created_at ASC, secao.id ASC
  LOOP
    PERFORM public.sincronizar_andamento_turno_setor_op(v_secao.id);
    v_secoes_recalculadas := v_secoes_recalculadas + 1;
  END LOOP;

  FOR v_setor IN
    SELECT setor.id
    FROM public.turno_setores AS setor
    WHERE setor.turno_id = p_turno_id
    ORDER BY setor.created_at ASC, setor.id ASC
  LOOP
    PERFORM public.recalcular_turno_setor(v_setor.id);
    v_setores_recalculados := v_setores_recalculados + 1;
  END LOOP;

  FOR v_op IN
    SELECT op.id
    FROM public.turno_ops AS op
    WHERE op.turno_id = p_turno_id
    ORDER BY op.created_at ASC, op.id ASC
  LOOP
    PERFORM public.sincronizar_andamento_turno_op(v_op.id);
    v_ops_recalculadas := v_ops_recalculadas + 1;
  END LOOP;

  UPDATE public.turnos
  SET updated_at = NOW()
  WHERE id = p_turno_id;

  RETURN QUERY
  SELECT
    p_turno_id,
    v_demandas_recalculadas,
    v_secoes_recalculadas,
    v_setores_recalculados,
    v_ops_recalculadas;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_consistencia_turnos_recentes(
  p_iniciados_desde TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '7 days')
)
RETURNS TABLE (
  turno_id UUID,
  turno_status TEXT,
  demandas_recalculadas INTEGER,
  secoes_recalculadas INTEGER,
  setores_recalculados INTEGER,
  ops_recalculadas INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno RECORD;
  v_resultado RECORD;
BEGIN
  FOR v_turno IN
    SELECT turno.id, turno.status
    FROM public.turnos AS turno
    WHERE turno.status = 'aberto'
       OR turno.iniciado_em >= p_iniciados_desde
    ORDER BY
      CASE WHEN turno.status = 'aberto' THEN 0 ELSE 1 END,
      turno.iniciado_em DESC,
      turno.id ASC
  LOOP
    SELECT *
    INTO v_resultado
    FROM public.backfill_consistencia_turno(v_turno.id);

    RETURN QUERY
    SELECT
      v_resultado.turno_id,
      v_turno.status::TEXT,
      v_resultado.demandas_recalculadas,
      v_resultado.secoes_recalculadas,
      v_resultado.setores_recalculados,
      v_resultado.ops_recalculadas;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.backfill_consistencia_turno(UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.backfill_consistencia_turnos_recentes(TIMESTAMPTZ)
  TO service_role;

COMMIT;
