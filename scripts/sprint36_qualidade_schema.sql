ALTER TABLE public.setores
ADD COLUMN IF NOT EXISTS modo_apontamento VARCHAR(30) NOT NULL DEFAULT 'producao_padrao';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'setores_modo_apontamento_check'
      AND conrelid = 'public.setores'::regclass
  ) THEN
    ALTER TABLE public.setores
      ADD CONSTRAINT setores_modo_apontamento_check
      CHECK (modo_apontamento IN ('producao_padrao', 'revisao_qualidade'));
  END IF;
END $$;

COMMENT ON COLUMN public.setores.modo_apontamento IS
  'Define o contrato de input operacional do setor no turno.';

UPDATE public.setores
SET modo_apontamento = 'revisao_qualidade'
WHERE lower(trim(nome)) = 'qualidade';

ALTER TABLE public.usuarios_sistema
ADD COLUMN IF NOT EXISTS pode_revisar_qualidade BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.usuarios_sistema.pode_revisar_qualidade IS
  'Permite ao usuario atuar como revisor no setor Qualidade.';

CREATE TABLE IF NOT EXISTS public.qualidade_registros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,
  turno_op_id UUID NOT NULL REFERENCES public.turno_ops(id) ON DELETE CASCADE,
  turno_setor_op_id UUID NOT NULL REFERENCES public.turno_setor_ops(id) ON DELETE CASCADE,
  turno_setor_operacao_id_qualidade UUID NOT NULL
    REFERENCES public.turno_setor_operacoes(id) ON DELETE CASCADE,
  revisor_usuario_id UUID NOT NULL REFERENCES public.usuarios_sistema(id),
  quantidade_aprovada INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_aprovada >= 0),
  quantidade_reprovada INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_reprovada >= 0),
  quantidade_revisada INTEGER NOT NULL
    CHECK (
      quantidade_revisada > 0
      AND quantidade_revisada = quantidade_aprovada + quantidade_reprovada
    ),
  origem_lancamento VARCHAR(30) NOT NULL
    CHECK (origem_lancamento IN ('scanner_qualidade', 'manual_qualidade')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qualidade_registros_turno_id
  ON public.qualidade_registros(turno_id);

CREATE INDEX IF NOT EXISTS idx_qualidade_registros_turno_op_id
  ON public.qualidade_registros(turno_op_id);

CREATE INDEX IF NOT EXISTS idx_qualidade_registros_turno_setor_op_id
  ON public.qualidade_registros(turno_setor_op_id);

CREATE INDEX IF NOT EXISTS idx_qualidade_registros_revisor_usuario_id
  ON public.qualidade_registros(revisor_usuario_id);

CREATE INDEX IF NOT EXISTS idx_qualidade_registros_created_at
  ON public.qualidade_registros(created_at DESC);

CREATE TABLE IF NOT EXISTS public.qualidade_detalhes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  qualidade_registro_id UUID NOT NULL
    REFERENCES public.qualidade_registros(id) ON DELETE CASCADE,
  turno_setor_operacao_id_origem UUID NOT NULL
    REFERENCES public.turno_setor_operacoes(id),
  operacao_id_origem UUID NOT NULL REFERENCES public.operacoes(id),
  setor_id_origem UUID NOT NULL REFERENCES public.setores(id),
  quantidade_defeito INTEGER NOT NULL CHECK (quantidade_defeito > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(qualidade_registro_id, turno_setor_operacao_id_origem)
);

CREATE INDEX IF NOT EXISTS idx_qualidade_detalhes_qualidade_registro_id
  ON public.qualidade_detalhes(qualidade_registro_id);

CREATE INDEX IF NOT EXISTS idx_qualidade_detalhes_turno_setor_operacao_origem
  ON public.qualidade_detalhes(turno_setor_operacao_id_origem);

CREATE INDEX IF NOT EXISTS idx_qualidade_detalhes_operacao_origem
  ON public.qualidade_detalhes(operacao_id_origem);

CREATE INDEX IF NOT EXISTS idx_qualidade_detalhes_setor_origem
  ON public.qualidade_detalhes(setor_id_origem);

COMMENT ON TABLE public.qualidade_registros IS
  'Cabecalho de revisoes registradas no setor Qualidade para uma OP do turno.';

COMMENT ON TABLE public.qualidade_detalhes IS
  'Detalhamento dos defeitos encontrados na revisao, atribuidos as operacoes produtivas de origem.';
