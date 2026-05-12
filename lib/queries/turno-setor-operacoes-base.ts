import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularSaldoFisicoRestanteOperacao } from '@/lib/utils/saldo-fisico-op'
import type { Database, Tables } from '@/types/supabase'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'

type TurnoSetorOperacaoRow = Tables<'turno_setor_operacoes'>
type OperacaoResumoRow = Pick<Tables<'operacoes'>, 'id' | 'codigo' | 'descricao' | 'maquina_id'>
type MaquinaResumoRow = Pick<Tables<'maquinas'>, 'id' | 'codigo' | 'modelo'>
type TurnoOpRelacaoRow = Pick<Tables<'turno_ops'>, 'id' | 'turno_op_origem_id'>
type RegistroProducaoOperacaoRow = Pick<
  Tables<'registros_producao'>,
  'turno_op_id' | 'operacao_id' | 'quantidade'
>
type DemandaHerdadaRow = Pick<Tables<'turno_setor_demandas'>, 'id' | 'quantidade_herdada_setor'>

interface SaldoFisicoOperacaoSnapshot {
  quantidadeConsumidaFisica: number
  saldoFisicoRestante: number
}

function mapearOperacoesSecao(
  operacoesSecao: TurnoSetorOperacaoRow[],
  operacoes: OperacaoResumoRow[],
  maquinas: MaquinaResumoRow[],
  saldoFisicoPorOperacaoId: Map<string, SaldoFisicoOperacaoSnapshot>
): TurnoSetorOperacaoApontamentoV2[] {
  const operacoesPorId = new Map((operacoes ?? []).map((operacao) => [operacao.id, operacao]))
  const maquinasPorId = new Map((maquinas ?? []).map((maquina) => [maquina.id, maquina]))

  return operacoesSecao
    .map((operacaoSecao) => {
      const operacao = operacoesPorId.get(operacaoSecao.operacao_id)

      if (!operacao) {
        return null
      }

      const maquina = operacao.maquina_id ? maquinasPorId.get(operacao.maquina_id) ?? null : null
      const saldoFisico = saldoFisicoPorOperacaoId.get(operacaoSecao.id)

      const operacaoMapeada: TurnoSetorOperacaoApontamentoV2 = {
        id: operacaoSecao.id,
        turnoId: operacaoSecao.turno_id,
        turnoOpId: operacaoSecao.turno_op_id,
        turnoSetorOpId: operacaoSecao.turno_setor_op_id,
        turnoSetorId: operacaoSecao.turno_setor_id,
        turnoSetorDemandaId: operacaoSecao.turno_setor_demanda_id,
        produtoOperacaoId: operacaoSecao.produto_operacao_id,
        operacaoId: operacaoSecao.operacao_id,
        setorId: operacaoSecao.setor_id,
        sequencia: operacaoSecao.sequencia,
        tempoPadraoMinSnapshot: operacaoSecao.tempo_padrao_min_snapshot,
        quantidadePlanejada: operacaoSecao.quantidade_planejada,
        quantidadeRealizada: operacaoSecao.quantidade_realizada,
        status: operacaoSecao.status as TurnoSetorOperacaoApontamentoV2['status'],
        iniciadoEm: operacaoSecao.iniciado_em,
        encerradoEm: operacaoSecao.encerrado_em,
        operacaoCodigo: operacao.codigo,
        operacaoDescricao: operacao.descricao,
        maquinaCodigo: maquina?.codigo ?? null,
        maquinaModelo: maquina?.modelo ?? null,
      }

      if (saldoFisico) {
        operacaoMapeada.quantidadeConsumidaFisica = saldoFisico.quantidadeConsumidaFisica
        operacaoMapeada.saldoFisicoRestante = saldoFisico.saldoFisicoRestante
      }

      return operacaoMapeada
    })
    .filter((operacao): operacao is TurnoSetorOperacaoApontamentoV2 => Boolean(operacao))
}

