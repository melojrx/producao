import type {
  QualidadeIndicadoresTurnoV2,
  QualidadeLoteStatus,
  QualidadeRankingDefeitoV2,
  QualidadeRankingOperadorV2,
} from '@/types'

export interface QualidadeLoteIndicadorEntrada {
  id: string
  turnoOpId: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  status: QualidadeLoteStatus
  quantidadeLote: number
  criadoEm: string
  operadorId: string | null
  operadorNome: string | null
}

export interface QualidadeRegistroIndicadorEntrada {
  id: string
  qualidadeLoteId: string | null
  turnoOpId: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  quantidadeAprovada: number
  quantidadeReprovada: number
  quantidadeRevisada: number
}

export interface QualidadeDetalheIndicadorEntrada {
  qualidadeRegistroId: string
  qualidadeDefeitoId: string | null
  defeitoNome: string
  quantidadeDefeito: number
}

export interface CalcularIndicadoresQualidadeInput {
  lotes: QualidadeLoteIndicadorEntrada[]
  registros: QualidadeRegistroIndicadorEntrada[]
  detalhes: QualidadeDetalheIndicadorEntrada[]
}

function calcularPercentual(numerador: number, denominador: number): number | null {
  if (denominador <= 0) {
    return null
  }

  return (numerador / denominador) * 100
}

function loteEstaPendente(
  lote: QualidadeLoteIndicadorEntrada
): lote is QualidadeLoteIndicadorEntrada & {
  status: Extract<QualidadeLoteStatus, 'pendente' | 'em_revisao'>
} {
  return lote.status === 'pendente' || lote.status === 'em_revisao'
}

function incrementarRankingDefeito(
  ranking: Map<string, QualidadeRankingDefeitoV2>,
  detalhe: QualidadeDetalheIndicadorEntrada
) {
  const chave = detalhe.qualidadeDefeitoId ?? detalhe.defeitoNome
  const atual = ranking.get(chave) ?? {
    qualidadeDefeitoId: detalhe.qualidadeDefeitoId,
    defeitoNome: detalhe.defeitoNome,
    quantidadeDefeitos: 0,
    percentualDefeitos: null,
  }

  atual.quantidadeDefeitos += detalhe.quantidadeDefeito
  ranking.set(chave, atual)
}

function incrementarRankingOperador(
  ranking: Map<string, QualidadeRankingOperadorV2>,
  operadorId: string,
  operadorNome: string,
  quantidadeReprovada: number,
  quantidadeDefeitos: number
) {
  const atual = ranking.get(operadorId) ?? {
    operadorId,
    operadorNome,
    quantidadeReprovada: 0,
    quantidadeDefeitos: 0,
  }

  atual.quantidadeReprovada += quantidadeReprovada
  atual.quantidadeDefeitos += quantidadeDefeitos
  ranking.set(operadorId, atual)
}

