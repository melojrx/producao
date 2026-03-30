-- ============================================================
-- SPRINT 6.3 — Operações dependem de setor
-- Executar no Supabase SQL Editor após a Sprint 6.1
-- ============================================================

BEGIN;

CREATE SEQUENCE IF NOT EXISTS public.operacoes_codigo_seq;

SELECT setval(
  'public.operacoes_codigo_seq',
  GREATEST(
    COALESCE(
      (
        SELECT MAX(((regexp_match(codigo, '([0-9]+)$'))[1])::bigint)
        FROM public.operacoes
        WHERE codigo ~ '([0-9]+)$'
      ) + 1,
      1
    ),
    1
  ),
  false
);

CREATE OR REPLACE FUNCTION public.proximo_codigo_operacao()
RETURNS varchar
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'OP-' || LPAD(nextval('public.operacoes_codigo_seq')::text, 4, '0');
END;
$$;

ALTER TABLE public.operacoes
  ALTER COLUMN codigo SET DEFAULT public.proximo_codigo_operacao();

ALTER TABLE public.operacoes
  ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES public.setores(id);

CREATE INDEX IF NOT EXISTS idx_operacoes_setor_id
  ON public.operacoes(setor_id);

COMMENT ON COLUMN public.operacoes.setor_id IS
  'Setor produtivo obrigatório da operação na arquitetura V2.';

COMMIT;

-- ============================================================
-- BACKFILL OBRIGATÓRIO ANTES DE MARCAR setor_id COMO NOT NULL
-- ============================================================
-- 1. Revise todas as operações existentes e associe cada uma ao setor correto:
--
--    UPDATE public.operacoes
--    SET setor_id = (
--      SELECT id
--      FROM public.setores
--      WHERE nome = 'Montagem'
--    )
--    WHERE codigo IN ('OP-0001', 'OP-0002');
--
-- 2. Valide se ainda existem operações sem setor:
--
--    SELECT id, codigo, descricao
--    FROM public.operacoes
--    WHERE setor_id IS NULL
--    ORDER BY codigo;
--
-- 3. Somente após zerar o resultado acima, execute:
--
--    ALTER TABLE public.operacoes
--      ALTER COLUMN setor_id SET NOT NULL;
