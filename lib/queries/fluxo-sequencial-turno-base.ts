import type { SupabaseClient } from '@supabase/supabase-js'
import { enriquecerDemandasComFluxoParalelo } from '@/lib/utils/fluxo-paralelo-turno'
import { aplicarCapacidadeOperacionalDemandas } from '@/lib/utils/hidratacao-capacidade-setor-turno'
import type {
  EtapaFluxoChaveV2,
  TurnoOpV2,
  TurnoSetorDemandaStatusV2,
  TurnoSetorDemandaV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOperacaoStatusV2,
} from '@/types'
import type { Database, Tables } from '@/types/supabase'

type TurnoSetorOperacaoRow = Pick<
  Tables<'turno_setor_operacoes'>,
  | 'id'
  | 'turno_id'
  | 'turno_op_id'
  | 'turno_setor_op_id'
  | 'turno_setor_demanda_id'
  | 'setor_id'
  | 'operacao_id'
  | 'tempo_padrao_min_snapshot'
  | 'status'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
>

type TurnoRow = Pick<Tables<'turnos'>, 'id' | 'operadores_disponiveis' | 'minutos_turno'>

type TurnoSetorDemandaFluxoRow = Pick<
  Tables<'turno_setor_demandas'>,
  | 'id'
  | 'turno_id'
  | 'turno_op_id'
  | 'setor_id'
  | 'turno_setor_op_legacy_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
  | 'status'
  | 'iniciado_em'
  | 'encerrado_em'
> & {
  setores:
    | {
        codigo: number
        nome: string
      }
    | Array<{
        codigo: number
        nome: string
      }>
    | null
  turno_ops:
    | {
        numero_op: string
      }
    | Array<{
        numero_op: string
      }>
    | null
}

export interface DisponibilidadeSequencialOperacaoTurnoV2 {
  turnoSetorOperacaoId: string
  turnoOpId: string
  turnoSetorDemandaId: string | null
  numeroOp: string
  etapaFluxoChave?: EtapaFluxoChaveV2
  setorId: string
  setorCodigo: number
  setorNome: string
  setorAnteriorNome: string | null
  quantidadePlanejadaOperacao: number
  quantidadeRealizadaOperacao: number
  quantidadePlanejadaDemanda: number
  quantidadeRealizadaDemanda: number
  quantidadeLiberadaSetor: number
  quantidadeDisponivelApontamento: number
  quantidadeSincronizadaMontagem: number
  quantidadeBloqueadaSincronizacao: number
  quantidadeDisponivelOperacao: number
}

function extrairRegistroUnico<T>(valor: T | T[] | null): T | null {
  if (!valor) {
    return null
  }

  return Array.isArray(valor) ? valor[0] ?? null : valor
}

function criarChaveDemandaFallback(turnoOpId: string, setorId: string): string {
  return `${turnoOpId}:${setorId}`
}

function mapearOperacaoApontamento(
  operacao: TurnoSetorOperacaoRow
): TurnoSetorOperacaoApontamentoV2 {
  return {
    id: operacao.id,
    turnoId: operacao.turno_id,
    turnoOpId: operacao.turno_op_id,
    turnoSetorOpId: operacao.turno_setor_op_id,
    turnoSetorId: null,
    turnoSetorDemandaId: operacao.turno_setor_demanda_id,
    produtoOperacaoId: operacao.operacao_id,
    operacaoId: operacao.operacao_id,
    setorId: operacao.setor_id,
    sequencia: 0,
    tempoPadraoMinSnapshot: operacao.tempo_padrao_min_snapshot,
    quantidadePlanejada: operacao.quantidade_planejada,
    quantidadeRealizada: operacao.quantidade_realizada,
    status: operacao.status as TurnoSetorOperacaoStatusV2,
    iniciadoEm: null,
    encerradoEm: null,
    operacaoCodigo: '',
    operacaoDescricao: '',
    maquinaCodigo: null,
    maquinaModelo: null,
  }
}

