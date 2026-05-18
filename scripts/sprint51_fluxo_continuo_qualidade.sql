-- ============================================================
-- SPRINT 51 — Fluxo continuo de qualidade simples, pratico e sem travas
-- Executar via Supabase Management API somente apos aprovacao explicita
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.qualidade_defeitos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(120) NOT NULL UNIQUE,
  classificacao VARCHAR(30) NOT NULL
    CHECK (classificacao IN ('maquina', 'operador', 'processo', 'materia_prima')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qualidade_defeitos_ativo_ordem
  ON public.qualidade_defeitos(ativo, ordem, nome);

CREATE TABLE IF NOT EXISTS public.qualidade_lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  turno_op_id UUID NOT NULL REFERENCES public.turno_ops(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES public.produtos(id),
  registro_producao_id UUID UNIQUE REFERENCES public.registros_producao(id) ON DELETE SET NULL,
  turno_setor_operacao_id_origem UUID NOT NULL
    REFERENCES public.turno_setor_operacoes(id) ON DELETE CASCADE,
  operacao_id_origem UUID NOT NULL REFERENCES public.operacoes(id),
  setor_id_origem UUID NOT NULL REFERENCES public.setores(id),
  quantidade_lote INTEGER NOT NULL CHECK (quantidade_lote > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_revisao', 'revisado', 'cancelado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  iniciado_em TIMESTAMPTZ,
  revisado_em TIMESTAMPTZ,
  cancelado_em TIMESTAMPTZ,
  cancelado_por_usuario_id UUID REFERENCES public.usuarios_sistema(id),
  cancelamento_motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (status = 'pendente' AND revisado_em IS NULL AND cancelado_em IS NULL)
    OR (status = 'em_revisao' AND iniciado_em IS NOT NULL AND revisado_em IS NULL AND cancelado_em IS NULL)
    OR (status = 'revisado' AND revisado_em IS NOT NULL AND cancelado_em IS NULL)
    OR (status = 'cancelado' AND cancelado_em IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_qualidade_lotes_turno_status
  ON public.qualidade_lotes(turno_id, status, criado_em);

CREATE INDEX IF NOT EXISTS idx_qualidade_lotes_turno_op
  ON public.qualidade_lotes(turno_op_id, criado_em);

CREATE INDEX IF NOT EXISTS idx_qualidade_lotes_operacao_origem
  ON public.qualidade_lotes(turno_setor_operacao_id_origem, criado_em);

ALTER TABLE public.qualidade_registros
  ADD COLUMN IF NOT EXISTS qualidade_lote_id UUID
    REFERENCES public.qualidade_lotes(id) ON DELETE SET NULL;

ALTER TABLE public.qualidade_registros
  ALTER COLUMN turno_setor_op_id DROP NOT NULL;

ALTER TABLE public.qualidade_registros
  ALTER COLUMN turno_setor_operacao_id_qualidade DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualidade_registros_lote_unico
  ON public.qualidade_registros(qualidade_lote_id)
  WHERE qualidade_lote_id IS NOT NULL;

ALTER TABLE public.qualidade_detalhes
  ADD COLUMN IF NOT EXISTS qualidade_defeito_id UUID
    REFERENCES public.qualidade_defeitos(id);

ALTER TABLE public.qualidade_detalhes
  ADD COLUMN IF NOT EXISTS observacao TEXT;

DO $$
DECLARE
  v_constraint RECORD;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.qualidade_detalhes'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%qualidade_registro_id%'
      AND pg_get_constraintdef(oid) LIKE '%turno_setor_operacao_id_origem%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.qualidade_detalhes DROP CONSTRAINT IF EXISTS %I',
      v_constraint.conname
    );
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_qualidade_detalhes_registro_origem_defeito
  ON public.qualidade_detalhes(
    qualidade_registro_id,
    turno_setor_operacao_id_origem,
    qualidade_defeito_id
  )
  WHERE qualidade_defeito_id IS NOT NULL;

INSERT INTO public.qualidade_defeitos (nome, classificacao, ordem)
VALUES
  ('Ponto falho', 'processo', 10),
  ('Costura caindo', 'processo', 20),
  ('Borda larga', 'processo', 30),
  ('Altura de ponta', 'processo', 40),
  ('Borda estourando', 'processo', 50),
  ('Costura torta', 'operador', 60),
  ('Faltando costura ou parte da peca', 'operador', 70),
  ('Etiqueta trocada ou danificada', 'materia_prima', 80)
ON CONFLICT (nome) DO UPDATE
SET
  classificacao = EXCLUDED.classificacao,
  ordem = EXCLUDED.ordem,
  ativo = TRUE,
  updated_at = NOW();

ALTER TABLE public.qualidade_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualidade_defeitos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qualidade_lotes_select_authenticated
  ON public.qualidade_lotes;

CREATE POLICY qualidade_lotes_select_authenticated
  ON public.qualidade_lotes
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS qualidade_defeitos_select_authenticated
  ON public.qualidade_defeitos;

CREATE POLICY qualidade_defeitos_select_authenticated
  ON public.qualidade_defeitos
  FOR SELECT
  TO authenticated
  USING (TRUE);

COMMENT ON TABLE public.qualidade_lotes IS
  'Fila continua de lotes de revisao gerados a partir de apontamentos produtivos parciais.';

COMMENT ON TABLE public.qualidade_defeitos IS
  'Catalogo estruturado de defeitos usados pela revisao de qualidade.';

COMMENT ON COLUMN public.qualidade_lotes.registro_producao_id IS
  'Origem produtiva do lote. No primeiro contrato, cada apontamento produtivo gera no maximo um lote.';

COMMENT ON COLUMN public.qualidade_registros.qualidade_lote_id IS
  'Lote da fila continua revisado por este registro, quando a revisao nasceu da Sprint 51.';

CREATE OR REPLACE FUNCTION public.criar_lote_qualidade_de_registro_producao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origem RECORD;
BEGIN
  IF NEW.turno_setor_operacao_id IS NULL
    OR NEW.turno_op_id IS NULL
    OR COALESCE(NEW.quantidade, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  SELECT
    operacao_secao.turno_id,
    operacao_secao.turno_op_id,
    turno_op.produto_id,
    operacao_secao.id AS turno_setor_operacao_id_origem,
    operacao_secao.operacao_id AS operacao_id_origem,
    operacao_secao.setor_id AS setor_id_origem
  INTO v_origem
  FROM public.turno_setor_operacoes AS operacao_secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = operacao_secao.turno_op_id
  WHERE operacao_secao.id = NEW.turno_setor_operacao_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.qualidade_lotes (
    turno_id,
    turno_op_id,
    produto_id,
    registro_producao_id,
    turno_setor_operacao_id_origem,
    operacao_id_origem,
    setor_id_origem,
    quantidade_lote,
    status,
    criado_em
  )
  VALUES (
    v_origem.turno_id,
    v_origem.turno_op_id,
    v_origem.produto_id,
    NEW.id,
    v_origem.turno_setor_operacao_id_origem,
    v_origem.operacao_id_origem,
    v_origem.setor_id_origem,
    NEW.quantidade,
    'pendente',
    COALESCE(NEW.hora_registro, NOW())
  )
  ON CONFLICT (registro_producao_id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_lote_qualidade_de_registro_producao()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_registros_producao_criar_lote_qualidade
  ON public.registros_producao;

CREATE TRIGGER trg_registros_producao_criar_lote_qualidade
AFTER INSERT ON public.registros_producao
FOR EACH ROW
EXECUTE FUNCTION public.criar_lote_qualidade_de_registro_producao();

CREATE OR REPLACE FUNCTION public.validar_insert_qualidade_saldo_fisico_op()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo RECORD;
BEGIN
  IF NEW.qualidade_lote_id IS NOT NULL
    OR NEW.turno_setor_operacao_id_qualidade IS NULL THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.registrar_revisao_lote_qualidade(
  p_qualidade_lote_id UUID,
  p_revisor_usuario_id UUID,
  p_quantidade_aprovada INTEGER,
  p_quantidade_reprovada INTEGER,
  p_origem_lancamento TEXT DEFAULT 'manual_qualidade',
  p_detalhes JSONB DEFAULT '[]'::JSONB
)
RETURNS TABLE (
  qualidade_registro_id UUID,
  qualidade_lote_id UUID,
  quantidade_aprovada INTEGER,
  quantidade_reprovada INTEGER,
  quantidade_revisada INTEGER,
  total_defeitos INTEGER,
  status_lote TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lote RECORD;
  v_usuario RECORD;
  v_operacao_origem RECORD;
  v_detalhe JSONB;
  v_turno_setor_operacao_id_origem UUID;
  v_qualidade_defeito_id UUID;
  v_quantidade_defeito INTEGER;
  v_observacao TEXT;
  v_registro_id UUID;
  v_quantidade_revisada INTEGER;
  v_total_defeitos INTEGER := 0;
BEGIN
  IF p_qualidade_lote_id IS NULL THEN
    RAISE EXCEPTION 'O lote de qualidade não foi informado para revisão.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_revisor_usuario_id IS NULL THEN
    RAISE EXCEPTION 'O revisor da qualidade não foi informado.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_origem_lancamento NOT IN ('scanner_qualidade', 'manual_qualidade') THEN
    RAISE EXCEPTION 'Origem de lançamento de qualidade inválida: %', p_origem_lancamento
      USING ERRCODE = 'P0001';
  END IF;

  IF COALESCE(p_quantidade_aprovada, -1) < 0
    OR COALESCE(p_quantidade_reprovada, -1) < 0 THEN
    RAISE EXCEPTION 'As quantidades aprovadas e reprovadas precisam ser maiores ou iguais a zero.'
      USING ERRCODE = 'P0001';
  END IF;

  IF jsonb_typeof(COALESCE(p_detalhes, '[]'::JSONB)) <> 'array' THEN
    RAISE EXCEPTION 'Os defeitos da revisão precisam ser enviados como lista.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_usuario
  FROM public.usuarios_sistema
  WHERE id = p_revisor_usuario_id
    AND COALESCE(ativo, TRUE) = TRUE
    AND pode_revisar_qualidade = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário sem permissão para registrar revisões de qualidade.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_lote
  FROM public.qualidade_lotes
  WHERE id = p_qualidade_lote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lote de qualidade não encontrado.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_lote.status NOT IN ('pendente', 'em_revisao') THEN
    RAISE EXCEPTION 'O lote de qualidade já foi finalizado e não pode receber nova revisão.'
      USING ERRCODE = 'P0001';
  END IF;

  v_quantidade_revisada := p_quantidade_aprovada + p_quantidade_reprovada;

  IF v_quantidade_revisada <> v_lote.quantidade_lote THEN
    RAISE EXCEPTION 'A soma de aprovadas e reprovadas precisa fechar exatamente a quantidade do lote de qualidade.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade_reprovada = 0 AND jsonb_array_length(COALESCE(p_detalhes, '[]'::JSONB)) > 0 THEN
    RAISE EXCEPTION 'Não informe defeitos quando o lote não possuir peças reprovadas.'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_quantidade_reprovada > 0 AND jsonb_array_length(COALESCE(p_detalhes, '[]'::JSONB)) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um defeito do catálogo para as peças reprovadas.'
      USING ERRCODE = 'P0001';
  END IF;

  FOR v_detalhe IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_detalhes, '[]'::JSONB))
  LOOP
    v_turno_setor_operacao_id_origem := NULLIF(v_detalhe->>'turno_setor_operacao_id_origem', '')::UUID;
    v_qualidade_defeito_id := NULLIF(v_detalhe->>'qualidade_defeito_id', '')::UUID;
    v_quantidade_defeito := COALESCE((v_detalhe->>'quantidade_defeito')::INTEGER, 0);

    IF v_turno_setor_operacao_id_origem IS NULL THEN
      RAISE EXCEPTION 'Cada defeito precisa informar a operação produtiva analisada.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.turno_setor_operacoes AS origem
      JOIN public.setores AS setor_origem
        ON setor_origem.id = origem.setor_id
      WHERE origem.id = v_turno_setor_operacao_id_origem
        AND origem.turno_id = v_lote.turno_id
        AND origem.turno_op_id = v_lote.turno_op_id
        AND COALESCE(setor_origem.modo_apontamento, 'producao_padrao') = 'producao_padrao'
    ) THEN
      RAISE EXCEPTION 'A operação do defeito precisa pertencer à OP do lote e ser produtiva.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_qualidade_defeito_id IS NULL THEN
      RAISE EXCEPTION 'Cada defeito precisa estar vinculado ao catálogo de defeitos.'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_quantidade_defeito <= 0 THEN
      RAISE EXCEPTION 'Cada defeito precisa informar uma quantidade inteira maior que zero.'
        USING ERRCODE = 'P0001';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.qualidade_defeitos
      WHERE id = v_qualidade_defeito_id
        AND ativo = TRUE
    ) THEN
      RAISE EXCEPTION 'Defeito de qualidade não encontrado ou inativo: %', v_qualidade_defeito_id
        USING ERRCODE = 'P0001';
    END IF;

    v_total_defeitos := v_total_defeitos + v_quantidade_defeito;
  END LOOP;

  INSERT INTO public.qualidade_registros (
    turno_id,
    turno_op_id,
    turno_setor_op_id,
    turno_setor_operacao_id_qualidade,
    revisor_usuario_id,
    quantidade_aprovada,
    quantidade_reprovada,
    quantidade_revisada,
    origem_lancamento,
    qualidade_lote_id
  )
  VALUES (
    v_lote.turno_id,
    v_lote.turno_op_id,
    NULL,
    NULL,
    p_revisor_usuario_id,
    p_quantidade_aprovada,
    p_quantidade_reprovada,
    v_quantidade_revisada,
    p_origem_lancamento,
    v_lote.id
  )
  RETURNING id INTO v_registro_id;

  FOR v_detalhe IN
    SELECT value
    FROM jsonb_array_elements(COALESCE(p_detalhes, '[]'::JSONB))
  LOOP
    v_turno_setor_operacao_id_origem := NULLIF(v_detalhe->>'turno_setor_operacao_id_origem', '')::UUID;
    v_qualidade_defeito_id := NULLIF(v_detalhe->>'qualidade_defeito_id', '')::UUID;
    v_quantidade_defeito := COALESCE((v_detalhe->>'quantidade_defeito')::INTEGER, 0);
    v_observacao := NULLIF(BTRIM(COALESCE(v_detalhe->>'observacao', '')), '');

    SELECT
      origem.id AS turno_setor_operacao_id_origem,
      origem.operacao_id AS operacao_id_origem,
      origem.setor_id AS setor_id_origem
    INTO v_operacao_origem
    FROM public.turno_setor_operacoes AS origem
    JOIN public.setores AS setor_origem
      ON setor_origem.id = origem.setor_id
    WHERE origem.id = v_turno_setor_operacao_id_origem
      AND origem.turno_id = v_lote.turno_id
      AND origem.turno_op_id = v_lote.turno_op_id
      AND COALESCE(setor_origem.modo_apontamento, 'producao_padrao') = 'producao_padrao';

    INSERT INTO public.qualidade_detalhes (
      qualidade_registro_id,
      turno_setor_operacao_id_origem,
      operacao_id_origem,
      setor_id_origem,
      quantidade_defeito,
      qualidade_defeito_id,
      observacao
    )
    VALUES (
      v_registro_id,
      v_operacao_origem.turno_setor_operacao_id_origem,
      v_operacao_origem.operacao_id_origem,
      v_operacao_origem.setor_id_origem,
      v_quantidade_defeito,
      v_qualidade_defeito_id,
      v_observacao
    );
  END LOOP;

  UPDATE public.qualidade_lotes
  SET
    status = 'revisado',
    iniciado_em = COALESCE(iniciado_em, NOW()),
    revisado_em = NOW(),
    updated_at = NOW()
  WHERE id = v_lote.id;

  RETURN QUERY
  SELECT
    v_registro_id,
    v_lote.id,
    p_quantidade_aprovada,
    p_quantidade_reprovada,
    v_quantidade_revisada,
    v_total_defeitos,
    'revisado'::TEXT;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_revisao_lote_qualidade(
  UUID,
  UUID,
  INTEGER,
  INTEGER,
  TEXT,
  JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.criar_lote_qualidade_de_registro_producao()
  TO service_role;

GRANT EXECUTE ON FUNCTION public.registrar_revisao_lote_qualidade(
  UUID,
  UUID,
  INTEGER,
  INTEGER,
  TEXT,
  JSONB
) TO service_role;

COMMIT;
