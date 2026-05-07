BEGIN;

-- Passo 1: copiar quantidade_realizada -> quantidade_liberada_setor nas demandas
-- de carry-over que ainda não foram corrigidas (quantidade_liberada_setor = 0
-- e quantidade_realizada > 0 e sem apontamentos reais no turno)
UPDATE public.turno_setor_demandas tsd
SET quantidade_liberada_setor = tsd.quantidade_realizada
FROM public.turno_ops top
WHERE top.id = tsd.turno_op_id
  AND top.turno_op_origem_id IS NOT NULL
  AND tsd.quantidade_liberada_setor = 0
  AND tsd.quantidade_realizada > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.registros_producao rp
    JOIN public.turno_setor_operacoes tso ON tso.id = rp.turno_setor_operacao_id
    WHERE tso.turno_op_id = tsd.turno_op_id
      AND tso.setor_id = tsd.setor_id
  );

-- Passo 2: zerar quantidade_realizada nas operações de carry-over
-- sem apontamentos reais
UPDATE public.turno_setor_operacoes tso
SET quantidade_realizada = 0,
    status = 'aberta'
FROM public.turno_ops top
WHERE top.id = tso.turno_op_id
  AND top.turno_op_origem_id IS NOT NULL
  AND tso.quantidade_realizada > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.registros_producao rp
    WHERE rp.turno_setor_operacao_id = tso.id
  );

-- Passo 3: zerar quantidade_realizada nas demandas de carry-over
-- sem apontamentos reais
UPDATE public.turno_setor_demandas tsd
SET quantidade_realizada = 0,
    status = 'aberta'
FROM public.turno_ops top
WHERE top.id = tsd.turno_op_id
  AND top.turno_op_origem_id IS NOT NULL
  AND tsd.quantidade_realizada > 0
  AND NOT EXISTS (
    SELECT 1
    FROM public.registros_producao rp
    JOIN public.turno_setor_operacoes tso ON tso.id = rp.turno_setor_operacao_id
    WHERE tso.turno_op_id = tsd.turno_op_id
      AND tso.setor_id = tsd.setor_id
  );

COMMIT;
