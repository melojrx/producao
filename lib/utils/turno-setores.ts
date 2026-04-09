import type {
  PlanejamentoTurnoV2,
  TurnoOpStatusV2,
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
  setorNome: string
  numeroOp: string
  produtoId: string
  produtoNome: string
  produtoReferencia: string
  quantidadePlanejada: number
  quantidadeRealizada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
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
  quantidadeConcluida: number
  progressoOperacionalPct: number
  cargaPlanejadaTp: number
  cargaRealizadaTp: number
  qrCodeToken: string
  status: TurnoSetorStatusV2
  iniciadoEm: string | null
  encerradoEm: string | null
  demandas: TurnoSetorDemandaDashboardItem[]
}

export interface OpSetorStatusDotItem {
  setorId: string
  setorNome: string
  setorCodigo: number
  status: TurnoSetorDemandaStatusV2 | TurnoSetorStatusV2
}

export interface TurnoOpResumoDashboardItem {
  id: string
  numeroOp: string
  produtoReferencia: string
  produtoNome: string
  produtoNomeResumido: string
  quantidadePlanejada: number
  quantidadeConcluida: number
  progressoOperacionalPct: number
  status: TurnoOpStatusV2
  setores: OpSetorStatusDotItem[]
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
  if (demandas.length === 0) {
    return statusAtual ?? 'planejada'
  }

  if (demandas.every((demanda) => demanda.status === 'concluida')) {
    return 'concluida'
  }

  if (demandas.every((demanda) => demanda.status === 'encerrada_manualmente')) {
    return 'encerrada_manualmente'
  }

  if (
    demandas.some(
      (demanda) =>
        demanda.status === 'em_andamento' ||
        demanda.status === 'concluida' ||
        demanda.quantidadeRealizada > 0
    )
  ) {
    return 'em_andamento'
  }

  if (demandas.some((demanda) => demanda.status === 'aberta')) {
    return 'aberta'
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
        setorNome: secao.setorNome,
        numeroOp: op.numeroOp,
        produtoId: op.produtoId,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
        quantidadePlanejada: secao.quantidadePlanejada,
        quantidadeRealizada: secao.quantidadeRealizada,
        quantidadeConcluida: secao.quantidadeConcluida,
        progressoOperacionalPct: secao.progressoOperacionalPct,
        cargaPlanejadaTp: secao.cargaPlanejadaTp,
        cargaRealizadaTp: secao.cargaRealizadaTp,
        status: secao.status,
      }
    })
    .filter((demanda): demanda is TurnoSetorDemandaDashboardItem => Boolean(demanda))
}