async function carregarSaldoFisicoOperacoes(
  supabase: SupabaseClient<Database>,
  operacoesSecao: TurnoSetorOperacaoRow[]
): Promise<Map<string, SaldoFisicoOperacaoSnapshot>> {
  if (operacoesSecao.length === 0) {
    return new Map()
  }

  const turnoOpIds = Array.from(new Set(operacoesSecao.map((operacao) => operacao.turno_op_id)))
  const { data: turnoOps, error: turnoOpsError } = await supabase
    .from('turno_ops')
    .select('id, turno_op_origem_id')
    .in('id', turnoOpIds)
    .returns<TurnoOpRelacaoRow[]>()

  if (turnoOpsError) {
    throw new Error(`Erro ao carregar linhagem física das OPs: ${turnoOpsError.message}`)
  }

  const raizPorTurnoOpId = new Map(
    (turnoOps ?? []).map((turnoOp) => [
      turnoOp.id,
      turnoOp.turno_op_origem_id ?? turnoOp.id,
    ] as const)
  )
  const raizIds = Array.from(new Set(raizPorTurnoOpId.values()))
  const { data: filhos, error: filhosError } = raizIds.length
    ? await supabase
        .from('turno_ops')
        .select('id, turno_op_origem_id')
        .in('turno_op_origem_id', raizIds)
        .returns<TurnoOpRelacaoRow[]>()
    : { data: [], error: null }

  if (filhosError) {
    throw new Error(`Erro ao carregar continuações físicas das OPs: ${filhosError.message}`)
  }

  const turnoOpIdsPorRaiz = new Map<string, Set<string>>()

  for (const raizId of raizIds) {
    turnoOpIdsPorRaiz.set(raizId, new Set([raizId]))
  }

  for (const filho of filhos ?? []) {
    if (!filho.turno_op_origem_id) {
      continue
    }

    const idsDaRaiz = turnoOpIdsPorRaiz.get(filho.turno_op_origem_id) ?? new Set<string>()
    idsDaRaiz.add(filho.id)
    turnoOpIdsPorRaiz.set(filho.turno_op_origem_id, idsDaRaiz)
  }

  const todosTurnoOpIdsRelacionados = Array.from(
    new Set([...turnoOpIdsPorRaiz.values()].flatMap((ids) => [...ids]))
  )
  const operacaoIds = Array.from(new Set(operacoesSecao.map((operacao) => operacao.operacao_id)))
  const { data: registros, error: registrosError } =
    todosTurnoOpIdsRelacionados.length > 0 && operacaoIds.length > 0
      ? await supabase
          .from('registros_producao')
          .select('turno_op_id, operacao_id, quantidade')
          .in('turno_op_id', todosTurnoOpIdsRelacionados)
          .in('operacao_id', operacaoIds)
          .returns<RegistroProducaoOperacaoRow[]>()
      : { data: [], error: null }

  if (registrosError) {
    throw new Error(`Erro ao consolidar saldo físico das operações: ${registrosError.message}`)
  }

  const demandaIds = Array.from(
    new Set(
      operacoesSecao
        .map((operacao) => operacao.turno_setor_demanda_id)
        .filter((demandaId): demandaId is string => Boolean(demandaId))
    )
  )
  const { data: demandas, error: demandasError } = demandaIds.length
    ? await supabase
        .from('turno_setor_demandas')
        .select('id, quantidade_herdada_setor')
        .in('id', demandaIds)
        .returns<DemandaHerdadaRow[]>()
    : { data: [], error: null }

  if (demandasError) {
    throw new Error(`Erro ao carregar progresso herdado das demandas: ${demandasError.message}`)
  }

  const quantidadeHerdadaPorDemandaId = new Map(
    (demandas ?? []).map((demanda) => [demanda.id, demanda.quantidade_herdada_setor] as const)
  )
  const saldoFisicoPorOperacaoId = new Map<string, SaldoFisicoOperacaoSnapshot>()

  for (const operacao of operacoesSecao) {
    const raizId = raizPorTurnoOpId.get(operacao.turno_op_id) ?? operacao.turno_op_id
    const turnoOpIdsDaRaiz = turnoOpIdsPorRaiz.get(raizId) ?? new Set([operacao.turno_op_id])
    const quantidadeRegistrada = (registros ?? []).reduce((soma, registro) => {
      if (
        registro.operacao_id !== operacao.operacao_id ||
        !registro.turno_op_id ||
        !turnoOpIdsDaRaiz.has(registro.turno_op_id)
      ) {
        return soma
      }

      return soma + registro.quantidade
    }, 0)
    const quantidadeHerdada =
      operacao.turno_setor_demanda_id
        ? quantidadeHerdadaPorDemandaId.get(operacao.turno_setor_demanda_id) ?? 0
        : 0
    const quantidadeConsumidaFisica = Math.max(
      quantidadeRegistrada,
      quantidadeHerdada + operacao.quantidade_realizada
    )

    saldoFisicoPorOperacaoId.set(operacao.id, {
      quantidadeConsumidaFisica,
      saldoFisicoRestante: calcularSaldoFisicoRestanteOperacao({
        quantidadePlanejadaOp: operacao.quantidade_planejada,
        quantidadeProduzidaAcumuladaOperacao: quantidadeConsumidaFisica,
        quantidadeRealizadaTurnoOperacao: operacao.quantidade_realizada,
      }),
    })
  }

  return saldoFisicoPorOperacaoId
}

