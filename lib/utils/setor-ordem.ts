export interface SetorOrdenavel {
  setorCodigo?: number | null
  setorId: string
  setorNome?: string | null
}

export function compararSetoresPorOrdem(
  primeiroSetor: SetorOrdenavel,
  segundoSetor: SetorOrdenavel
): number {
  const primeiroCodigo = primeiroSetor.setorCodigo ?? Number.MAX_SAFE_INTEGER
  const segundoCodigo = segundoSetor.setorCodigo ?? Number.MAX_SAFE_INTEGER

  if (primeiroCodigo !== segundoCodigo) {
    return primeiroCodigo - segundoCodigo
  }

  const comparacaoId = primeiroSetor.setorId.localeCompare(segundoSetor.setorId)
  if (comparacaoId !== 0) {
    return comparacaoId
  }

  return (primeiroSetor.setorNome ?? '').localeCompare(segundoSetor.setorNome ?? '')
}