export function calcularIndicadoresQualidadeTurno(
  input: CalcularIndicadoresQualidadeInput
): QualidadeIndicadoresTurnoV2 {
  const lotesPorId = new Map(input.lotes.map((lote) => [lote.id, lote]))
  const detalhesPorRegistroId = new Map<string, QualidadeDetalheIndicadorEntrada[]>()

  for (const detalhe of input.detalhes) {
    const detalhesRegistro = detalhesPorRegistroId.get(detalhe.qualidadeRegistroId) ?? []
    detalhesRegistro.push(detalhe)
    detalhesPorRegistroId.set(detalhe.qualidadeRegistroId, detalhesRegistro)
  }

  const rankingDefeitos = new Map<string, QualidadeRankingDefeitoV2>()
  const rankingOperadores = new Map<string, QualidadeRankingOperadorV2>()
  const ops = new Map<
    string,
    QualidadeIndicadoresTurnoV2['ops'][number]
  >()

  let quantidadeAprovadaTotal = 0
  let quantidadeReprovadaTotal = 0
  let quantidadeRevisadaTotal = 0
  let totalDefeitos = 0

  for (const registro of input.registros) {
    quantidadeAprovadaTotal += registro.quantidadeAprovada
    quantidadeReprovadaTotal += registro.quantidadeReprovada
    quantidadeRevisadaTotal += registro.quantidadeRevisada

    const detalhesRegistro = detalhesPorRegistroId.get(registro.id) ?? []
    const totalDefeitosRegistro = detalhesRegistro.reduce(
      (soma, detalhe) => soma + detalhe.quantidadeDefeito,
      0
    )
    totalDefeitos += totalDefeitosRegistro

    const opAtual = ops.get(registro.turnoOpId) ?? {
      turnoOpId: registro.turnoOpId,
      numeroOp: registro.numeroOp,
      produtoReferencia: registro.produtoReferencia,
      produtoNome: registro.produtoNome,
      lotesPendentes: 0,
      pecasPendentes: 0,
      lotesRevisados: 0,
      quantidadeAprovada: 0,
      quantidadeReprovada: 0,
      quantidadeRevisada: 0,
      totalDefeitos: 0,
      taxaAprovacao: null,
    }

    opAtual.quantidadeAprovada += registro.quantidadeAprovada
    opAtual.quantidadeReprovada += registro.quantidadeReprovada
    opAtual.quantidadeRevisada += registro.quantidadeRevisada
    opAtual.totalDefeitos += totalDefeitosRegistro

    if (registro.qualidadeLoteId) {
      opAtual.lotesRevisados += 1
    }

    ops.set(registro.turnoOpId, opAtual)

    for (const detalhe of detalhesRegistro) {
      incrementarRankingDefeito(rankingDefeitos, detalhe)
    }

    const lote = registro.qualidadeLoteId ? lotesPorId.get(registro.qualidadeLoteId) ?? null : null

    if (lote?.operadorId && lote.operadorNome) {
      incrementarRankingOperador(
        rankingOperadores,
        lote.operadorId,
        lote.operadorNome,
        registro.quantidadeReprovada,
        totalDefeitosRegistro
      )
    }
  }

  const lotesPendentes = input.lotes.filter(loteEstaPendente)

  for (const lote of lotesPendentes) {
    const opAtual = ops.get(lote.turnoOpId) ?? {
      turnoOpId: lote.turnoOpId,
      numeroOp: lote.numeroOp,
      produtoReferencia: lote.produtoReferencia,
      produtoNome: lote.produtoNome,
      lotesPendentes: 0,
      pecasPendentes: 0,
      lotesRevisados: 0,
      quantidadeAprovada: 0,
      quantidadeReprovada: 0,
      quantidadeRevisada: 0,
      totalDefeitos: 0,
      taxaAprovacao: null,
    }

    opAtual.lotesPendentes += 1
    opAtual.pecasPendentes += lote.quantidadeLote
    ops.set(lote.turnoOpId, opAtual)
  }

  const percentualDefeitosBase =
    totalDefeitos > 0
      ? [...rankingDefeitos.values()].map((item) => {
          item.percentualDefeitos = calcularPercentual(item.quantidadeDefeitos, totalDefeitos)
          return item
        })
      : [...rankingDefeitos.values()]

  const opsOrdenadas = [...ops.values()]
    .map((op) => ({
      ...op,
      taxaAprovacao: calcularPercentual(op.quantidadeAprovada, op.quantidadeRevisada),
    }))
    .sort((opA, opB) => {
      if (opA.lotesPendentes !== opB.lotesPendentes) {
        return opB.lotesPendentes - opA.lotesPendentes
      }

      return opA.numeroOp.localeCompare(opB.numeroOp, 'pt-BR', { numeric: true })
    })

  return {
    lotesPendentes: lotesPendentes.length,
    pecasPendentes: lotesPendentes.reduce((soma, lote) => soma + lote.quantidadeLote, 0),
    lotesRevisados: input.registros.filter((registro) => Boolean(registro.qualidadeLoteId)).length,
    quantidadeAprovadaTotal,
    quantidadeReprovadaTotal,
    quantidadeRetrabalhoTotal: quantidadeReprovadaTotal,
    quantidadeRevisadaTotal,
    totalDefeitos,
    taxaAprovacao: calcularPercentual(quantidadeAprovadaTotal, quantidadeRevisadaTotal),
    taxaReprovacao: calcularPercentual(quantidadeReprovadaTotal, quantidadeRevisadaTotal),
    lotesPendentesLista: lotesPendentes
      .slice()
      .sort((loteA, loteB) => loteA.criadoEm.localeCompare(loteB.criadoEm))
      .map((lote) => ({
        id: lote.id,
        turnoOpId: lote.turnoOpId,
        numeroOp: lote.numeroOp,
        produtoReferencia: lote.produtoReferencia,
        produtoNome: lote.produtoNome,
        quantidadeLote: lote.quantidadeLote,
        status: lote.status,
        criadoEm: lote.criadoEm,
        operadorNome: lote.operadorNome,
      })),
    ops: opsOrdenadas,
    rankingDefeitos: percentualDefeitosBase.sort((defeitoA, defeitoB) => {
      if (defeitoA.quantidadeDefeitos !== defeitoB.quantidadeDefeitos) {
        return defeitoB.quantidadeDefeitos - defeitoA.quantidadeDefeitos
      }

      return defeitoA.defeitoNome.localeCompare(defeitoB.defeitoNome)
    }),
    rankingOperadores: [...rankingOperadores.values()].sort((operadorA, operadorB) => {
      if (operadorA.quantidadeReprovada !== operadorB.quantidadeReprovada) {
        return operadorB.quantidadeReprovada - operadorA.quantidadeReprovada
      }

      if (operadorA.quantidadeDefeitos !== operadorB.quantidadeDefeitos) {
        return operadorB.quantidadeDefeitos - operadorA.quantidadeDefeitos
      }

      return operadorA.operadorNome.localeCompare(operadorB.operadorNome)
    }),
  }
}
