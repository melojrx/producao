-- ============================================================
-- SPRINT 15.1 — Consistência da consolidação demanda -> setor -> OP
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
    demanda.quantidade_planejada
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
    WHEN v_total_encerradas = v_total_operacoes THEN 'encerrada_manualmente'
    WHEN v_possui_realizado THEN 'em_andamento'
    ELSE 'aberta'
  END;

  UPDATE public.turno_setor_demandas AS demanda
  SET
    quantidade_realizada = v_quantidade_realizada,
    status = v_status,
    iniciado_em = CASE
      WHEN v_status = 'aberta' THEN demanda.iniciado_em
      ELSE COALESCE(demanda.iniciado_em, v_primeiro_inicio, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status IN ('concluida', 'encerrada_manualmente')
        THEN COALESCE(demanda.encerrado_em, v_encerrou_em, NOW())
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
    id,
    quantidade_planejada,
    iniciado_em
  INTO v_secao
  FROM public.turno_setor_ops
  WHERE id = p_turno_setor_op_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seção % não encontrada para sincronização.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE operacao.status = 'concluida')::INTEGER,
    COALESCE(MIN(operacao.quantidade_realizada), 0)::INTEGER,
    COALESCE(BOOL_OR(operacao.quantidade_realizada > 0), false),
    MIN(operacao.iniciado_em)
  INTO
    v_total_operacoes,
    v_total_concluidas,
    v_min_realizado,
    v_possui_realizado,
    v_primeiro_inicio
  FROM public.turno_setor_operacoes AS operacao
  WHERE operacao.turno_setor_op_id = p_turno_setor_op_id;

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Seção % não possui operações para sincronização.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_total_concluidas = v_total_operacoes THEN
    v_status_turno_setor_op := 'concluida';
    v_quantidade_realizada_turno_setor_op := v_secao.quantidade_planejada;
    v_encerrado_em_turno_setor_op := NOW();
  ELSIF v_possui_realizado THEN
    v_status_turno_setor_op := 'em_andamento';
    v_quantidade_realizada_turno_setor_op := LEAST(v_min_realizado, v_secao.quantidade_planejada);
    v_encerrado_em_turno_setor_op := NULL;
  ELSE
    v_status_turno_setor_op := 'aberta';
    v_quantidade_realizada_turno_setor_op := 0;
    v_encerrado_em_turno_setor_op := NULL;
  END IF;

  UPDATE public.turno_setor_ops AS secao
  SET
    quantidade_realizada = v_quantidade_realizada_turno_setor_op,
    status = v_status_turno_setor_op,
    iniciado_em = CASE
      WHEN v_status_turno_setor_op = 'aberta' THEN secao.iniciado_em
      ELSE COALESCE(secao.iniciado_em, v_primeiro_inicio, NOW())
    END,
    encerrado_em = CASE
      WHEN v_status_turno_setor_op = 'concluida'
        THEN COALESCE(secao.encerrado_em, v_encerrado_em_turno_setor_op)
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
    v_encerrado_em_turno_setor_op;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_producao_turno_setor_operacao(
  p_operador_id UUID,
  p_turno_setor_operacao_id UUID,
  p_quantidade INTEGER,
  p_usuario_sistema_id UUID DEFAULT NULL,
  p_origem_apontamento TEXT DEFAULT 'operador_qr',
  p_maquina_id UUID DEFAULT NULL,
  p_observacao TEXT DEFAULT NULL
)
RETURNS TABLE (
  registro_id UUID,
  turno_setor_operacao_id UUID,
  quantidade_registrada INTEGER,
  quantidade_realizada_operacao INTEGER,
  saldo_restante_operacao INTEGER,
  status_turno_setor_operacao TEXT,
  quantidade_realizada_secao INTEGER,
  saldo_restante_secao INTEGER,
  status_turno_setor_op TEXT,
  quantidade_realizada_turno_op INTEGER,
  status_turno_op TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_operador TEXT;
  v_status_maquina TEXT;
  v_usuario_sistema_ativo BOOLEAN;
  v_operacao RECORD;
  v_nova_quantidade_operacao INTEGER;
  v_saldo_restante_operacao INTEGER;
  v_status_operacao TEXT;
  v_registro_id UUID;
  v_encerrado_em_operacao TIMESTAMPTZ;
  v_secao_sync RECORD;
  v_turno_op_sync RECORD;
BEGIN
  IF p_quantidade IS NULL OR p_quantidade < 1 THEN
    RAISE EXCEPTION 'A quantidade deve ser um número inteiro maior ou igual a 1.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_origem_apontamento NOT IN ('operador_qr', 'supervisor_manual') THEN
    RAISE EXCEPTION 'Origem de apontamento inválida.'
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

  IF p_usuario_sistema_id IS NOT NULL THEN
    SELECT ativo
    INTO v_usuario_sistema_ativo
    FROM public.usuarios_sistema
    WHERE id = p_usuario_sistema_id;

    IF v_usuario_sistema_ativo IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'Usuário do sistema inválido ou inativo para autoria do lançamento.'
        USING ERRCODE = 'P0001';
    END IF;
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
    operacao_secao.id,
    operacao_secao.turno_id,
    operacao_secao.turno_op_id,
    operacao_secao.turno_setor_op_id,
    operacao_secao.turno_setor_demanda_id,
    operacao_secao.operacao_id,
    operacao_secao.quantidade_planejada,
    operacao_secao.quantidade_realizada,
    operacao_secao.status,
    turno.status AS turno_status,
    turno_op.produto_id
  INTO v_operacao
  FROM public.turno_setor_operacoes AS operacao_secao
  JOIN public.turnos AS turno
    ON turno.id = operacao_secao.turno_id
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = operacao_secao.turno_op_id
  WHERE operacao_secao.id = p_turno_setor_operacao_id
  FOR UPDATE OF operacao_secao;

  IF NOT FOUND OR v_operacao.turno_status <> 'aberto' THEN
    RAISE EXCEPTION 'A operação informada não foi encontrada em um turno aberto.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_operacao.status IN ('concluida', 'encerrada_manualmente') THEN
    RAISE EXCEPTION 'Esta operação da seção já está encerrada e não aceita novos apontamentos.'
      USING ERRCODE = 'P0001';
  END IF;

  v_saldo_restante_operacao := v_operacao.quantidade_planejada - v_operacao.quantidade_realizada;

  IF v_saldo_restante_operacao <= 0 THEN
    RAISE EXCEPTION 'Esta operação da seção não possui saldo restante para lançamento.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade > v_saldo_restante_operacao THEN
    RAISE EXCEPTION 'Quantidade excede o saldo restante da operação da seção.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.registros_producao (
    operador_id,
    maquina_id,
    operacao_id,
    produto_id,
    quantidade,
    turno_op_id,
    turno_setor_op_id,
    turno_setor_operacao_id,
    usuario_sistema_id,
    origem_apontamento,
    observacao
  )
  VALUES (
    p_operador_id,
    p_maquina_id,
    v_operacao.operacao_id,
    v_operacao.produto_id,
    p_quantidade,
    v_operacao.turno_op_id,
    v_operacao.turno_setor_op_id,
    p_turno_setor_operacao_id,
    p_usuario_sistema_id,
    p_origem_apontamento,
    p_observacao
  )
  RETURNING id
  INTO v_registro_id;

  v_nova_quantidade_operacao := v_operacao.quantidade_realizada + p_quantidade;
  v_saldo_restante_operacao := GREATEST(
    v_operacao.quantidade_planejada - v_nova_quantidade_operacao,
    0
  );
  v_status_operacao := CASE
    WHEN v_nova_quantidade_operacao >= v_operacao.quantidade_planejada THEN 'concluida'
    ELSE 'em_andamento'
  END;
  v_encerrado_em_operacao := CASE
    WHEN v_status_operacao = 'concluida' THEN NOW()
    ELSE NULL
  END;

  UPDATE public.turno_setor_operacoes AS operacao_secao
  SET
    quantidade_realizada = v_nova_quantidade_operacao,
    status = v_status_operacao,
    iniciado_em = COALESCE(operacao_secao.iniciado_em, NOW()),
    encerrado_em = CASE
      WHEN v_status_operacao = 'concluida'
        THEN COALESCE(operacao_secao.encerrado_em, v_encerrado_em_operacao)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE operacao_secao.id = p_turno_setor_operacao_id;

  SELECT *
  INTO v_secao_sync
  FROM public.sincronizar_andamento_turno_setor_op(v_operacao.turno_setor_op_id);

  SELECT *
  INTO v_turno_op_sync
  FROM public.sincronizar_andamento_turno_op(v_operacao.turno_op_id);

  RETURN QUERY
  SELECT
    v_registro_id,
    p_turno_setor_operacao_id,
    p_quantidade,
    v_nova_quantidade_operacao,
    v_saldo_restante_operacao,
    v_status_operacao,
    v_secao_sync.quantidade_realizada,
    GREATEST(
      v_operacao.quantidade_planejada - v_secao_sync.quantidade_realizada,
      0
    ),
    v_secao_sync.status,
    v_turno_op_sync.quantidade_realizada,
    v_turno_op_sync.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_turno_setor_demanda(UUID)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.registrar_producao_turno_setor_operacao(
  UUID,
  UUID,
  INTEGER,
  UUID,
  TEXT,
  UUID,
  TEXT
)
  TO authenticated, service_role;

COMMIT;
