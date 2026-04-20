import type {
  CalculoCapacidadeSetorInput,
  DiagnosticoCapacidadeSetorV2,
  EtapaFluxoSetorV2,
  PosicaoFilaSetorV2,
  PosicaoFluxoOpLoteV2,
  ResumoCapacidadeSetorV2,
  TurnoSetorFilaStatusV2,
} from '@/types'

const ORDEM_DECIMAL_PT_BR = 1000

function normalizarNumeroPositivo(valor: number): number {
  return Number.isFinite(valor) && valor > 0 ? valor : 0
}

function arredondarNumero(valor: number): number {
  return Math.round(valor * ORDEM_DECIMAL_PT_BR) / ORDEM_DECIMAL_PT_BR
}

function compararEtapasFluxo(primeiraEtapa: EtapaFluxoSetorV2, segundaEtapa: EtapaFluxoSetorV2): number {
  const primeiroCodigo = primeiraEtapa.setorCodigo ?? Number.MAX_SAFE_INTEGER
  const segundoCodigo = segundaEtapa.setorCodigo ?? Number.MAX_SAFE_INTEGER

  if (primeiroCodigo !== segundoCodigo) {
    return primeiroCodigo - segundoCodigo
  }

  return primeiraEtapa.setorId.localeCompare(segundaEtapa.setorId)
}

export function calcularCapacidadeSetorEmMinutos(
  operadoresAlocados: number,
  minutosTurno: number
): number {
  return Math.floor(normalizarNumeroPositivo(operadoresAlocados)) * normalizarNumeroPositivo(minutosTurno)
}

export function calcularCargaPendenteSetorEmMinutos(
  quantidadePendente: number,
  tpTotalSetorProduto: number
): number {
  return arredondarNumero(
    normalizarNumeroPositivo(quantidadePendente) * normalizarNumeroPositivo(tpTotalSetorProduto)
  )
}

export function calcularCapacidadeSetorEmPecas(
  capacidadeMinutosTotal: number,
  tpTotalSetorProduto?: number | null
): number | null {
  const tpTotalNormalizado = normalizarNumeroPositivo(tpTotalSetorProduto ?? 0)

  if (capacidadeMinutosTotal <= 0 || tpTotalNormalizado <= 0) {
    return null
  }

  return Math.floor(capacidadeMinutosTotal / tpTotalNormalizado)
}

export function diagnosticarCapacidadeSetor(
  cargaPendenteMinutos: number,
  capacidadeMinutosTotal: number
): DiagnosticoCapacidadeSetorV2 {
  const cargaNormalizada = normalizarNumeroPositivo(cargaPendenteMinutos)
  const capacidadeNormalizada = normalizarNumeroPositivo(capacidadeMinutosTotal)

  if (cargaNormalizada <= 0) {
    return 'sem_carga'
  }

  if (capacidadeNormalizada <= 0) {
    return 'acima_capacidade'
  }

  if (cargaNormalizada > capacidadeNormalizada) {
    return 'acima_capacidade'
  }

  if (cargaNormalizada === capacidadeNormalizada) {
    return 'no_limite'
  }

  return 'dentro_capacidade'
}

export function calcularResumoCapacidadeSetor(
  input: CalculoCapacidadeSetorInput
): ResumoCapacidadeSetorV2 {
  const operadoresAlocados = Math.floor(normalizarNumeroPositivo(input.operadoresAlocados))
  const minutosTurno = normalizarNumeroPositivo(input.minutosTurno)
  const cargaPendenteMinutos = normalizarNumeroPositivo(input.cargaPendenteMinutos)
  const cargaConsumidaMinutos = normalizarNumeroPositivo(input.cargaConsumidaMinutos ?? 0)
  const cargaReservadaMinutos = normalizarNumeroPositivo(input.cargaReservadaMinutos ?? 0)
  const capacidadeMinutosTotal = calcularCapacidadeSetorEmMinutos(operadoresAlocados, minutosTurno)
  const capacidadeMinutosComprometida = arredondarNumero(
    cargaConsumidaMinutos + cargaReservadaMinutos
  )
  const capacidadeMinutosRestante = Math.max(
    capacidadeMinutosTotal - capacidadeMinutosComprometida,
    0
  )
  const eficienciaRequeridaPct =
    capacidadeMinutosTotal > 0
      ? arredondarNumero((cargaPendenteMinutos / capacidadeMinutosTotal) * 100)
      : null

  return {
    operadoresAlocados,
    minutosTurno,
    cargaPendenteMinutos,
    cargaConsumidaMinutos,
    cargaReservadaMinutos,
    capacidadeMinutosTotal,
    capacidadeMinutosRestante,
    capacidadePecas: calcularCapacidadeSetorEmPecas(capacidadeMinutosTotal, input.tpTotalSetorProduto),
    eficienciaRequeridaPct,
    diagnosticoCapacidade: diagnosticarCapacidadeSetor(
      cargaPendenteMinutos,
      capacidadeMinutosTotal
    ),
  }
}

