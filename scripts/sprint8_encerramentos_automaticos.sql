-- ============================================================
-- SPRINT 8.4 — Encerramentos automáticos do fluxo V2
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

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
  v_min_realizado INTEGER;
  v_possui_realizado BOOLEAN;
  v_primeiro_inicio TIMESTAMPTZ;
  v_status_turno_op TEXT;
  v_quantidade_realizada_turno_op INTEGER;
  v_encerrado_em_turno_op TIMESTAMPTZ;
BEGIN
  SELECT
    id,
    turno_id,
    quantidade_planejada,
    iniciado_em
  INTO v_turno_op
  FROM public.turno_ops
  WHERE id = p_turno_op_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turno OP % não encontrado para sincronização.', p_turno_op_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE secao.status = 'concluida')::INTEGER,
    COALESCE(MIN(secao.quantidade_realizada), 0)::INTEGER,
    COALESCE(BOOL_OR(secao.quantidade_realizada > 0), false),
    MIN(secao.iniciado_em)
  INTO
    v_total_secoes,
    v_total_concluidas,
    v_min_realizado,
    v_possui_realizado,
    v_primeiro_inicio
  FROM public.turno_setor_ops AS secao
  WHERE secao.turno_op_id = p_turno_op_id;

  IF v_total_secoes = 0 THEN
    RAISE EXCEPTION 'Turno OP % não possui seções para sincronização.', p_turno_op_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_total_concluidas = v_total_secoes THEN
    v_status_turno_op := 'concluida';
    v_quantidade_realizada_turno_op := v_turno_op.quantidade_planejada;
    v_encerrado_em_turno_op := NOW();
  ELSIF v_possui_realizado THEN
    v_status_turno_op := 'em_andamento';
    v_quantidade_realizada_turno_op := LEAST(v_min_realizado, v_turno_op.quantidade_planejada);
    v_encerrado_em_turno_op := NULL;
  ELSE
    v_status_turno_op := 'planejada';
    v_quantidade_realizada_turno_op := 0;
    v_encerrado_em_turno_op := NULL;
  END IF;

  UPDATE public.turno_ops AS turno_op
  SET
    quantidade_realizada = v_quantidade_realizada_turno_op,
    status = v_status_turno_op,
    iniciado_em = CASE
      WHEN v_status_turno_op = 'planejada' THEN turno_op.iniciado_em
      ELSE COALESCE(turno_op.iniciado_em, v_primeiro_inicio, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status_turno_op = 'concluida'
        THEN COALESCE(turno_op.encerrado_em, v_encerrado_em_turno_op)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_turno_op_id;

  UPDATE public.turnos
  SET updated_at = NOW()
  WHERE id = v_turno_op.turno_id;

  RETURN QUERY
  SELECT
    p_turno_op_id,
    v_quantidade_realizada_turno_op,
    v_status_turno_op,
    v_encerrado_em_turno_op;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_producao_turno_setor_op(
  p_operador_id UUID,
  p_turno_setor_op_id UUID,
  p_quantidade INTEGER,
  p_maquina_id UUID DEFAULT NULL
)
RETURNS TABLE (
  registro_id UUID,
  turno_setor_op_id UUID,
  quantidade_registrada INTEGER,
  quantidade_realizada INTEGER,
  saldo_restante INTEGER,
  status_turno_setor_op TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_operador TEXT;
  v_status_maquina TEXT;
  v_secao RECORD;
  v_nova_quantidade INTEGER;
  v_saldo_restante INTEGER;
  v_status_secao TEXT;
  v_registro_id UUID;
  v_encerrado_em_secao TIMESTAMPTZ;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'A quantidade deve ser um número inteiro maior ou igual a 1.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT status
  INTO v_status_operador
  FROM public.operadores
  WHERE id = p_operador_id;

  IF v_status_operador IS NULL OR v_status_operador <> 'ativo' THEN
    RAISE EXCEPTION 'Operador inválido ou inativo para registro de produção.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_maquina_id IS NOT NULL THEN
    SELECT status
    INTO v_status_maquina
    FROM public.maquinas
    WHERE id = p_maquina_id;

    IF v_status_maquina IS NULL THEN
      RAISE EXCEPTION 'Máquina não encontrada para registro de produção.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_status_maquina = 'manutencao' THEN
      RAISE EXCEPTION 'Máquina em manutenção. Não é possível registrar produção.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_status_maquina <> 'ativa' THEN
      RAISE EXCEPTION 'Máquina parada. Ative a máquina antes de registrar produção.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  SELECT
    secao.id,
    secao.turno_id,
    secao.turno_op_id,
    secao.quantidade_planejada,
    secao.quantidade_realizada,
    secao.status,
    turno.status AS turno_status,
    turno_op.produto_id
  INTO v_secao
  FROM public.turno_setor_ops AS secao
  JOIN public.turnos AS turno
    ON turno.id = secao.turno_id
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  WHERE secao.id = p_turno_setor_op_id
  FOR UPDATE OF secao;

  IF NOT FOUND OR v_secao.turno_status <> 'aberto' THEN
    RAISE EXCEPTION 'A seção informada não foi encontrada em um turno aberto.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_secao.status IN ('concluida', 'encerrada_manualmente') THEN
    RAISE EXCEPTION 'Esta seção já está encerrada e não aceita novos apontamentos.'
      USING ERRCODE = 'P0001';
  END IF;

  v_saldo_restante := v_secao.quantidade_planejada - v_secao.quantidade_realizada;

  IF v_saldo_restante <= 0 THEN
    RAISE EXCEPTION 'Esta seção não possui saldo restante para lançamento.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade > v_saldo_restante THEN
    RAISE EXCEPTION 'Quantidade excede o saldo restante da seção.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.registros_producao (
    operador_id,
    maquina_id,
    operacao_id,
    produto_id,
    quantidade,
    turno_setor_op_id
  )
  VALUES (
    p_operador_id,
    p_maquina_id,
    NULL,
    v_secao.produto_id,
    p_quantidade,
    p_turno_setor_op_id
  )
  RETURNING id
  INTO v_registro_id;

  v_nova_quantidade := v_secao.quantidade_realizada + p_quantidade;
  v_saldo_restante := GREATEST(v_secao.quantidade_planejada - v_nova_quantidade, 0);
  v_status_secao := CASE
    WHEN v_nova_quantidade >= v_secao.quantidade_planejada THEN 'concluida'
    ELSE 'em_andamento'
  END;
  v_encerrado_em_secao := CASE
    WHEN v_status_secao = 'concluida' THEN NOW()
    ELSE NULL
  END;

  UPDATE public.turno_setor_ops
  SET
    quantidade_realizada = v_nova_quantidade,
    status = v_status_secao,
    iniciado_em = COALESCE(iniciado_em, NOW()),
    encerrado_em = CASE
      WHEN v_status_secao = 'concluida' THEN COALESCE(encerrado_em, v_encerrado_em_secao)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_turno_setor_op_id;

  PERFORM public.sincronizar_andamento_turno_op(v_secao.turno_op_id);

  RETURN QUERY
  SELECT
    v_registro_id,
    p_turno_setor_op_id,
    p_quantidade,
    v_nova_quantidade,
    v_saldo_restante,
    v_status_secao;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_andamento_turno_op(UUID)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.registrar_producao_turno_setor_op(UUID, UUID, INTEGER, UUID)
  TO authenticated, service_role;

COMMIT;
