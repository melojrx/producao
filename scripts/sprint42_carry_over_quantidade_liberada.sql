BEGIN;

ALTER TABLE public.turno_setor_demandas
  ADD COLUMN IF NOT EXISTS quantidade_liberada_setor INTEGER NOT NULL DEFAULT 0;

COMMIT;
