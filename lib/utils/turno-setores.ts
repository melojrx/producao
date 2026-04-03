import type {
  PlanejamentoTurnoV2,
  TurnoSetorDemandaStatusV2,
  TurnoSetorStatusV2,
} from '@/types'
import { compararSetoresPorOrdem } from '@/lib/utils/setor-ordem'

export interface TurnoSetorDemandaDashboardItem {
  id: string
  turnoSetorId: string
  turnoOpId: string
  setorId: string
  setorCodigo: number
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  status: TurnoSetorDemandaStatusV2
}

export interface TurnoSetorDashboardItem {
  id: string
  turnoId: string
  setorId: string
  setorCodigo: number
  setorNome: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  qrCodeToken: string
  status: TurnoSetorStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
  demandas: TurnoSetorDemandaDashboardItem[]
}

function ordenarDemandas(
  demandas: TurnoSetorDemandaDashboardItem[]
): TurnoSetorDemandaDashboardItem[] {
  return [...demandas].sort((primeiraDemanda, segundaDemanda) => {
    const comparacaoOp = primeiraDemanda.numeroOp.localeCompare(segundaDemanda.numeroOp)

    if (comparacaoOp !== 0) {
      return comparacaoOp
    }

    return primeiraDemanda.produtoNome.localeCompare(segundaDemanda.produtoNome)
  })
}

function deduzirStatusSetor(
  demandas: TurnoSetorDemandaDashboardItem[],
  statusAtual?: TurnoSetorStatusV2
): TurnoSetorStatusV2 {
  if (statusAtual) {
    return statusAtual
  }

  if (demandas.length === 0) {
    return 'planejada'
  }

  if (demandas.some((demanda) => demanda.status === 'em_andamento')) {
    return 'em_andamento'
  }

  if (demandas.some((demanda) => demanda.status === 'aberta')) {
    return 'aberta'
  }

  if (demandas.every((demanda) => demanda.status === 'concluida')) {
    return 'concluida'
  }

  if (demandas.every((demanda) => demanda.status === 'encerrada_manualmente')) {
    return 'encerrada_manualmente'
  }

  return 'planejada'
}

function mapearDemandasLegadas(
  planejamento: Pick<PlanejamentoTurnoV2, 'ops' | 'secoesSetorOp'>
): TurnoSetorDemandaDashboardItem[] {
  const opPorId = new Map(planejamento.ops.map((op) => [op.id, op]))

  return planejamento.secoesSetorOp
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)

      if (!op) {
        return null
      }

      return {
        id: secao.id,
        turnoSetorId: secao.id,
        turnoOpId: secao.turnoOpId,
        setorId: secao.setorId,
        setorCodigo: secao.setorCodigo,
        numeroOp: op.numeroOp,
        produtoId: op.produtoId,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadePlanejada: secao.quantidadePlanejada,
        quantidadeRealizada: secao.quantidadeRealizada,
        status: secao.status,
      }
    })
    .filter((demanda): demanda is TurnoSetorDemandaDashboardItem => Boolean(demanda))
}

function agruparDemandasPorSetor(
  demandas: TurnoSetorDemandaDashboardItem[]
): Map<string, TurnoSetorDemandaDashboardItem[]> {
  const mapa = new Map<string, TurnoSetorDemandaDashboardItem[]>()

  for (const demanda of demandas) {
    const demandasAtuais = mapa.get(demanda.setorId) ?? []
    demandasAtuais.push(demanda)
    mapa.set(demanda.setorId, demandasAtuais)
  }

  return mapa
}

