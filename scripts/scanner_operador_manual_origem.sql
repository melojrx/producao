-- ============================================================
-- Scanner V2 — Fallback manual de operador com origem diferenciada
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

ALTER TABLE public.registros_producao
  DROP CONSTRAINT IF EXISTS registros_producao_origem_apontamento_check;

ALTER TABLE public.registros_producao
  ADD CONSTRAINT registros_producao_origem_apontamento_check
  CHECK (origem_apontamento IN ('operador_qr', 'operador_manual', 'supervisor_manual'));

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

  IF p_origem_apontamento NOT IN ('operador_qr', 'operador_manual', 'supervisor_manual') THEN
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