function mapearDemandasPlanejamentoParaDashboard(
  planejamento: Pick<
    PlanejamentoTurnoV2,
    'ops' | 'setoresAtivos' | 'demandasSetor' | 'secoesSetorOp'
  >
): TurnoSetorDemandaDashboardItem[] {
  const setorNomePorId = new Map<string, string>()

  for (const setor of planejamento.setoresAtivos ?? []) {
    setorNomePorId.set(setor.setorId, setor.setorNome)
  }

  for (const secao of planejamento.secoesSetorOp) {
    setorNomePorId.set(secao.setorId, secao.setorNome)
  }

  if (planejamento.demandasSetor && planejamento.demandasSetor.length > 0) {
    return planejamento.demandasSetor.map((demanda) => ({
      id: demanda.id,
      turnoSetorId: demanda.turnoSetorId,
      turnoOpId: demanda.turnoOpId,
      setorId: demanda.setorId,
      setorCodigo: demanda.setorCodigo,
      setorNome: setorNomePorId.get(demanda.setorId) ?? `Setor ${demanda.setorCodigo}`,
      numeroOp: demanda.numeroOp,
      produtoId: demanda.produtoId,
      produtoNome: demanda.produtoNome,
      produtoReferencia: demanda.produtoReferencia,
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeRealizada: demanda.quantidadeRealizada,
      quantidadeConcluida: demanda.quantidadeConcluida,
      progressoOperacionalPct: demanda.progressoOperacionalPct,
      cargaPlanejadaTp: demanda.cargaPlanejadaTp,
      cargaRealizadaTp: demanda.cargaRealizadaTp,
      status: demanda.status,
    }))
  }

  return mapearDemandasLegadas(planejamento)
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

function resumirNomeProduto(nome: string): string {
  const nomeNormalizado = nome.trim()

  if (nomeNormalizado.length <= 72) {
    return nomeNormalizado
  }

  const palavras = nomeNormalizado.split(/\s+/)
  let resumoAtual = ''

  for (const palavra of palavras) {
    const candidato = resumoAtual ? `${resumoAtual} ${palavra}` : palavra

    if (candidato.length > 72) {
      break
    }

    resumoAtual = candidato
  }

  return `${resumoAtual.trim()}...`
}

export function mapearSetoresTurnoParaDashboard(
  planejamento: Pick<PlanejamentoTurnoV2, 'turno' | 'ops' | 'setoresAtivos' | 'demandasSetor' | 'secoesSetorOp'>
): TurnoSetorDashboardItem[] {
  const demandas = mapearDemandasPlanejamentoParaDashboard(planejamento)

  const demandasPorSetor = agruparDemandasPorSetor(demandas)
  const setoresMapeados = new Map<string, TurnoSetorDashboardItem>()

  for (const setor of planejamento.setoresAtivos ?? []) {
    const demandasDoSetor = ordenarDemandas(demandasPorSetor.get(setor.setorId) ?? [])
    const quantidadePlanejada = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.quantidadePlanejada,
      0
    )
    const quantidadeRealizada = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.quantidadeRealizada,
      0
    )
    const cargaPlanejadaTp = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.cargaPlanejadaTp,
      0
    )
    const cargaRealizadaTp = demandasDoSetor.reduce(
      (soma, demanda) => soma + demanda.cargaRealizadaTp,
      0
    )
    const progressoOperacionalPct =
      cargaPlanejadaTp > 0 ? Math.min((cargaRealizadaTp / cargaPlanejadaTp) * 100, 100) : 0

    setoresMapeados.set(setor.setorId, {
      id: setor.id,
      turnoId: setor.turnoId,
      setorId: setor.setorId,
      setorCodigo: setor.setorCodigo,
      setorNome: setor.setorNome,
      quantidadePlanejada,
      quantidadeRealizada,
      quantidadeConcluida: quantidadeRealizada,
      progressoOperacionalPct,
      cargaPlanejadaTp,
      cargaRealizadaTp,
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
        quantidadeConcluida: demandasDoSetor.reduce(
          (soma, demanda) => soma + demanda.quantidadeConcluida,
          0
        ),
        progressoOperacionalPct:
          demandasDoSetor.reduce((soma, demanda) => soma + demanda.cargaPlanejadaTp, 0) > 0
            ? Math.min(
                (demandasDoSetor.reduce((soma, demanda) => soma + demanda.cargaRealizadaTp, 0) /
                  demandasDoSetor.reduce((soma, demanda) => soma + demanda.cargaPlanejadaTp, 0)) *
                  100,
                100
              )
            : 0,
        cargaPlanejadaTp: demandasDoSetor.reduce(
          (soma, demanda) => soma + demanda.cargaPlanejadaTp,
          0
        ),
        cargaRealizadaTp: demandasDoSetor.reduce(
          (soma, demanda) => soma + demanda.cargaRealizadaTp,
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

export function mapearOpsTurnoParaDashboard(
  planejamento: Pick<PlanejamentoTurnoV2, 'ops' | 'setoresAtivos' | 'demandasSetor' | 'secoesSetorOp'>
): TurnoOpResumoDashboardItem[] {
  const demandas = mapearDemandasPlanejamentoParaDashboard(planejamento)

  const demandasPorOp = new Map<string, TurnoSetorDemandaDashboardItem[]>()

  for (const demanda of demandas) {
    const demandasAtuais = demandasPorOp.get(demanda.turnoOpId) ?? []
    demandasAtuais.push(demanda)
    demandasPorOp.set(demanda.turnoOpId, demandasAtuais)
  }

  return [...planejamento.ops]
    .sort((primeiraOp, segundaOp) => primeiraOp.numeroOp.localeCompare(segundaOp.numeroOp))
    .map((op) => {
      const setores = [...(demandasPorOp.get(op.id) ?? [])]
        .sort((primeiroSetor, segundoSetor) => compararSetoresPorOrdem(primeiroSetor, segundoSetor))
        .map((demanda) => ({
          setorId: demanda.setorId,
          setorNome: demanda.setorNome,
          setorCodigo: demanda.setorCodigo,
          status: demanda.status,
        }))

      return {
        id: op.id,
        numeroOp: op.numeroOp,
        produtoReferencia: op.produtoReferencia,
        produtoNome: op.produtoNome,
        produtoNomeResumido: resumirNomeProduto(op.produtoNome),
        quantidadePlanejada: op.quantidadePlanejada,
        quantidadeConcluida: op.quantidadeConcluida,
        progressoOperacionalPct: op.progressoOperacionalPct,
        status: op.status,
        setores,
      }
    })
}
