export const LARGURA_BASE_PAINEL_TV = 1280
export const ALTURA_BASE_PAINEL_TV = 720

export interface CalcularEscalaPainelTvParams {
  readonly larguraViewport: number
  readonly alturaViewport: number
}

export function calcularEscalaPainelTv({
  larguraViewport,
  alturaViewport,
}: CalcularEscalaPainelTvParams): number {
  if (larguraViewport <= 0 || alturaViewport <= 0) return 1

  const escalaLargura = larguraViewport / LARGURA_BASE_PAINEL_TV
  const escalaAltura = alturaViewport / ALTURA_BASE_PAINEL_TV

  return Math.min(escalaLargura, escalaAltura)
}
