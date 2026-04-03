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
  operadoresSugeridos: number
  operadoresNecessarios: number
  coberturaPct: number
  deficitOperadores: number
  eficienciaRequeridaPct: number | null
  contribuicoes: DimensionamentoSetorContribuicaoItem[]
}

export interface DimensionamentoPessoasSetorResumo {
  operadoresDisponiveis: number
  minutosTurno: number
  totalOperadoresSugeridos: number
  totalOperadoresNecessarios: number
  coberturaGeralPct: number
  deficitOperadores: number
  eficienciaRequeridaPct: number | null
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

interface SetorDistribuicaoBase {
  setorId: string
  setorCodigo: number | null
  setorNome: string
  cargaMinutos: number
  operadoresNecessarios: number
  contribuicoes: DimensionamentoSetorContribuicaoItem[]
}

interface FracaoDistribuicaoSetor {
  setorId: string
  fracao: number
  cargaMinutos: number
  setorCodigo: number | null
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

function distribuirOperadoresPorCarga(
  setoresBase: SetorDistribuicaoBase[],
  operadoresDisponiveis: number
): Map<string, number> {
  const distribuicao = new Map<string, number>()

  for (const setor of setoresBase) {
    distribuicao.set(setor.setorId, 0)
  }

  if (operadoresDisponiveis <= 0 || setoresBase.length === 0) {
    return distribuicao
  }

  const cargaTotal = setoresBase.reduce((soma, setor) => soma + setor.cargaMinutos, 0)
  const totalOperadoresNecessarios = setoresBase.reduce(
    (soma, setor) => soma + setor.operadoresNecessarios,
    0
  )
  const operadoresParaDistribuir = Math.min(operadoresDisponiveis, totalOperadoresNecessarios)

  if (cargaTotal <= 0 || operadoresParaDistribuir <= 0) {
    return distribuicao
  }

  const fracoes: FracaoDistribuicaoSetor[] = []
  let operadoresJaDistribuidos = 0

  for (const setor of setoresBase) {
    const quotaBruta = (setor.cargaMinutos / cargaTotal) * operadoresParaDistribuir
    const quotaInteira = Math.min(Math.floor(quotaBruta), setor.operadoresNecessarios)
    distribuicao.set(setor.setorId, quotaInteira)
    operadoresJaDistribuidos += quotaInteira
    fracoes.push({
      setorId: setor.setorId,
      fracao: quotaBruta - quotaInteira,
      cargaMinutos: setor.cargaMinutos,
      setorCodigo: setor.setorCodigo,
      setorNome: setor.setorNome,
    })
  }

  let operadoresRestantes = operadoresParaDistribuir - operadoresJaDistribuidos

  fracoes.sort((primeiroSetor, segundoSetor) => {
    if (segundoSetor.fracao !== primeiroSetor.fracao) {
      return segundoSetor.fracao - primeiroSetor.fracao
    }

    if (segundoSetor.cargaMinutos !== primeiroSetor.cargaMinutos) {
      return segundoSetor.cargaMinutos - primeiroSetor.cargaMinutos
    }

    return compararSetoresPorOrdemLocal(primeiroSetor, segundoSetor)
  })

  let indiceFracao = 0

  while (operadoresRestantes > 0 && fracoes.length > 0) {
    const setorAtual = fracoes[indiceFracao % fracoes.length]
    const setorBase = setoresBase.find((setor) => setor.setorId === setorAtual.setorId)

    if (!setorBase) {
      indiceFracao += 1
      continue
    }

    const quantidadeAtual = distribuicao.get(setorAtual.setorId) ?? 0

    if (quantidadeAtual >= setorBase.operadoresNecessarios) {
      indiceFracao += 1
      continue
    }

    distribuicao.set(setorAtual.setorId, quantidadeAtual + 1)
    operadoresRestantes -= 1
    indiceFracao += 1
  }

  return distribuicao
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

  const setoresBase = [...acumuladores.values()]
    .map<SetorDistribuicaoBase>((acumulador) => ({
      setorId: acumulador.setorId,
      setorCodigo: acumulador.setorCodigo,
      setorNome: acumulador.setorNome,
      cargaMinutos: acumulador.cargaMinutos,
      operadoresNecessarios:
        minutosTurno > 0 ? Math.ceil(acumulador.cargaMinutos / minutosTurno) : 0,
      contribuicoes: ordenarContribuicoes(acumulador.contribuicoes),
    }))
    .sort((primeiroSetor, segundoSetor) =>
      compararSetoresPorOrdemLocal(primeiroSetor, segundoSetor)
    )

  const operadoresDistribuidosPorSetor = distribuirOperadoresPorCarga(
    setoresBase,
    operadoresDisponiveis
  )

  const setores = setoresBase.map<DimensionamentoPessoasSetorItem>((setorBase) => {
    const operadoresSugeridos = operadoresDistribuidosPorSetor.get(setorBase.setorId) ?? 0
    const capacidadeMinutos = operadoresSugeridos * minutosTurno
    const coberturaPct =
      setorBase.cargaMinutos > 0
        ? Math.min((capacidadeMinutos / setorBase.cargaMinutos) * 100, 100)
        : 0
    const eficienciaRequeridaPct =
      operadoresSugeridos > 0 && minutosTurno > 0
        ? arredondarNumero((setorBase.cargaMinutos / capacidadeMinutos) * 100)
        : null

    return {
      setorId: setorBase.setorId,
      setorCodigo: setorBase.setorCodigo,
      setorNome: setorBase.setorNome,
      cargaMinutos: setorBase.cargaMinutos,
      operadoresSugeridos,
      operadoresNecessarios: setorBase.operadoresNecessarios,
      coberturaPct: arredondarNumero(coberturaPct),
      deficitOperadores: Math.max(setorBase.operadoresNecessarios - operadoresSugeridos, 0),
      eficienciaRequeridaPct,
      contribuicoes: setorBase.contribuicoes,
    }
  })

  const totalOperadoresSugeridos = setores.reduce(
    (soma, setor) => soma + setor.operadoresSugeridos,
    0
  )
  const totalOperadoresNecessarios = setores.reduce(
    (soma, setor) => soma + setor.operadoresNecessarios,
    0
  )
  const cargaTotalMinutos = setores.reduce((soma, setor) => soma + setor.cargaMinutos, 0)
  const coberturaGeralPct =
    cargaTotalMinutos > 0
      ? arredondarNumero(
          Math.min((totalOperadoresSugeridos * minutosTurno * 100) / cargaTotalMinutos, 100)
        )
      : 0
  const eficienciaRequeridaPct =
    totalOperadoresSugeridos > 0 && minutosTurno > 0
      ? arredondarNumero((cargaTotalMinutos / (totalOperadoresSugeridos * minutosTurno)) * 100)
      : null

  return {
    operadoresDisponiveis,
    minutosTurno,
    totalOperadoresSugeridos,
    totalOperadoresNecessarios,
    coberturaGeralPct,
    deficitOperadores: Math.max(totalOperadoresNecessarios - totalOperadoresSugeridos, 0),
    eficienciaRequeridaPct,
    setores,
  }
}
