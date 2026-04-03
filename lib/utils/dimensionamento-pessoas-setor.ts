const ORDEM_DECIMAL_PT_BR = 1000

export interface DimensionamentoSetorOperacaoInput {
  operacaoId: string
  setorId: string | null
  setorCodigo?: number | null
  setorNome: string | null
  tempoPadraoMin: number
}

export interface DimensionamentoSetorOpInput {
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string | null
  quantidadePlanejada: number
  roteiro: DimensionamentoSetorOperacaoInput[]
}

export interface DimensionamentoPessoasSetorInput {
  operadoresDisponiveis: number
  minutosTurno: number
  ops: DimensionamentoSetorOpInput[]
}

export interface DimensionamentoSetorContribuicaoItem {
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string | null
  quantidadePlanejada: number
  tpTotalSetorProduto: number
  cargaMinutos: number
}

export interface DimensionamentoPessoasSetorItem {
  setorId: string
  setorCodigo: number | null
  setorNome: string
  cargaMinutos: number
  pessoasNecessarias: number
  contribuicoes: DimensionamentoSetorContribuicaoItem[]
}

export interface DimensionamentoPessoasSetorResumo {
  operadoresDisponiveis: number
  minutosTurno: number
  totalPessoasSugeridas: number
  deficitOperadores: number
  setores: DimensionamentoPessoasSetorItem[]
}

interface TotaisSetorProduto {
  setorId: string
  setorCodigo: number | null
  setorNome: string
  tpTotalSetorProduto: number
}

interface AcumuladorSetor {
  setorId: string
  setorCodigo: number | null
  setorNome: string
  cargaMinutos: number
  contribuicoes: DimensionamentoSetorContribuicaoItem[]
}

interface SetorOrdenavelLocal {
  setorCodigo: number | null
  setorId: string
  setorNome: string
}

function normalizarNumeroPositivo(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0
}

function arredondarNumero(valor: number): number {
  return Math.round(valor * ORDEM_DECIMAL_PT_BR) / ORDEM_DECIMAL_PT_BR
}

function compararSetoresPorOrdemLocal(
  primeiroSetor: SetorOrdenavelLocal,
  segundoSetor: SetorOrdenavelLocal
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

  return primeiroSetor.setorNome.localeCompare(segundoSetor.setorNome)
}

function consolidarTpTotalPorSetor(
  roteiro: DimensionamentoSetorOperacaoInput[]
): TotaisSetorProduto[] {
  const totaisPorSetor = new Map<string, TotaisSetorProduto>()

  for (const operacao of roteiro) {
    const tempoPadraoMin = normalizarNumeroPositivo(operacao.tempoPadraoMin)

    if (!operacao.setorId || !operacao.setorNome || tempoPadraoMin <= 0) {
      continue
    }

    const totalAtual = totaisPorSetor.get(operacao.setorId)

    if (totalAtual) {
      totalAtual.tpTotalSetorProduto = arredondarNumero(
        totalAtual.tpTotalSetorProduto + tempoPadraoMin
      )
      continue
    }

    totaisPorSetor.set(operacao.setorId, {
      setorId: operacao.setorId,
      setorCodigo: operacao.setorCodigo ?? null,
      setorNome: operacao.setorNome,
      tpTotalSetorProduto: tempoPadraoMin,
    })
  }

  return [...totaisPorSetor.values()].sort((primeiroSetor, segundoSetor) =>
    compararSetoresPorOrdemLocal(primeiroSetor, segundoSetor)
  )
}

function ordenarContribuicoes(
  contribuicoes: DimensionamentoSetorContribuicaoItem[]
): DimensionamentoSetorContribuicaoItem[] {
  return [...contribuicoes].sort((primeiraContribuicao, segundaContribuicao) => {
    const comparacaoNumeroOp = primeiraContribuicao.numeroOp.localeCompare(
      segundaContribuicao.numeroOp
    )

    if (comparacaoNumeroOp !== 0) {
      return comparacaoNumeroOp
    }

    return primeiraContribuicao.produtoNome.localeCompare(segundaContribuicao.produtoNome)
  })
}

export function calcularDimensionamentoPessoasPorSetor(
  input: DimensionamentoPessoasSetorInput
): DimensionamentoPessoasSetorResumo {
  const operadoresDisponiveis = Math.floor(normalizarNumeroPositivo(input.operadoresDisponiveis))
  const minutosTurno = normalizarNumeroPositivo(input.minutosTurno)
  const acumuladores = new Map<string, AcumuladorSetor>()

  for (const op of input.ops) {
    const quantidadePlanejada = Math.floor(normalizarNumeroPositivo(op.quantidadePlanejada))

    if (quantidadePlanejada <= 0) {
      continue
    }

    const totaisPorSetor = consolidarTpTotalPorSetor(op.roteiro)

    for (const totalSetor of totaisPorSetor) {
      const cargaMinutos = arredondarNumero(quantidadePlanejada * totalSetor.tpTotalSetorProduto)
      const acumuladorAtual = acumuladores.get(totalSetor.setorId)
      const contribuicao: DimensionamentoSetorContribuicaoItem = {
        numeroOp: op.numeroOp,
        produtoId: op.produtoId,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadePlanejada,
        tpTotalSetorProduto: totalSetor.tpTotalSetorProduto,
        cargaMinutos,
      }

      if (acumuladorAtual) {
        acumuladorAtual.cargaMinutos = arredondarNumero(acumuladorAtual.cargaMinutos + cargaMinutos)
        acumuladorAtual.contribuicoes.push(contribuicao)
        continue
      }

      acumuladores.set(totalSetor.setorId, {
        setorId: totalSetor.setorId,
        setorCodigo: totalSetor.setorCodigo,
        setorNome: totalSetor.setorNome,
        cargaMinutos,
        contribuicoes: [contribuicao],
      })
    }
  }

  const setores = [...acumuladores.values()]
    .map<DimensionamentoPessoasSetorItem>((acumulador) => ({
      setorId: acumulador.setorId,
      setorCodigo: acumulador.setorCodigo,
      setorNome: acumulador.setorNome,
      cargaMinutos: acumulador.cargaMinutos,
      pessoasNecessarias:
        minutosTurno > 0 ? Math.ceil(acumulador.cargaMinutos / minutosTurno) : 0,
      contribuicoes: ordenarContribuicoes(acumulador.contribuicoes),
    }))
    .sort((primeiroSetor, segundoSetor) =>
      compararSetoresPorOrdemLocal(primeiroSetor, segundoSetor)
    )

  const totalPessoasSugeridas = setores.reduce(
    (soma, setor) => soma + setor.pessoasNecessarias,
    0
  )

  return {
    operadoresDisponiveis,
    minutosTurno,
    totalPessoasSugeridas,
    deficitOperadores: Math.max(totalPessoasSugeridas - operadoresDisponiveis, 0),
    setores,
  }
}
