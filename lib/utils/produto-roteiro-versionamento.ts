export interface RoteiroVersionadoItem {
  operacaoId: string
  sequencia: number
  versaoRoteiro: number | null
  vigente: boolean | null
}

export interface RoteiroVigenteItem {
  operacaoId: string
  sequencia: number
}

export function normalizarRoteiroVigente(items: RoteiroVersionadoItem[]): RoteiroVigenteItem[] {
  return items
    .filter((item) => item.vigente === true)
    .slice()
    .sort((primeiro, segundo) => primeiro.sequencia - segundo.sequencia)
    .map((item, index) => ({
      operacaoId: item.operacaoId,
      sequencia: index + 1,
    }))
}

export function roteiroVigenteFoiAlterado(
  atual: RoteiroVersionadoItem[],
  proximo: RoteiroVigenteItem[]
): boolean {
  const roteiroAtual = normalizarRoteiroVigente(atual)

  if (roteiroAtual.length !== proximo.length) {
    return true
  }

  return roteiroAtual.some((item, index) => {
    const proximoItem = proximo[index]

    if (!proximoItem) {
      return true
    }

    return item.operacaoId !== proximoItem.operacaoId || item.sequencia !== proximoItem.sequencia
  })
}

export function obterProximaVersaoRoteiro(items: RoteiroVersionadoItem[]): number {
  if (items.length === 0) {
    return 1
  }

  const maiorVersao = items.reduce(
    (maior, item) => Math.max(maior, item.versaoRoteiro ?? 1),
    0
  )

  return maiorVersao + 1
}
