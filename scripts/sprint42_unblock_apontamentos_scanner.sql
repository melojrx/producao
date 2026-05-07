-- ============================================================
-- SPRINT 42.6 — Apontamentos e scanner sem bloqueio por saldo visual
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

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

  IF v_operacao.status = 'encerrada_manualmente' THEN
    RAISE EXCEPTION 'Esta operação da seção foi encerrada manualmente e não aceita novos apontamentos.'
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
    GREATEST(v_operacao.quantidade_planejada - v_secao_sync.quantidade_realizada, 0),
    v_secao_sync.status,
    v_turno_op_sync.quantidade_realizada,
    v_turno_op_sync.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_revisao_qualidade_turno_setor_operacao(
  p_turno_setor_operacao_id_qualidade UUID,
  p_revisor_usuario_id UUID,
  p_quantidade_aprovada INTEGER,
  p_quantidade_reprovada INTEGER,
  p_origem_lancamento TEXT DEFAULT 'scanner_qualidade',
  p_detalhes JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
  qualidade_registro_id UUID,
  turno_setor_operacao_id UUID,
  quantidade_aprovada INTEGER,
  quantidade_reprovada INTEGER,
  quantidade_revisada INTEGER,
  total_defeitos INTEGER,
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
  v_revisor RECORD;
  v_operacao RECORD;
  v_quantidade_revisada INTEGER;
  v_nova_quantidade_operacao INTEGER;
  v_saldo_restante_operacao INTEGER;
  v_status_operacao TEXT;
  v_encerrado_em_operacao TIMESTAMPTZ;
  v_qualidade_registro_id UUID;
  v_secao_sync RECORD;
  v_turno_op_sync RECORD;
  v_total_detalhes INTEGER;
  v_total_detalhes_unicos INTEGER;
  v_total_detalhes_invalidos INTEGER;
  v_total_detalhes_validos INTEGER;
  v_total_defeitos INTEGER;
BEGIN
  IF p_quantidade_aprovada IS NULL OR p_quantidade_aprovada < 0 THEN
    RAISE EXCEPTION 'A quantidade aprovada deve ser um número inteiro maior ou igual a 0.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade_reprovada IS NULL OR p_quantidade_reprovada < 0 THEN
    RAISE EXCEPTION 'A quantidade reprovada deve ser um número inteiro maior ou igual a 0.'
      USING ERRCODE = 'P0001';
  END IF;

  v_quantidade_revisada := p_quantidade_aprovada + p_quantidade_reprovada;

  IF v_quantidade_revisada <= 0 THEN
    RAISE EXCEPTION 'A revisão precisa informar ao menos uma peça aprovada ou reprovada.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_origem_lancamento NOT IN ('scanner_qualidade', 'manual_qualidade') THEN
    RAISE EXCEPTION 'Origem de lançamento de qualidade inválida.'
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(jsonb_typeof(p_detalhes), 'array') <> 'array' THEN
    RAISE EXCEPTION 'Os defeitos por operação precisam ser informados em formato de lista.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    id,
    ativo,
    pode_revisar_qualidade
  INTO v_revisor
  FROM public.usuarios_sistema
  WHERE id = p_revisor_usuario_id;

  IF NOT FOUND OR v_revisor.ativo IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Revisor inválido ou inativo para registro da qualidade.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_revisor.pode_revisar_qualidade IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'O usuário informado não possui permissão para revisar qualidade.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    operacao_secao.id,
    operacao_secao.turno_id,
    operacao_secao.turno_op_id,
    operacao_secao.turno_setor_op_id,
    operacao_secao.turno_setor_demanda_id,
    operacao_secao.operacao_id,
    operacao_secao.setor_id,
    operacao_secao.quantidade_planejada,
    operacao_secao.quantidade_realizada,
    operacao_secao.status,
    secao.status AS secao_status,
    turno.status AS turno_status,
    setor.modo_apontamento
  INTO v_operacao
  FROM public.turno_setor_operacoes AS operacao_secao
  JOIN public.turno_setor_ops AS secao
    ON secao.id = operacao_secao.turno_setor_op_id
  JOIN public.turnos AS turno
    ON turno.id = operacao_secao.turno_id
  JOIN public.setores AS setor
    ON setor.id = operacao_secao.setor_id
  WHERE operacao_secao.id = p_turno_setor_operacao_id_qualidade
  FOR UPDATE OF operacao_secao, secao;

  IF NOT FOUND OR v_operacao.turno_status <> 'aberto' THEN
    RAISE EXCEPTION 'A operação de qualidade informada não foi encontrada em um turno aberto.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_operacao.modo_apontamento <> 'revisao_qualidade' THEN
    RAISE EXCEPTION 'A operação informada não pertence a um setor configurado para revisão de qualidade.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_operacao.status = 'encerrada_manualmente' THEN
    RAISE EXCEPTION 'Esta operação de qualidade foi encerrada manualmente e não aceita novos apontamentos.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_operacao.secao_status = 'encerrada_manualmente' THEN
    RAISE EXCEPTION 'A seção de qualidade foi encerrada manualmente e não aceita novos apontamentos.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    COUNT(*)::INTEGER,
    COUNT(DISTINCT detalhe.turno_setor_operacao_id_origem)::INTEGER,
    COUNT(*) FILTER (
      WHERE detalhe.turno_setor_operacao_id_origem IS NULL
        OR detalhe.quantidade_defeito IS NULL
        OR detalhe.quantidade_defeito <= 0
    )::INTEGER,
    COALESCE(SUM(detalhe.quantidade_defeito), 0)::INTEGER
  INTO
    v_total_detalhes,
    v_total_detalhes_unicos,
    v_total_detalhes_invalidos,
    v_total_defeitos
  FROM jsonb_to_recordset(COALESCE(p_detalhes, '[]'::JSONB)) AS detalhe(
    turno_setor_operacao_id_origem UUID,
    quantidade_defeito INTEGER
  );

  IF p_quantidade_reprovada = 0 AND v_total_detalhes > 0 THEN
    RAISE EXCEPTION 'Não informe defeitos por operação quando a revisão não possuir peças reprovadas.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade_reprovada > 0 AND v_total_detalhes = 0 THEN
    RAISE EXCEPTION 'Informe ao menos uma operação de origem para as peças reprovadas.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_total_detalhes_invalidos > 0 THEN
    RAISE EXCEPTION 'Os defeitos por operação precisam informar origem válida e quantidade maior que zero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_total_detalhes <> v_total_detalhes_unicos THEN
    RAISE EXCEPTION 'Cada operação de origem pode aparecer apenas uma vez por revisão.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_total_detalhes > 0 THEN
    SELECT COUNT(*)::INTEGER
    INTO v_total_detalhes_validos
    FROM jsonb_to_recordset(COALESCE(p_detalhes, '[]'::JSONB)) AS detalhe(
      turno_setor_operacao_id_origem UUID,
      quantidade_defeito INTEGER
    )
    JOIN public.turno_setor_operacoes AS origem
      ON origem.id = detalhe.turno_setor_operacao_id_origem
    JOIN public.setores AS setor_origem
      ON setor_origem.id = origem.setor_id
    WHERE origem.turno_id = v_operacao.turno_id
      AND origem.turno_op_id = v_operacao.turno_op_id
      AND origem.id <> p_turno_setor_operacao_id_qualidade
      AND setor_origem.modo_apontamento = 'producao_padrao';

    IF v_total_detalhes_validos <> v_total_detalhes THEN
      RAISE EXCEPTION 'As operações de origem informadas precisam pertencer à mesma OP e não podem apontar para a própria revisão.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.qualidade_registros (
    turno_id,
    turno_op_id,
    turno_setor_op_id,
    turno_setor_operacao_id_qualidade,
    revisor_usuario_id,
    quantidade_aprovada,
    quantidade_reprovada,
    quantidade_revisada,
    origem_lancamento
  )
  VALUES (
    v_operacao.turno_id,
    v_operacao.turno_op_id,
    v_operacao.turno_setor_op_id,
    p_turno_setor_operacao_id_qualidade,
    p_revisor_usuario_id,
    p_quantidade_aprovada,
    p_quantidade_reprovada,
    v_quantidade_revisada,
    p_origem_lancamento
  )
  RETURNING id
  INTO v_qualidade_registro_id;

  IF v_total_detalhes > 0 THEN
    INSERT INTO public.qualidade_detalhes (
      qualidade_registro_id,
      turno_setor_operacao_id_origem,
      operacao_id_origem,
      setor_id_origem,
      quantidade_defeito
    )
    SELECT
      v_qualidade_registro_id,
      origem.id,
      origem.operacao_id,
      origem.setor_id,
      detalhe.quantidade_defeito
    FROM jsonb_to_recordset(COALESCE(p_detalhes, '[]'::JSONB)) AS detalhe(
      turno_setor_operacao_id_origem UUID,
      quantidade_defeito INTEGER
    )
    JOIN public.turno_setor_operacoes AS origem
      ON origem.id = detalhe.turno_setor_operacao_id_origem
    JOIN public.setores AS setor_origem
      ON setor_origem.id = origem.setor_id
    WHERE origem.turno_id = v_operacao.turno_id
      AND origem.turno_op_id = v_operacao.turno_op_id
      AND origem.id <> p_turno_setor_operacao_id_qualidade
      AND setor_origem.modo_apontamento = 'producao_padrao';
  END IF;

  v_nova_quantidade_operacao := v_operacao.quantidade_realizada + v_quantidade_revisada;
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
  WHERE operacao_secao.id = p_turno_setor_operacao_id_qualidade;

  SELECT *
  INTO v_secao_sync
  FROM public.sincronizar_andamento_turno_setor_op(v_operacao.turno_setor_op_id);

  SELECT *
  INTO v_turno_op_sync
  FROM public.sincronizar_andamento_turno_op(v_operacao.turno_op_id);

  RETURN QUERY
  SELECT
    v_qualidade_registro_id,
    p_turno_setor_operacao_id_qualidade,
    p_quantidade_aprovada,
    p_quantidade_reprovada,
    v_quantidade_revisada,
    v_total_defeitos,
    v_nova_quantidade_operacao,
    v_saldo_restante_operacao,
    v_status_operacao,
    v_secao_sync.quantidade_realizada,
    GREATEST(v_operacao.quantidade_planejada - v_secao_sync.quantidade_realizada, 0),
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

GRANT EXECUTE ON FUNCTION public.registrar_revisao_qualidade_turno_setor_operacao(
  UUID,
  UUID,
  INTEGER,
  INTEGER,
  TEXT,
  JSONB
)
  TO authenticated, service_role;

COMMIT;
