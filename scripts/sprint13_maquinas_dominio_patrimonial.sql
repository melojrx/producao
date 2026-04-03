-- ============================================================
-- SPRINT 13 — Simplificação do domínio de máquinas
-- Remover atributos operacionais herdados do modelo antigo
-- ============================================================

BEGIN;

DROP VIEW IF EXISTS public.vw_status_maquinas;

DROP INDEX IF EXISTS public.idx_maquinas_setor_id;

ALTER TABLE public.maquinas
  DROP CONSTRAINT IF EXISTS maquinas_setor_id_fkey;

ALTER TABLE public.maquinas
  DROP CONSTRAINT IF EXISTS maquinas_tipo_maquina_codigo_fkey;

ALTER TABLE public.maquinas
  DROP COLUMN IF EXISTS tipo_maquina_codigo,
  DROP COLUMN IF EXISTS setor_id,
  DROP COLUMN IF EXISTS setor;

COMMENT ON TABLE public.maquinas IS
  'Cadastro patrimonial de máquinas. Não participa da derivação operacional da V2.';

CREATE OR REPLACE VIEW public.vw_status_maquinas AS
SELECT
  m.id,
  m.codigo,
  COALESCE(
    NULLIF(concat_ws(' · ', NULLIF(trim(m.marca), ''), NULLIF(trim(m.modelo), '')), ''),
    CASE
      WHEN NULLIF(trim(m.numero_patrimonio), '') IS NOT NULL
        THEN 'Patrimônio ' || trim(m.numero_patrimonio)
      ELSE NULL
    END,
    'Máquina patrimonial'
  ) AS descricao,
  m.status,
  MAX(rp.hora_registro) AS ultimo_uso,
  COALESCE(EXTRACT(EPOCH FROM (NOW() - MAX(rp.hora_registro))) / 60, 0) AS minutos_sem_uso
FROM public.maquinas AS m
LEFT JOIN public.registros_producao AS rp
  ON rp.maquina_id = m.id
 AND rp.data_producao = CURRENT_DATE
GROUP BY m.id, m.codigo, m.marca, m.modelo, m.numero_patrimonio, m.status;

COMMIT;

-- ============================================================
-- VALIDAÇÕES RECOMENDADAS APÓS A EXECUÇÃO
-- ============================================================
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'maquinas'
-- ORDER BY ordinal_position;
--
-- SELECT *
-- FROM public.vw_status_maquinas
-- ORDER BY codigo
-- LIMIT 20;
