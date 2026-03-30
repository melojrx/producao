-- ============================================================
-- SPRINT 6.4 — Máquinas e operadores na V2
-- Executar no Supabase SQL Editor após a Sprint 6.1
-- ============================================================

BEGIN;

ALTER TABLE public.maquinas
  ADD COLUMN IF NOT EXISTS setor_id UUID REFERENCES public.setores(id);

CREATE INDEX IF NOT EXISTS idx_maquinas_setor_id
  ON public.maquinas(setor_id);

UPDATE public.maquinas AS maquina
SET setor_id = setor.id
FROM public.setores AS setor
WHERE maquina.setor_id IS NULL
  AND maquina.setor IS NOT NULL
  AND lower(trim(maquina.setor)) = lower(trim(setor.nome));

COMMENT ON COLUMN public.maquinas.setor_id IS
  'Setor estrutural da máquina na arquitetura V2.';

ALTER TABLE public.operadores
  ADD COLUMN IF NOT EXISTS carga_horaria_min INTEGER;

UPDATE public.operadores
SET carga_horaria_min = 540
WHERE carga_horaria_min IS NULL;

ALTER TABLE public.operadores
  ALTER COLUMN carga_horaria_min SET DEFAULT 540;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'operadores_carga_horaria_min_check'
  ) THEN
    ALTER TABLE public.operadores
      ADD CONSTRAINT operadores_carga_horaria_min_check
      CHECK (carga_horaria_min > 0);
  END IF;
END $$;

ALTER TABLE public.operadores
  ALTER COLUMN carga_horaria_min SET NOT NULL;

COMMENT ON COLUMN public.operadores.carga_horaria_min IS
  'Carga horária diária padrão do operador em minutos. A alocação de setor é dinâmica por turno na V2.';

COMMIT;

-- ============================================================
-- VALIDAÇÕES RECOMENDADAS APÓS A EXECUÇÃO
-- ============================================================
-- Máquinas ainda sem setor vinculado:
--
-- SELECT id, codigo, setor
-- FROM public.maquinas
-- WHERE setor_id IS NULL
-- ORDER BY codigo;
--
-- Operadores sem carga horária:
--
-- SELECT id, nome, matricula
-- FROM public.operadores
-- WHERE carga_horaria_min IS NULL
-- ORDER BY nome;
