-- ============================================================
-- SPRINT 8.3 — Apontamento transacional do scanner V2
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

ALTER TABLE public.registros_producao
  ALTER COLUMN operacao_id DROP NOT NULL;

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS turno_setor_op_id UUID
    REFERENCES public.turno_setor_ops(id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_turno_setor_op_id
  ON public.registros_producao(turno_setor_op_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registros_producao_contexto_v1_ou_v2_check'
      AND conrelid = 'public.registros_producao'::regclass
  ) THEN
    ALTER TABLE public.registros_producao
      ADD CONSTRAINT registros_producao_contexto_v1_ou_v2_check
      CHECK (operacao_id IS NOT NULL OR turno_setor_op_id IS NOT NULL);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.buscar_turno_setor_op_scanner(p_qr_code_token TEXT)
RETURNS TABLE (
  id UUID,
  turno_id UUID,
  turno_iniciado_em TIMESTAMPTZ,
  turno_op_id UUID,
  setor_id UUID,
  setor_nome TEXT,
  numero_op TEXT,
  produto_id UUID,
  produto_nome TEXT,
  produto_referencia TEXT,
  quantidade_planejada INTEGER,
  quantidade_realizada INTEGER,
  saldo_restante INTEGER,
  qr_code_token TEXT,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    secao.id,
    secao.turno_id,
    turno.iniciado_em AS turno_iniciado_em,
    secao.turno_op_id,
    secao.setor_id,
    setor.nome::TEXT AS setor_nome,
    turno_op.numero_op::TEXT,
    produto.id AS produto_id,
    produto.nome::TEXT AS produto_nome,
    produto.referencia::TEXT AS produto_referencia,
    secao.quantidade_planejada,
    secao.quantidade_realizada,
    GREATEST(secao.quantidade_planejada - secao.quantidade_realizada, 0) AS saldo_restante,
    secao.qr_code_token::TEXT,
    secao.status::TEXT
  FROM public.turno_setor_ops AS secao
  JOIN public.turnos AS turno
    ON turno.id = secao.turno_id
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  JOIN public.produtos AS produto
    ON produto.id = turno_op.produto_id
  JOIN public.setores AS setor
    ON setor.id = secao.setor_id
  WHERE secao.qr_code_token = p_qr_code_token
    AND turno.status = 'aberto'
  LIMIT 1;
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
    WHEN v_nova_quantidade > 0 THEN 'em_andamento'
    ELSE v_secao.status
  END;

  UPDATE public.turno_setor_ops
  SET
    quantidade_realizada = v_nova_quantidade,
    status = v_status_secao,
    iniciado_em = COALESCE(iniciado_em, NOW()),
    updated_at = NOW()
  WHERE id = p_turno_setor_op_id;

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

GRANT EXECUTE ON FUNCTION public.buscar_turno_setor_op_scanner(TEXT)
  TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.registrar_producao_turno_setor_op(UUID, UUID, INTEGER, UUID)
  TO authenticated, service_role;

COMMIT;
