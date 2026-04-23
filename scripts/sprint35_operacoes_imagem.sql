ALTER TABLE public.operacoes
ADD COLUMN IF NOT EXISTS imagem_url TEXT;

COMMENT ON COLUMN public.operacoes.imagem_url IS
  'Imagem unica opcional de referencia visual da operacao no CRUD administrativo.';
