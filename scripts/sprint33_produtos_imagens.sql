BEGIN;

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS imagem_frente_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_costa_url TEXT;

UPDATE public.produtos
SET imagem_frente_url = imagem_url
WHERE imagem_frente_url IS NULL
  AND imagem_url IS NOT NULL
  AND NULLIF(BTRIM(imagem_url), '') IS NOT NULL;

COMMIT;
