-- ============================================================
-- SPRINT 26.1 — Operações com máquina específica e código manual
-- Preparação de schema para substituir tipo_maquina por maquina_id
-- e remover a geração automática de codigo.
-- ============================================================

BEGIN;

ALTER TABLE public.operacoes
  ADD COLUMN IF NOT EXISTS maquina_id UUID REFERENCES public.maquinas(id);

CREATE INDEX IF NOT EXISTS idx_operacoes_maquina_id
  ON public.operacoes(maquina_id);

ALTER TABLE public.operacoes
  ALTER COLUMN codigo DROP DEFAULT;

COMMENT ON COLUMN public.operacoes.maquina_id IS
  'Vínculo técnico obrigatório da operação com uma máquina patrimonial específica cadastrada.';

COMMENT ON COLUMN public.operacoes.codigo IS
  'Código manual livre, obrigatório e único. Não deve mais ser gerado automaticamente pelo banco.';

COMMIT;

-- ============================================================
-- BACKFILL OBRIGATÓRIO ANTES DA FINALIZAÇÃO DO CONTRATO
-- ============================================================
-- 1. Mapear cada operação existente para uma máquina específica já
--    cadastrada em public.maquinas, preservando o vínculo técnico por id.
--
--    Exemplo:
--
--    UPDATE public.operacoes AS operacao
--    SET maquina_id = maquina.id
--    FROM public.maquinas AS maquina
--    WHERE operacao.codigo IN ('OP-0001', 'OP-0002')
--      AND maquina.codigo IN ('MAQ-001', 'MAQ-014');
--
-- 2. Validar se ainda existem operações sem máquina associada:
--
--    SELECT id, codigo, descricao
--    FROM public.operacoes
--    WHERE maquina_id IS NULL
--    ORDER BY codigo;
--
-- 3. Somente após zerar o resultado acima, execute a finalização:
--
--    ALTER TABLE public.operacoes
--      ALTER COLUMN maquina_id SET NOT NULL;
--
--    ALTER TABLE public.operacoes
--      DROP CONSTRAINT IF EXISTS operacoes_tipo_maquina_codigo_fkey;
--
--    ALTER TABLE public.operacoes
--      DROP COLUMN IF EXISTS tipo_maquina_codigo;
--
--    DROP FUNCTION IF EXISTS public.proximo_codigo_operacao();
--
--    DROP SEQUENCE IF EXISTS public.operacoes_codigo_seq;
