import type {
  QualidadeIndicadoresTurnoV2,
  QualidadeRankingDefeitoV2,
  QualidadeRankingOperadorV2,
} from '@/types'

export interface QualidadeRegistroIndicadorEntrada {
  id: string
  turnoOpId: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  quantidadeAprovada: number
  quantidadeReprovada: number
  quantidadeRevisada: number
  operadorId: string | null
  operadorNome: string | null
}

export interface QualidadeDetalheIndicadorEntrada {
  qualidadeRegistroId: string
  qualidadeDefeitoId: string | null
  defeitoNome: string
  quantidadeDefeito: number
}

export interface CalcularIndicadoresQualidadeInput {
  registros: QualidadeRegistroIndicadorEntrada[]
  detalhes: QualidadeDetalheIndicadorEntrada[]
}

function calcularPercentual(numerador: number, denominador: number): number | null {
  if (denominador <= 0) {
    return null
  }

  return (numerador / denominador) * 100
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
      pendenciasRevisao: 0,
      pecasPendentesRevisao: 0,
      revisoesRealizadas: 0,
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
    opAtual.revisoesRealizadas += 1

    ops.set(registro.turnoOpId, opAtual)

    for (const detalhe of detalhesRegistro) {
      incrementarRankingDefeito(rankingDefeitos, detalhe)
    }

    if (registro.operadorId && registro.operadorNome) {
      incrementarRankingOperador(
        rankingOperadores,
        registro.operadorId,
        registro.operadorNome,
        registro.quantidadeReprovada,
        totalDefeitosRegistro
      )
    }
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
    .sort((opA, opB) => opA.numeroOp.localeCompare(opB.numeroOp, 'pt-BR', { numeric: true }))

  return {
    pendenciasRevisao: 0,
    pecasPendentesRevisao: 0,
    revisoesRealizadas: input.registros.length,
    quantidadeAprovadaTotal,
    quantidadeReprovadaTotal,
    quantidadeRetrabalhoTotal: quantidadeReprovadaTotal,
    quantidadeRevisadaTotal,
    totalDefeitos,
    taxaAprovacao: calcularPercentual(quantidadeAprovadaTotal, quantidadeRevisadaTotal),
    taxaReprovacao: calcularPercentual(quantidadeReprovadaTotal, quantidadeRevisadaTotal),
    pendenciasRevisaoLista: [],
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
