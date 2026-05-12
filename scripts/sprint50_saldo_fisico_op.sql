-- ============================================================
-- SPRINT 50 — Controle físico de saldo da OP
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.calcular_saldo_fisico_operacao_op(
  p_turno_setor_operacao_id UUID
)
RETURNS TABLE (
  numero_op TEXT,
  quantidade_planejada INTEGER,
  quantidade_consumida INTEGER,
  saldo_fisico INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operacao RECORD;
  v_turno_op_raiz_id UUID;
  v_quantidade_registrada_linhagem INTEGER := 0;
  v_quantidade_herdada_setor INTEGER := 0;
  v_quantidade_consumida INTEGER := 0;
BEGIN
  SELECT
    operacao_secao.id,
    operacao_secao.turno_op_id,
    operacao_secao.turno_setor_demanda_id,
    operacao_secao.operacao_id,
    operacao_secao.quantidade_planejada,
    operacao_secao.quantidade_realizada,
    turno_op.numero_op,
    COALESCE(turno_op.turno_op_origem_id, turno_op.id) AS turno_op_raiz_id
  INTO v_operacao
  FROM public.turno_setor_operacoes AS operacao_secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = operacao_secao.turno_op_id
  WHERE operacao_secao.id = p_turno_setor_operacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Operação da OP não encontrada para controle de saldo físico.'
      USING ERRCODE = 'P0002';
  END IF;

  v_turno_op_raiz_id := v_operacao.turno_op_raiz_id;

  SELECT COALESCE(SUM(registro.quantidade), 0)::INTEGER
  INTO v_quantidade_registrada_linhagem
  FROM public.registros_producao AS registro
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = registro.turno_op_id
  WHERE registro.operacao_id = v_operacao.operacao_id
    AND (
      turno_op.id = v_turno_op_raiz_id
      OR turno_op.turno_op_origem_id = v_turno_op_raiz_id
    );

  IF v_operacao.turno_setor_demanda_id IS NOT NULL THEN
    SELECT COALESCE(demanda.quantidade_herdada_setor, 0)
    INTO v_quantidade_herdada_setor
    FROM public.turno_setor_demandas AS demanda
    WHERE demanda.id = v_operacao.turno_setor_demanda_id;
  END IF;

  v_quantidade_consumida := GREATEST(
    COALESCE(v_quantidade_registrada_linhagem, 0),
    COALESCE(v_quantidade_herdada_setor, 0) + COALESCE(v_operacao.quantidade_realizada, 0)
  );

  RETURN QUERY
  SELECT
    v_operacao.numero_op::TEXT,
    v_operacao.quantidade_planejada::INTEGER,
    v_quantidade_consumida::INTEGER,
    GREATEST(v_operacao.quantidade_planejada - v_quantidade_consumida, 0)::INTEGER;
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_insert_registro_saldo_fisico_op()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo RECORD;
BEGIN
  IF NEW.turno_setor_operacao_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO v_saldo
  FROM public.calcular_saldo_fisico_operacao_op(NEW.turno_setor_operacao_id);

  IF COALESCE(NEW.quantidade, 0) > COALESCE(v_saldo.saldo_fisico, 0) THEN
    IF COALESCE(v_saldo.saldo_fisico, 0) <= 0 THEN
      RAISE EXCEPTION 'A OP % não possui mais saldo físico nesta operação. Registre a próxima produção em outra OP.', v_saldo.numero_op
        USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'A OP % possui apenas % peça(s) com saldo físico nesta operação. Ajuste o lote ou selecione outra OP.', v_saldo.numero_op, v_saldo.saldo_fisico
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registros_producao_saldo_fisico_op
  ON public.registros_producao;

CREATE TRIGGER trg_registros_producao_saldo_fisico_op
BEFORE INSERT ON public.registros_producao
FOR EACH ROW
EXECUTE FUNCTION public.validar_insert_registro_saldo_fisico_op();

CREATE OR REPLACE FUNCTION public.validar_insert_qualidade_saldo_fisico_op()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo RECORD;
BEGIN
  SELECT *
  INTO v_saldo
  FROM public.calcular_saldo_fisico_operacao_op(NEW.turno_setor_operacao_id_qualidade);

  IF COALESCE(NEW.quantidade_revisada, 0) > COALESCE(v_saldo.saldo_fisico, 0) THEN
    IF COALESCE(v_saldo.saldo_fisico, 0) <= 0 THEN
      RAISE EXCEPTION 'A OP % não possui mais saldo físico nesta operação. Registre a próxima produção em outra OP.', v_saldo.numero_op
        USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'A OP % possui apenas % peça(s) com saldo físico nesta operação. Ajuste o lote ou selecione outra OP.', v_saldo.numero_op, v_saldo.saldo_fisico
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qualidade_registros_saldo_fisico_op
  ON public.qualidade_registros;

CREATE TRIGGER trg_qualidade_registros_saldo_fisico_op
BEFORE INSERT ON public.qualidade_registros
FOR EACH ROW
EXECUTE FUNCTION public.validar_insert_qualidade_saldo_fisico_op();

GRANT EXECUTE ON FUNCTION public.calcular_saldo_fisico_operacao_op(UUID)
  TO authenticated, service_role;

COMMIT;
