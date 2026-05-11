ALTER TABLE public.turno_setor_demandas
  ADD COLUMN IF NOT EXISTS quantidade_herdada_setor INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.turno_setor_demandas.quantidade_herdada_setor IS
  'Progresso acumulado herdado de turnos anteriores no setor. Nao representa producao do turno atual.';