function mapearDemandaTurno(
  demanda: TurnoSetorDemandaFluxoRow
): TurnoSetorDemandaV2 | null {
  const setor = extrairRegistroUnico(demanda.setores)
  const turnoOp = extrairRegistroUnico(demanda.turno_ops)

  if (!setor || !turnoOp) {
    return null
  }

  return {
    id: demanda.id,
    turnoSetorId: demanda.id,
    turnoId: demanda.turno_id,
    turnoOpId: demanda.turno_op_id,
    setorId: demanda.setor_id,
    setorCodigo: setor.codigo,
    setorNome: setor.nome,
    produtoId: '',
    numeroOp: turnoOp.numero_op,
    produtoReferencia: '',
    produtoNome: '',
    quantidadePlanejada: demanda.quantidade_planejada,
    quantidadeRealizada: demanda.quantidade_realizada,
    quantidadeConcluida: demanda.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    status: demanda.status as TurnoSetorDemandaStatusV2,
    iniciadoEm: demanda.iniciado_em,
    encerradoEm: demanda.encerrado_em,
    turnoSetorOpLegacyId: demanda.turno_setor_op_legacy_id,
  }
}

function mapearOpsBase(demandas: TurnoSetorDemandaV2[]): TurnoOpV2[] {
  const opsPorId = new Map<string, TurnoOpV2>()

  for (const demanda of demandas) {
    if (opsPorId.has(demanda.turnoOpId)) {
      continue
    }

    opsPorId.set(demanda.turnoOpId, {
      id: demanda.turnoOpId,
      turnoId: demanda.turnoId,
      numeroOp: demanda.numeroOp,
      produtoId: demanda.produtoId,
      produtoReferencia: demanda.produtoReferencia,
      produtoNome: demanda.produtoNome,
      tpProdutoMin: 0,
      quantidadePlanejada: demanda.quantidadePlanejada,
      quantidadeRealizada: 0,
      quantidadeConcluida: 0,
      progressoOperacionalPct: 0,
      cargaPlanejadaTp: 0,
      cargaRealizadaTp: 0,
      quantidadePlanejadaOriginal: demanda.quantidadePlanejada,
      quantidadePlanejadaRemanescente: Math.max(
        demanda.quantidadePlanejada - demanda.quantidadeRealizada,
        0
      ),
      turnoOpOrigemId: null,
      status: 'planejada',
      iniciadoEm: null,
      encerradoEm: null,
    })
  }

  return [...opsPorId.values()]
}

