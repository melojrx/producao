-- ============================================================
-- SPRINT 9.3 — Apontamento em lote do supervisor
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.registrar_producao_supervisor_em_lote(
  p_usuario_sistema_id UUID,
  p_turno_setor_op_id UUID,
  p_lancamentos JSONB
)
RETURNS TABLE (
  total_lancamentos INTEGER,
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
  v_usuario_sistema_ativo BOOLEAN;
  v_lancamento JSONB;
  v_turno_setor_op_operacao_id UUID;
  v_resultado_lancamento RECORD;
  v_total_lancamentos INTEGER := 0;
  v_ultima_secao_realizada INTEGER := 0;
  v_ultimo_saldo_secao INTEGER := 0;
  v_ultimo_status_secao TEXT := 'aberta';
  v_ultima_quantidade_turno_op INTEGER := 0;
  v_ultimo_status_turno_op TEXT := 'planejada';
BEGIN
  IF p_usuario_sistema_id IS NULL THEN
    RAISE EXCEPTION 'Usuário do sistema é obrigatório para o apontamento manual do supervisor.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_turno_setor_op_id IS NULL THEN
    RAISE EXCEPTION 'A seção do turno é obrigatória para o apontamento manual do supervisor.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_lancamentos IS NULL OR jsonb_typeof(p_lancamentos) <> 'array' OR jsonb_array_length(p_lancamentos) = 0 THEN
    RAISE EXCEPTION 'Envie ao menos um lançamento para o apontamento manual do supervisor.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT ativo
  INTO v_usuario_sistema_ativo
  FROM public.usuarios_sistema
  WHERE id = p_usuario_sistema_id;

  IF v_usuario_sistema_ativo IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Usuário do sistema inválido ou inativo para apontamento manual.'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_lancamento IN
    SELECT value
    FROM jsonb_array_elements(p_lancamentos)
  LOOP
    IF NOT (
      v_lancamento ? 'operador_id'
      AND v_lancamento ? 'turno_setor_operacao_id'
      AND v_lancamento ? 'quantidade'
    ) THEN
      RAISE EXCEPTION 'Cada lançamento deve informar operador, operação da seção e quantidade.'
        USING ERRCODE = 'P0001';
    END IF;

    v_turno_setor_op_operacao_id := (v_lancamento ->> 'turno_setor_operacao_id')::UUID;

    IF NOT EXISTS (
      SELECT 1
      FROM public.turno_setor_operacoes
      WHERE id = v_turno_setor_op_operacao_id
        AND turno_setor_op_id = p_turno_setor_op_id
    ) THEN
      RAISE EXCEPTION 'Uma ou mais operações informadas não pertencem à seção selecionada.'
        USING ERRCODE = 'P0001';
    END IF;

    SELECT *
    INTO v_resultado_lancamento
    FROM public.registrar_producao_turno_setor_operacao(
      (v_lancamento ->> 'operador_id')::UUID,
      v_turno_setor_op_operacao_id,
      (v_lancamento ->> 'quantidade')::INTEGER,
      p_usuario_sistema_id,
      'supervisor_manual',
      NULLIF(v_lancamento ->> 'maquina_id', '')::UUID,
      NULLIF(v_lancamento ->> 'observacao', '')
    );

    v_total_lancamentos := v_total_lancamentos + 1;
    v_ultima_secao_realizada := v_resultado_lancamento.quantidade_realizada_secao;
    v_ultimo_saldo_secao := v_resultado_lancamento.saldo_restante_secao;
    v_ultimo_status_secao := v_resultado_lancamento.status_turno_setor_op;
    v_ultima_quantidade_turno_op := v_resultado_lancamento.quantidade_realizada_turno_op;
    v_ultimo_status_turno_op := v_resultado_lancamento.status_turno_op;
  END LOOP;

  RETURN QUERY
  SELECT
    v_total_lancamentos,
    v_ultima_secao_realizada,
    v_ultimo_saldo_secao,
    v_ultimo_status_secao,
    v_ultima_quantidade_turno_op,
    v_ultimo_status_turno_op;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_producao_supervisor_em_lote(UUID, UUID, JSONB)
  TO authenticated, service_role;

COMMIT;
