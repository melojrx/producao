CREATE OR REPLACE FUNCTION public.setor_qualidade_legado(
  p_nome TEXT,
  p_modo_apontamento TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_modo_apontamento, 'producao_padrao') = 'revisao_qualidade'
    OR lower(btrim(COALESCE(p_nome, ''))) = 'qualidade';
$$;

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
    AND operacao.setor_id IS NOT NULL
    AND NOT public.setor_qualidade_legado(setor.nome, setor.modo_apontamento);

  GET DIAGNOSTICS v_total_setores = ROW_COUNT;

  IF v_total_setores = 0 THEN
    RAISE EXCEPTION 'Produto % não possui setores produtivos válidos no roteiro.', v_produto_id
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
    AND operacao.setor_id = v_setor_id
    AND NOT public.setor_qualidade_legado(setor.nome, setor.modo_apontamento)
  ORDER BY produto_operacao.sequencia;

  GET DIAGNOSTICS v_total_operacoes = ROW_COUNT;

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Seção % não possui operações produtivas válidas derivadas do roteiro.', p_turno_setor_op_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total_operacoes;
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
    turno_op.produto_id,
    setor.nome AS setor_nome,
    setor.modo_apontamento AS setor_modo_apontamento
  INTO v_secao
  FROM public.turno_setor_ops AS secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  JOIN public.setores AS setor
    ON setor.id = secao.setor_id
  WHERE secao.id = p_turno_setor_op_id;

  IF NOT FOUND THEN
    DELETE FROM public.turno_setor_demandas
    WHERE turno_setor_op_legacy_id = p_turno_setor_op_id;
    RETURN NULL;
  END IF;

  IF public.setor_qualidade_legado(v_secao.setor_nome, v_secao.setor_modo_apontamento) THEN
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

REVOKE ALL ON FUNCTION public.setor_qualidade_legado(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.setor_qualidade_legado(TEXT, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sincronizar_turno_setor_ops(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_turno_setor_ops(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sincronizar_turno_setor_operacoes(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_turno_setor_operacoes(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.sincronizar_turno_setor_demanda_legada(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sincronizar_turno_setor_demanda_legada(UUID) TO authenticated, service_role;
