BEGIN;

ALTER TABLE public.produto_operacoes
  ADD COLUMN IF NOT EXISTS versao_roteiro INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public.produto_operacoes
  ADD COLUMN IF NOT EXISTS vigente BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.produto_operacoes
  ADD COLUMN IF NOT EXISTS substituido_em TIMESTAMPTZ;

ALTER TABLE public.produto_operacoes
  DROP CONSTRAINT IF EXISTS produto_operacoes_produto_id_sequencia_key;

DROP INDEX IF EXISTS public.produto_operacoes_produto_id_sequencia_key;

CREATE UNIQUE INDEX IF NOT EXISTS produto_operacoes_produto_versao_sequencia_uidx
  ON public.produto_operacoes (produto_id, versao_roteiro, sequencia)
  WHERE produto_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS produto_operacoes_produto_vigente_sequencia_uidx
  ON public.produto_operacoes (produto_id, sequencia)
  WHERE vigente = TRUE AND produto_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS produto_operacoes_produto_vigente_idx
  ON public.produto_operacoes (produto_id, vigente, sequencia);

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_ops(p_turno_op_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  JOIN public.setores setor
    ON setor.id = operacao.setor_id
  WHERE produto_operacao.produto_id = v_produto_id
    AND produto_operacao.vigente = TRUE
    AND operacao.setor_id IS NOT NULL
    AND NOT public.setor_qualidade_legado(setor.nome, setor.modo_apontamento);

  GET DIAGNOSTICS v_total_setores = ROW_COUNT;

  IF v_total_setores = 0 THEN
    RAISE EXCEPTION 'Produto % não possui setores produtivos válidos no roteiro vigente.', v_produto_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total_setores;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_operacoes(p_turno_setor_op_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_turno_id UUID;
  v_turno_op_id UUID;
  v_setor_id UUID;
  v_produto_id UUID;
  v_quantidade_planejada INTEGER;
  v_tem_realizado BOOLEAN;
  v_total_operacoes INTEGER;
  v_setor_nome TEXT;
  v_setor_modo_apontamento TEXT;
BEGIN
  SELECT
    secao.turno_id,
    secao.turno_op_id,
    secao.setor_id,
    secao.quantidade_planejada,
    turno_op.produto_id,
    setor.nome,
    setor.modo_apontamento
  INTO
    v_turno_id,
    v_turno_op_id,
    v_setor_id,
    v_quantidade_planejada,
    v_produto_id,
    v_setor_nome,
    v_setor_modo_apontamento
  FROM public.turno_setor_ops AS secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  JOIN public.setores AS setor
    ON setor.id = secao.setor_id
  WHERE secao.id = p_turno_setor_op_id;

  IF v_turno_id IS NULL OR v_turno_op_id IS NULL OR v_setor_id IS NULL OR v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Seção % não encontrada para sincronização das operações.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
  END IF;

  IF public.setor_qualidade_legado(v_setor_nome, v_setor_modo_apontamento) THEN
    DELETE FROM public.turno_setor_operacoes
    WHERE turno_setor_op_id = p_turno_setor_op_id;

    RETURN 0;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.turno_setor_operacoes
    WHERE turno_setor_op_id = p_turno_setor_op_id
      AND quantidade_realizada > 0
  )
  INTO v_tem_realizado;

  IF v_tem_realizado THEN
    RAISE EXCEPTION 'Não é possível regerar operações de uma seção que já possui produção apontada.'
      USING ERRCODE = 'P0001';
  END IF;

  DELETE FROM public.turno_setor_operacoes
  WHERE turno_setor_op_id = p_turno_setor_op_id;

  INSERT INTO public.turno_setor_operacoes (
    turno_id,
    turno_op_id,
    turno_setor_op_id,
    produto_operacao_id,
    operacao_id,
    setor_id,
    sequencia,
    tempo_padrao_min_snapshot,
    quantidade_planejada,
    quantidade_realizada,
    status
  )
  SELECT
    v_turno_id,
    v_turno_op_id,
    p_turno_setor_op_id,
    produto_operacao.id,
    operacao.id,
    v_setor_id,
    produto_operacao.sequencia,
    operacao.tempo_padrao_min,
    v_quantidade_planejada,
    0,
    'aberta'
  FROM public.produto_operacoes AS produto_operacao
  JOIN public.operacoes AS operacao
    ON operacao.id = produto_operacao.operacao_id
  JOIN public.setores AS setor
    ON setor.id = operacao.setor_id
  WHERE produto_operacao.produto_id = v_produto_id
    AND produto_operacao.vigente = TRUE
    AND operacao.setor_id = v_setor_id
    AND NOT public.setor_qualidade_legado(setor.nome, setor.modo_apontamento)
  ORDER BY produto_operacao.sequencia;

  GET DIAGNOSTICS v_total_operacoes = ROW_COUNT;

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Seção % não possui operações produtivas válidas derivadas do roteiro vigente.', p_turno_setor_op_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total_operacoes;
END;
$$;

COMMIT;
