-- ============================================================
-- SPRINT 9.2 — Apontamento atômico por operação dentro da seção
-- Executar via Supabase Management API
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.turno_setor_operacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  turno_op_id UUID NOT NULL REFERENCES public.turno_ops(id) ON DELETE CASCADE,
  turno_setor_op_id UUID NOT NULL REFERENCES public.turno_setor_ops(id) ON DELETE CASCADE,
  produto_operacao_id UUID NOT NULL REFERENCES public.produto_operacoes(id),
  operacao_id UUID NOT NULL REFERENCES public.operacoes(id),
  setor_id UUID NOT NULL REFERENCES public.setores(id),
  sequencia INTEGER NOT NULL CHECK (sequencia > 0),
  tempo_padrao_min_snapshot DECIMAL(8,6) NOT NULL CHECK (tempo_padrao_min_snapshot > 0),
  quantidade_planejada INTEGER NOT NULL CHECK (quantidade_planejada > 0),
  quantidade_realizada INTEGER NOT NULL DEFAULT 0
    CHECK (quantidade_realizada >= 0 AND quantidade_realizada <= quantidade_planejada),
  status VARCHAR(30) NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('planejada', 'aberta', 'em_andamento', 'concluida', 'encerrada_manualmente')),
  iniciado_em TIMESTAMPTZ,
  encerrado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(turno_setor_op_id, operacao_id),
  UNIQUE(turno_setor_op_id, sequencia)
);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_turno_id
  ON public.turno_setor_operacoes(turno_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_turno_op_id
  ON public.turno_setor_operacoes(turno_op_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_turno_setor_op_id
  ON public.turno_setor_operacoes(turno_setor_op_id);

CREATE INDEX IF NOT EXISTS idx_turno_setor_operacoes_operacao_id
  ON public.turno_setor_operacoes(operacao_id);

COMMENT ON TABLE public.turno_setor_operacoes IS
  'Operações do roteiro derivadas dentro de cada seção turno + setor + OP.';

CREATE OR REPLACE FUNCTION public.sincronizar_turno_setor_operacoes(p_turno_setor_op_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_turno_id UUID;
  v_turno_op_id UUID;
  v_setor_id UUID;
  v_produto_id UUID;
  v_quantidade_planejada INTEGER;
  v_tem_realizado BOOLEAN;
  v_total_operacoes INTEGER;
BEGIN
  SELECT
    secao.turno_id,
    secao.turno_op_id,
    secao.setor_id,
    secao.quantidade_planejada,
    turno_op.produto_id
  INTO
    v_turno_id,
    v_turno_op_id,
    v_setor_id,
    v_quantidade_planejada,
    v_produto_id
  FROM public.turno_setor_ops AS secao
  JOIN public.turno_ops AS turno_op
    ON turno_op.id = secao.turno_op_id
  WHERE secao.id = p_turno_setor_op_id;

  IF v_turno_id IS NULL OR v_turno_op_id IS NULL OR v_setor_id IS NULL OR v_produto_id IS NULL THEN
    RAISE EXCEPTION 'Seção % não encontrada para sincronização das operações.', p_turno_setor_op_id
      USING ERRCODE = 'P0002';
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
  WHERE produto_operacao.produto_id = v_produto_id
    AND operacao.setor_id = v_setor_id
  ORDER BY produto_operacao.sequencia;

  GET DIAGNOSTICS v_total_operacoes = ROW_COUNT;

  IF v_total_operacoes = 0 THEN
    RAISE EXCEPTION 'Seção % não possui operações válidas derivadas do roteiro.', p_turno_setor_op_id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v_total_operacoes;
END;
$$;

CREATE OR REPLACE FUNCTION public.turno_setor_ops_sincronizar_operacoes_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM public.sincronizar_turno_setor_operacoes(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turno_setor_ops_sincronizar_operacoes ON public.turno_setor_ops;

CREATE TRIGGER trg_turno_setor_ops_sincronizar_operacoes
AFTER INSERT OR UPDATE OF turno_op_id, setor_id, quantidade_planejada
ON public.turno_setor_ops
FOR EACH ROW
EXECUTE FUNCTION public.turno_setor_ops_sincronizar_operacoes_trigger();

DO $$
DECLARE
  v_secao RECORD;
BEGIN
  FOR v_secao IN
    SELECT id
    FROM public.turno_setor_ops
    ORDER BY created_at ASC, id ASC
  LOOP
    PERFORM public.sincronizar_turno_setor_operacoes(v_secao.id);
  END LOOP;
END $$;

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS turno_op_id UUID
    REFERENCES public.turno_ops(id);

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS turno_setor_operacao_id UUID
    REFERENCES public.turno_setor_operacoes(id);

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS usuario_sistema_id UUID
    REFERENCES public.usuarios_sistema(id);

ALTER TABLE public.registros_producao
  ADD COLUMN IF NOT EXISTS origem_apontamento VARCHAR(30);

UPDATE public.registros_producao
SET turno_op_id = secao.turno_op_id
FROM public.turno_setor_ops AS secao
WHERE public.registros_producao.turno_setor_op_id = secao.id
  AND public.registros_producao.turno_op_id IS NULL;

UPDATE public.registros_producao
SET origem_apontamento = 'operador_qr'
WHERE origem_apontamento IS NULL;

ALTER TABLE public.registros_producao
  ALTER COLUMN origem_apontamento SET DEFAULT 'operador_qr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'registros_producao_origem_apontamento_check'
      AND conrelid = 'public.registros_producao'::regclass
  ) THEN
    ALTER TABLE public.registros_producao
      ADD CONSTRAINT registros_producao_origem_apontamento_check
      CHECK (origem_apontamento IN ('operador_qr', 'supervisor_manual'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_registros_producao_turno_op_id
  ON public.registros_producao(turno_op_id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_turno_setor_operacao_id
  ON public.registros_producao(turno_setor_operacao_id);

CREATE INDEX IF NOT EXISTS idx_registros_producao_usuario_sistema_id
  ON public.registros_producao(usuario_sistema_id);

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

ALTER TABLE public.turno_setor_operacoes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "leitura_turno_setor_operacoes_autenticados" ON public.turno_setor_operacoes
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT EXECUTE ON FUNCTION public.sincronizar_turno_setor_operacoes(UUID)
  TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.sincronizar_andamento_turno_setor_op(UUID)
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