export async function listarDisponibilidadeSequencialOperacoesComClient(
  supabase: SupabaseClient<Database>,
  turnoSetorOperacaoIds: string[]
): Promise<DisponibilidadeSequencialOperacaoTurnoV2[]> {
  const idsUnicos = Array.from(new Set(turnoSetorOperacaoIds.filter(Boolean)))

  if (idsUnicos.length === 0) {
    return []
  }

  const { data: operacoes, error: operacoesError } = await supabase
    .from('turno_setor_operacoes')
    .select(
      'id, turno_id, turno_op_id, turno_setor_op_id, turno_setor_demanda_id, setor_id, operacao_id, tempo_padrao_min_snapshot, status, quantidade_planejada, quantidade_realizada'
    )
    .in('id', idsUnicos)
    .returns<TurnoSetorOperacaoRow[]>()

  if (operacoesError) {
    throw new Error(
      `Erro ao carregar a disponibilidade sequencial das operações do turno: ${operacoesError.message}`
    )
  }

  if (!operacoes || operacoes.length === 0) {
    return []
  }

  const turnoOpIds = Array.from(new Set(operacoes.map((operacao) => operacao.turno_op_id).filter(Boolean)))
  const turnoIds = Array.from(new Set(operacoes.map((operacao) => operacao.turno_id).filter(Boolean)))
  const { data: turnosRelacionados, error: turnosError } = await supabase
    .from('turnos')
    .select('id, operadores_disponiveis, minutos_turno')
    .in('id', turnoIds)
    .returns<TurnoRow[]>()

  if (turnosError) {
    throw new Error(`Erro ao carregar os turnos relacionados das operações: ${turnosError.message}`)
  }

  const queryDemandas = supabase
    .from('turno_setor_demandas')
    .select(
      `
        id,
        turno_id,
        turno_op_id,
        setor_id,
        turno_setor_op_legacy_id,
        quantidade_planejada,
        quantidade_realizada,
        status,
        iniciado_em,
        encerrado_em,
        setores!inner (
          codigo,
          nome
        ),
        turno_ops!inner (
          numero_op
        )
      `
    )
    .in('turno_op_id', turnoOpIds)

  const { data: demandasRelacionadas, error: demandasError } =
    turnoIds.length === 1
      ? await queryDemandas.eq('turno_id', turnoIds[0]).order('created_at', { ascending: true }).returns<
          TurnoSetorDemandaFluxoRow[]
        >()
      : await queryDemandas.order('created_at', { ascending: true }).returns<TurnoSetorDemandaFluxoRow[]>()

  if (demandasError) {
    throw new Error(
      `Erro ao carregar as demandas relacionadas das operações do turno: ${demandasError.message}`
    )
  }

  const demandasBase = (demandasRelacionadas ?? [])
    .map(mapearDemandaTurno)
    .filter((demanda): demanda is TurnoSetorDemandaV2 => Boolean(demanda))
  const demandasEnriquecidas = enriquecerDemandasComFluxoParalelo(demandasBase)
  const turnosPorId = new Map((turnosRelacionados ?? []).map((turno) => [turno.id, turno]))
  const demandasPorTurno = new Map<string, TurnoSetorDemandaV2[]>()

  for (const demanda of demandasEnriquecidas) {
    const demandasTurno = demandasPorTurno.get(demanda.turnoId) ?? []
    demandasTurno.push(demanda)
    demandasPorTurno.set(demanda.turnoId, demandasTurno)
  }

  const operacoesRelacionadas = operacoes.map(mapearOperacaoApontamento)
  const opsBase = mapearOpsBase(demandasEnriquecidas)
  const demandasCapacidade: TurnoSetorDemandaV2[] = []

  for (const [turnoId, demandasTurno] of demandasPorTurno.entries()) {
    const turno = turnosPorId.get(turnoId)

    if (!turno) {
      demandasCapacidade.push(...demandasTurno)
      continue
    }

    demandasCapacidade.push(
      ...aplicarCapacidadeOperacionalDemandas({
        turno: {
          operadoresDisponiveis: turno.operadores_disponiveis,
          minutosTurno: turno.minutos_turno,
        },
        demandasSetor: demandasTurno,
        operacoesSecao: operacoesRelacionadas.filter((operacao) => operacao.turnoId === turnoId),
        ops: opsBase.filter((op) => op.turnoId === turnoId),
      })
    )
  }

  const demandasPorId = new Map(demandasCapacidade.map((demanda) => [demanda.id, demanda]))
  const demandasPorTurnoOpESetor = new Map(
    demandasCapacidade.map((demanda) => [
      criarChaveDemandaFallback(demanda.turnoOpId, demanda.setorId),
      demanda,
    ])
  )

  return operacoes
    .map((operacao) => {
      const demanda = operacao.turno_setor_demanda_id
        ? demandasPorId.get(operacao.turno_setor_demanda_id) ?? null
        : demandasPorTurnoOpESetor.get(
            criarChaveDemandaFallback(operacao.turno_op_id, operacao.setor_id)
          ) ?? null

      if (!demanda) {
        return null
      }

      const quantidadeDisponivelOperacao = Math.max(
        Math.min(
          operacao.quantidade_planejada,
          demanda.quantidadeRealizada + (demanda.quantidadeAceitaTurno ?? 0)
        ) -
          operacao.quantidade_realizada,
        0
      )
      const turnoSetorDemandaId: string | null =
        operacao.turno_setor_demanda_id ?? demanda.id

      const resultado: DisponibilidadeSequencialOperacaoTurnoV2 = {
        turnoSetorOperacaoId: operacao.id,
        turnoOpId: operacao.turno_op_id,
        turnoSetorDemandaId,
        numeroOp: demanda.numeroOp,
        etapaFluxoChave: demanda.etapaFluxoChave,
        setorId: demanda.setorId,
        setorCodigo: demanda.setorCodigo,
        setorNome: demanda.setorNome,
        setorAnteriorNome: demanda.setorAnteriorNome ?? null,
        quantidadePlanejadaOperacao: operacao.quantidade_planejada,
        quantidadeRealizadaOperacao: operacao.quantidade_realizada,
        quantidadePlanejadaDemanda: demanda.quantidadePlanejada,
        quantidadeRealizadaDemanda: demanda.quantidadeRealizada,
        quantidadeLiberadaSetor: demanda.quantidadeLiberadaSetor ?? 0,
        quantidadeDisponivelApontamento: demanda.quantidadeDisponivelApontamento ?? 0,
        quantidadeSincronizadaMontagem: demanda.quantidadeSincronizadaMontagem ?? 0,
        quantidadeBloqueadaSincronizacao:
          demanda.quantidadeBloqueadaSincronizacao ?? 0,
        quantidadeDisponivelOperacao,
      }

      return resultado
    })
    .filter(
      (operacao): operacao is DisponibilidadeSequencialOperacaoTurnoV2 => Boolean(operacao)
    )
}
