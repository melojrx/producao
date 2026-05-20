-- HU 51.12 — Remoção cirúrgica do fluxo paralelo de qualidade por lotes
-- Preserva: qualidade_registros, qualidade_detalhes, qualidade_defeitos, RPC operacional
-- Remove: qualidade_lotes, RPC registrar_revisao_lote_qualidade, coluna qualidade_lote_id

-- 1. Remover índice da coluna qualidade_lote_id em qualidade_registros
DROP INDEX IF EXISTS public.idx_qualidade_registros_lote_id;

-- 2. Remover constraint de FK se existir
ALTER TABLE public.qualidade_registros
  DROP CONSTRAINT IF EXISTS qualidade_registros_qualidade_lote_id_fkey;

-- 3. Remover coluna qualidade_lote_id de qualidade_registros
ALTER TABLE public.qualidade_registros
  DROP COLUMN IF EXISTS qualidade_lote_id;

-- 4. Dropar RPC registrar_revisao_lote_qualidade
DROP FUNCTION IF EXISTS public.registrar_revisao_lote_qualidade(
  UUID, UUID, UUID, INTEGER, INTEGER, TEXT, JSONB
);
DROP FUNCTION IF EXISTS public.registrar_revisao_lote_qualidade;

-- 5. Dropar índices de qualidade_lotes
DROP INDEX IF EXISTS public.idx_qualidade_lotes_turno_status;
DROP INDEX IF EXISTS public.idx_qualidade_lotes_turno_op;
DROP INDEX IF EXISTS public.idx_qualidade_lotes_operacao_origem;

-- 6. Dropar tabela qualidade_lotes
DROP TABLE IF EXISTS public.qualidade_lotes;

-- 7. Remover trigger function órfã (se existir)
DROP FUNCTION IF EXISTS public.fn_criar_lote_qualidade_apos_apontamento();
