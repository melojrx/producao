-- ============================================================
-- SPRINT 50 — Correção pontual OP 207675
-- Ajusta a linhagem operacional mais recente de 1306 para 1305
-- após homologação identificar 1 peça aberta artificialmente.
-- Executar via Supabase Management API.
-- ============================================================

BEGIN;

ALTER TABLE public.turno_ops
  DISABLE TRIGGER trg_turno_ops_sincronizar_setores;

ALTER TABLE public.turno_setor_ops
  DISABLE TRIGGER trg_turno_setor_ops_sincronizar_operacoes;

WITH atual AS (
  SELECT op.*
  FROM public.turno_ops AS op
  JOIN public.turnos AS turno
    ON turno.id = op.turno_id
  WHERE op.numero_op = '207675'
  ORDER BY turno.iniciado_em DESC NULLS LAST, op.created_at DESC NULLS LAST
  LIMIT 1
),
linhagem AS (
  SELECT op.id
  FROM public.turno_ops AS op
  JOIN atual
    ON op.id = atual.id
    OR op.id = atual.turno_op_origem_id
)
UPDATE public.turno_ops AS op
SET
  quantidade_planejada = 1305,
  quantidade_planejada_original = CASE
    WHEN op.quantidade_planejada_original = 1306 THEN 1305
    ELSE op.quantidade_planejada_original
  END,
  quantidade_planejada_remanescente = LEAST(op.quantidade_planejada_remanescente, 1305)
WHERE op.id IN (SELECT id FROM linhagem)
  AND op.numero_op = '207675'
  AND op.quantidade_planejada = 1306;

WITH atual AS (
  SELECT op.*
  FROM public.turno_ops AS op
  JOIN public.turnos AS turno
    ON turno.id = op.turno_id
  WHERE op.numero_op = '207675'
  ORDER BY turno.iniciado_em DESC NULLS LAST, op.created_at DESC NULLS LAST
  LIMIT 1
),
linhagem AS (
  SELECT op.id
  FROM public.turno_ops AS op
  JOIN atual
    ON op.id = atual.id
    OR op.id = atual.turno_op_origem_id
)
UPDATE public.turno_setor_demandas AS demanda
SET
  quantidade_planejada = 1305,
  status = CASE
    WHEN demanda.quantidade_realizada >= 1305 THEN 'concluida'
    ELSE demanda.status
  END,
  encerrado_em = CASE
    WHEN demanda.quantidade_realizada >= 1305 THEN COALESCE(demanda.encerrado_em, NOW())
    ELSE demanda.encerrado_em
  END
WHERE demanda.turno_op_id IN (SELECT id FROM linhagem)
  AND demanda.quantidade_planejada = 1306;

WITH atual AS (
  SELECT op.*
  FROM public.turno_ops AS op
  JOIN public.turnos AS turno
    ON turno.id = op.turno_id
  WHERE op.numero_op = '207675'
  ORDER BY turno.iniciado_em DESC NULLS LAST, op.created_at DESC NULLS LAST
  LIMIT 1
),
linhagem AS (
  SELECT op.id
  FROM public.turno_ops AS op
  JOIN atual
    ON op.id = atual.id
    OR op.id = atual.turno_op_origem_id
)
UPDATE public.turno_setor_ops AS secao
SET
  quantidade_planejada = 1305,
  status = CASE
    WHEN secao.quantidade_realizada >= 1305 THEN 'concluida'
    ELSE secao.status
  END,
  encerrado_em = CASE
    WHEN secao.quantidade_realizada >= 1305 THEN COALESCE(secao.encerrado_em, NOW())
    ELSE secao.encerrado_em
  END
WHERE secao.turno_op_id IN (SELECT id FROM linhagem)
  AND secao.quantidade_planejada = 1306;

WITH atual AS (
  SELECT op.*
  FROM public.turno_ops AS op
  JOIN public.turnos AS turno
    ON turno.id = op.turno_id
  WHERE op.numero_op = '207675'
  ORDER BY turno.iniciado_em DESC NULLS LAST, op.created_at DESC NULLS LAST
  LIMIT 1
),
linhagem AS (
  SELECT op.id
  FROM public.turno_ops AS op
  JOIN atual
    ON op.id = atual.id
    OR op.id = atual.turno_op_origem_id
)
UPDATE public.turno_setor_operacoes AS operacao
SET
  quantidade_planejada = 1305,
  status = CASE
    WHEN operacao.quantidade_realizada >= 1305 THEN 'concluida'
    ELSE operacao.status
  END,
  encerrado_em = CASE
    WHEN operacao.quantidade_realizada >= 1305 THEN COALESCE(operacao.encerrado_em, NOW())
    ELSE operacao.encerrado_em
  END
WHERE operacao.turno_op_id IN (SELECT id FROM linhagem)
  AND operacao.quantidade_planejada = 1306;

ALTER TABLE public.turno_setor_ops
  ENABLE TRIGGER trg_turno_setor_ops_sincronizar_operacoes;

ALTER TABLE public.turno_ops
  ENABLE TRIGGER trg_turno_ops_sincronizar_setores;

COMMIT;
