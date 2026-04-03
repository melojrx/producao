import { calcularMetaGrupo } from '@/lib/utils/producao'
import type {
  ComparativoMetaGrupoHoraItem,
  RegistroProducaoTurnoHora,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoOpV2,
  TurnoV2,
} from '@/types'

const MINUTOS_POR_HORA = 60
const MILISSEGUNDOS_POR_MINUTO = 60 * 1000

type TurnoComCapacidade = Pick<TurnoV2, 'operadoresDisponiveis' | 'minutosTurno' | 'iniciadoEm'>
type TurnoOpComTpProduto = Pick<TurnoOpV2, 'tpProdutoMin'>
type DemandaTurnoConsolidavel = Pick<TurnoSetorDemandaV2, 'id' | 'turnoOpId'>
type OperacaoTurnoConsolidavel = Pick<
  TurnoSetorOperacaoApontamentoV2,
  'id' | 'turnoOpId' | 'turnoSetorDemandaId'
>

export interface MetaGrupoTurnoResumoV2 {
  mediaTpProduto: number
  metaGrupo: number
}

export function calcularMediaTpProdutoTurno(
  ops: TurnoOpComTpProduto[]
): number {
  const tpValidos = ops
    .map((op) => op.tpProdutoMin)
    .filter((tpProdutoMin) => Number.isFinite(tpProdutoMin) && tpProdutoMin > 0)

  if (tpValidos.length === 0) {
    return 0
  }

  const somaTpProduto = tpValidos.reduce((soma, tpProdutoMin) => soma + tpProdutoMin, 0)
  return somaTpProduto / tpValidos.length
}

export function calcularMetaGrupoTurnoV2(
  turno: Pick<TurnoComCapacidade, 'operadoresDisponiveis' | 'minutosTurno'>,
  ops: TurnoOpComTpProduto[]
): MetaGrupoTurnoResumoV2 {
  const mediaTpProduto = calcularMediaTpProdutoTurno(ops)

  return {
    mediaTpProduto,
    metaGrupo: calcularMetaGrupo(
      turno.operadoresDisponiveis,
      turno.minutosTurno,
      mediaTpProduto
    ),
  }
}

function criarMarcosDoTurno(
  iniciadoEm: string,
  minutosTurno: number
): Date[] {
  if (minutosTurno <= 0) {
    return []
  }

  const inicioTurno = new Date(iniciadoEm)

  if (Number.isNaN(inicioTurno.getTime())) {
    return []
  }

  const marcos: Date[] = [inicioTurno]

  for (
    let minutosDecorridos = MINUTOS_POR_HORA;
    minutosDecorridos < minutosTurno;
    minutosDecorridos += MINUTOS_POR_HORA
  ) {
    marcos.push(new Date(inicioTurno.getTime() + minutosDecorridos * MILISSEGUNDOS_POR_MINUTO))
  }

  const fimTurno = new Date(inicioTurno.getTime() + minutosTurno * MILISSEGUNDOS_POR_MINUTO)
  const ultimoMarco = marcos.at(-1)

  if (!ultimoMarco || ultimoMarco.getTime() !== fimTurno.getTime()) {
    marcos.push(fimTurno)
  }

  return marcos
}

export function criarComparativoMetaGrupoHora(
  turno: TurnoComCapacidade,
  metaGrupo: number,
  registros: RegistroProducaoTurnoHora[],
  demandasSetor: DemandaTurnoConsolidavel[],
  operacoesSecao: OperacaoTurnoConsolidavel[]
): ComparativoMetaGrupoHoraItem[] {
  const marcos = criarMarcosDoTurno(turno.iniciadoEm, turno.minutosTurno)

  if (marcos.length === 0) {
    return []
  }

  const registrosOrdenados = [...registros]
    .filter((registro) => Number.isFinite(registro.quantidade) && registro.quantidade > 0)
    .map((registro) => ({
      quantidade: registro.quantidade,
      horaRegistro: new Date(registro.horaRegistro),
      turnoSetorOperacaoId: registro.turnoSetorOperacaoId,
    }))
    .filter((registro) => !Number.isNaN(registro.horaRegistro.getTime()))
    .sort(
      (primeiroRegistro, segundoRegistro) =>
        primeiroRegistro.horaRegistro.getTime() - segundoRegistro.horaRegistro.getTime()
    )

  const operacoesPorDemandaId = new Map<string, string[]>()
  const demandasPorTurnoOpId = new Map<string, string[]>()
  const realizadoPorOperacaoId = new Map<string, number>()

  for (const operacao of operacoesSecao) {
    if (!operacao.turnoSetorDemandaId) {
      continue
    }

    const operacoesDemanda = operacoesPorDemandaId.get(operacao.turnoSetorDemandaId) ?? []
    operacoesDemanda.push(operacao.id)
    operacoesPorDemandaId.set(operacao.turnoSetorDemandaId, operacoesDemanda)
  }

  for (const demanda of demandasSetor) {
    const demandasOp = demandasPorTurnoOpId.get(demanda.turnoOpId) ?? []
    demandasOp.push(demanda.id)
    demandasPorTurnoOpId.set(demanda.turnoOpId, demandasOp)
  }

  let indiceRegistro = 0

  return marcos.map((marco) => {
    while (
      indiceRegistro < registrosOrdenados.length &&
      registrosOrdenados[indiceRegistro].horaRegistro.getTime() <= marco.getTime()
    ) {
      const registroAtual = registrosOrdenados[indiceRegistro]
      realizadoPorOperacaoId.set(
        registroAtual.turnoSetorOperacaoId,
        (realizadoPorOperacaoId.get(registroAtual.turnoSetorOperacaoId) ?? 0) +
          registroAtual.quantidade
      )
      indiceRegistro += 1
    }

    const realizadoPorDemandaId = new Map<string, number>()

    for (const demanda of demandasSetor) {
      const operacoesDemanda = operacoesPorDemandaId.get(demanda.id) ?? []

      if (operacoesDemanda.length === 0) {
        realizadoPorDemandaId.set(demanda.id, 0)
        continue
      }

      const realizadoDemanda = Math.min(
        ...operacoesDemanda.map((operacaoId) => realizadoPorOperacaoId.get(operacaoId) ?? 0)
      )
      realizadoPorDemandaId.set(demanda.id, realizadoDemanda)
    }

    let realizadoAcumulado = 0

    for (const demandasTurnoOp of demandasPorTurnoOpId.values()) {
      if (demandasTurnoOp.length === 0) {
        continue
      }

      realizadoAcumulado += Math.min(
        ...demandasTurnoOp.map((demandaId) => realizadoPorDemandaId.get(demandaId) ?? 0)
      )
    }

    const minutosDecorridos = Math.max(
      (marco.getTime() - marcos[0].getTime()) / MILISSEGUNDOS_POR_MINUTO,
      0
    )
    const planejado =
      metaGrupo > 0 && turno.minutosTurno > 0
        ? Math.min(Math.floor((metaGrupo * minutosDecorridos) / turno.minutosTurno), metaGrupo)
        : 0

    return {
      hora: marco.toISOString(),
      planejado,
      realizado: realizadoAcumulado,
    }
  })
}