export function mapearSetoresTurnoParaDashboard(
  planejamento: Pick<PlanejamentoTurnoV2, 'turno' | 'ops' | 'setoresAtivos' | 'demandasSetor' | 'secoesSetorOp'>
): TurnoSetorDashboardItem[] {
  const demandas =
    planejamento.demandasSetor && planejamento.demandasSetor.length > 0
      ? planejamento.demandasSetor.map((demanda) => ({
          id: demanda.id,
          turnoSetorId: demanda.turnoSetorId,
          turnoOpId: demanda.turnoOpId,
          setorId: demanda.setorId,
          setorCodigo: demanda.setorCodigo,
          numeroOp: demanda.numeroOp,
          produtoId: demanda.produtoId,
          produtoNome: demanda.produtoNome,
          produtoReferencia: demanda.produtoReferencia,
          quantidadePlanejada: demanda.quantidadePlanejada,
          quantidadeRealizada: demanda.quantidadeRealizada,
          status: demanda.status,
        }))
      : mapearDemandasLegadas(planejamento)

  const demandasPorSetor = agruparDemandasPorSetor(demandas)
  const setoresMapeados = new Map<string, TurnoSetorDashboardItem>()

  for (const setor of planejamento.setoresAtivos ?? []) {
    const demandasDoSetor = ordenarDemandas(demandasPorSetor.get(setor.setorId) ?? [])
    const quantidadePlanejada =
      setor.quantidadePlanejada > 0
        ? setor.quantidadePlanejada
        : demandasDoSetor.reduce((soma, demanda) => soma + demanda.quantidadePlanejada, 0)
    const quantidadeRealizada =
      setor.quantidadeRealizada > 0
        ? setor.quantidadeRealizada
        : demandasDoSetor.reduce((soma, demanda) => soma + demanda.quantidadeRealizada, 0)

    setoresMapeados.set(setor.setorId, {
      id: setor.id,
      turnoId: setor.turnoId,
      setorId: setor.setorId,
      setorCodigo: setor.setorCodigo,
      setorNome: setor.setorNome,
      quantidadePlanejada,
      quantidadeRealizada,
      qrCodeToken: setor.qrCodeToken,
      status: deduzirStatusSetor(demandasDoSetor, setor.status),
      iniciadoEm: setor.iniciadoEm,
      encerradoEm: setor.encerradoEm,
      demandas: demandasDoSetor,
    })
  }

  if (setoresMapeados.size === 0) {
    for (const secao of planejamento.secoesSetorOp) {
      if (setoresMapeados.has(secao.setorId)) {
        continue
      }

      const demandasDoSetor = ordenarDemandas(demandasPorSetor.get(secao.setorId) ?? [])
      setoresMapeados.set(secao.setorId, {
        id: secao.id,
        turnoId: secao.turnoId,
        setorId: secao.setorId,
        setorCodigo: secao.setorCodigo,
        setorNome: secao.setorNome,
        quantidadePlanejada: demandasDoSetor.reduce(
          (soma, demanda) => soma + demanda.quantidadePlanejada,
          0
        ),
        quantidadeRealizada: demandasDoSetor.reduce(
          (soma, demanda) => soma + demanda.quantidadeRealizada,
          0
        ),
        qrCodeToken: secao.qrCodeToken,
        status: deduzirStatusSetor(demandasDoSetor),
        iniciadoEm: secao.iniciadoEm,
        encerradoEm: secao.encerradoEm,
        demandas: demandasDoSetor,
      })
    }
  }

  return [...setoresMapeados.values()].sort((primeiroSetor, segundoSetor) =>
    compararSetoresPorOrdem(primeiroSetor, segundoSetor)
  )
}

export function mapearPossuiProducaoPorOp(
  planejamento: Pick<PlanejamentoTurnoV2, 'ops' | 'demandasSetor' | 'secoesSetorOp'>
): Map<string, boolean> {
  const mapa = new Map<string, boolean>()

  for (const op of planejamento.ops) {
    mapa.set(op.id, false)
  }

  if (planejamento.demandasSetor && planejamento.demandasSetor.length > 0) {
    for (const demanda of planejamento.demandasSetor) {
      if (demanda.quantidadeRealizada > 0) {
        mapa.set(demanda.turnoOpId, true)
      }
    }

    return mapa
  }

  for (const secao of planejamento.secoesSetorOp) {
    if (secao.quantidadeRealizada > 0) {
      mapa.set(secao.turnoOpId, true)
    }
  }

  return mapa
}