async function listarOperacoesBase(
  supabase: SupabaseClient<Database>,
  coluna: 'turno_id' | 'turno_setor_op_id' | 'turno_setor_demanda_id',
  valor: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const { data: operacoesSecao, error: operacoesSecaoError } = await supabase
    .from('turno_setor_operacoes')
    .select(
      'id, turno_id, turno_op_id, turno_setor_op_id, turno_setor_id, turno_setor_demanda_id, produto_operacao_id, operacao_id, setor_id, sequencia, tempo_padrao_min_snapshot, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em'
    )
    .eq(coluna, valor)
    .order('turno_setor_op_id', { ascending: true })
    .order('sequencia', { ascending: true })
    .returns<TurnoSetorOperacaoRow[]>()

  if (operacoesSecaoError) {
    throw new Error(
      `Erro ao listar operações derivadas do turno para apontamento: ${operacoesSecaoError.message}`
    )
  }

  const operacaoIds = Array.from(
    new Set((operacoesSecao ?? []).map((operacao) => operacao.operacao_id).filter(Boolean))
  )

  if (operacaoIds.length === 0) {
    return []
  }

  const { data: operacoes, error: operacoesError } = await supabase
    .from('operacoes')
    .select('id, codigo, descricao, maquina_id')
    .in('id', operacaoIds)
    .returns<OperacaoResumoRow[]>()

  if (operacoesError) {
    throw new Error(`Erro ao carregar o cadastro das operações do turno: ${operacoesError.message}`)
  }

  const maquinaIds = Array.from(
    new Set(
      (operacoes ?? [])
        .map((operacao) => operacao.maquina_id)
        .filter((maquinaId): maquinaId is string => Boolean(maquinaId))
    )
  )

  const { data: maquinas, error: maquinasError } = maquinaIds.length
    ? await supabase
        .from('maquinas')
        .select('id, codigo, modelo')
        .in('id', maquinaIds)
        .returns<MaquinaResumoRow[]>()
    : { data: [], error: null }

  if (maquinasError) {
    throw new Error(`Erro ao carregar as máquinas das operações do turno: ${maquinasError.message}`)
  }

  const saldoFisicoPorOperacaoId = await carregarSaldoFisicoOperacoes(
    supabase,
    operacoesSecao ?? []
  )

  return mapearOperacoesSecao(
    operacoesSecao ?? [],
    operacoes ?? [],
    maquinas ?? [],
    saldoFisicoPorOperacaoId
  )
}

export async function listarTurnoSetorOperacoesDoTurnoComClient(
  supabase: SupabaseClient<Database>,
  turnoId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  return listarOperacoesBase(supabase, 'turno_id', turnoId)
}

export async function listarTurnoSetorOperacoesPorSecaoComClient(
  supabase: SupabaseClient<Database>,
  turnoSetorOpId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  return listarOperacoesBase(supabase, 'turno_setor_op_id', turnoSetorOpId)
}

export async function listarTurnoSetorOperacoesPorDemandaComClient(
  supabase: SupabaseClient<Database>,
  turnoSetorDemandaId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  return listarOperacoesBase(supabase, 'turno_setor_demanda_id', turnoSetorDemandaId)
}