export function resolverStatusFilaSetor(input: {
  quantidadePlanejada: number
  quantidadeConcluida: number
  quantidadeDisponivelApontamento?: number | null
  posicaoFila?: number | null
  iniciadoEm?: string | null
  encerradoEm?: string | null
}): TurnoSetorFilaStatusV2 {
  const quantidadePlanejada = normalizarNumeroPositivo(input.quantidadePlanejada)
  const quantidadeConcluida = normalizarNumeroPositivo(input.quantidadeConcluida)
  const quantidadeDisponivelApontamento =
    input.quantidadeDisponivelApontamento === undefined ||
    input.quantidadeDisponivelApontamento === null
      ? Math.max(quantidadePlanejada - quantidadeConcluida, 0)
      : normalizarNumeroPositivo(input.quantidadeDisponivelApontamento)

  if (quantidadePlanejada <= 0) {
    return 'sem_fila'
  }

  if (input.encerradoEm || quantidadeConcluida >= quantidadePlanejada) {
    return 'concluida_setor'
  }

  if (input.iniciadoEm && quantidadeConcluida > 0) {
    return 'parcial'
  }

  if (input.iniciadoEm) {
    return 'em_producao'
  }

  if ((input.posicaoFila ?? null) === 1 && quantidadeDisponivelApontamento > 0) {
    return 'liberada'
  }

  return 'em_fila'
}

export function criarPosicaoFilaSetor(input: {
  quantidadePlanejada: number
  quantidadeConcluida: number
  quantidadeDisponivelApontamento?: number | null
  posicaoFila?: number | null
  iniciadoEm?: string | null
  encerradoEm?: string | null
}): PosicaoFilaSetorV2 {
  const posicaoFila = input.encerradoEm ? null : (input.posicaoFila ?? null)

  return {
    posicaoFila,
    statusFila: resolverStatusFilaSetor({
      quantidadePlanejada: input.quantidadePlanejada,
      quantidadeConcluida: input.quantidadeConcluida,
      quantidadeDisponivelApontamento: input.quantidadeDisponivelApontamento,
      posicaoFila,
      iniciadoEm: input.iniciadoEm,
      encerradoEm: input.encerradoEm,
    }),
  }
}

export function resolverPosicaoAtualFluxoOpLote(
  etapas: EtapaFluxoSetorV2[]
): PosicaoFluxoOpLoteV2 {
  if (etapas.length === 0) {
    return {
      setorFluxoAtualId: null,
      setorFluxoAtualCodigo: null,
      setorFluxoAtualNome: null,
      ordemFluxoAtual: null,
      statusFilaAtual: 'sem_fila',
      quantidadePendenteAtual: 0,
      quantidadeFinalizada: 0,
    }
  }

  const etapasOrdenadas = [...etapas].sort(compararEtapasFluxo)
  const etapaAtual =
    etapasOrdenadas.find((etapa) => etapa.quantidadeConcluida < etapa.quantidadePlanejada) ??
    etapasOrdenadas[etapasOrdenadas.length - 1]
  const posicaoFilaAtual =
    etapaAtual.statusFila
      ? {
          posicaoFila: etapaAtual.posicaoFila ?? null,
          statusFila: etapaAtual.statusFila,
        }
      : criarPosicaoFilaSetor({
          quantidadePlanejada: etapaAtual.quantidadePlanejada,
          quantidadeConcluida: etapaAtual.quantidadeConcluida,
          posicaoFila: etapaAtual.posicaoFila ?? null,
          iniciadoEm: null,
          encerradoEm:
            etapaAtual.quantidadeConcluida >= etapaAtual.quantidadePlanejada ? 'concluida' : null,
        })
  const etapaFinal = etapasOrdenadas[etapasOrdenadas.length - 1]

  return {
    setorFluxoAtualId: etapaAtual.setorId,
    setorFluxoAtualCodigo: etapaAtual.setorCodigo,
    setorFluxoAtualNome: etapaAtual.setorNome,
    ordemFluxoAtual: etapaAtual.setorCodigo,
    statusFilaAtual: etapaAtual.statusFila ?? posicaoFilaAtual.statusFila,
    quantidadePendenteAtual: Math.max(etapaAtual.quantidadePlanejada - etapaAtual.quantidadeConcluida, 0),
    quantidadeFinalizada: Math.min(etapaFinal.quantidadeConcluida, etapaFinal.quantidadePlanejada),
  }
}
