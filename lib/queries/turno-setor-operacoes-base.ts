import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/supabase'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'

type TurnoSetorOperacaoRow = Tables<'turno_setor_operacoes'>
type OperacaoResumoRow = Pick<Tables<'operacoes'>, 'id' | 'codigo' | 'descricao' | 'tipo_maquina_codigo'>

function mapearOperacoesSecao(
  operacoesSecao: TurnoSetorOperacaoRow[],
  operacoes: OperacaoResumoRow[]
): TurnoSetorOperacaoApontamentoV2[] {
  const operacoesPorId = new Map((operacoes ?? []).map((operacao) => [operacao.id, operacao]))

  return operacoesSecao
    .map((operacaoSecao) => {
      const operacao = operacoesPorId.get(operacaoSecao.operacao_id)

      if (!operacao) {
        return null
      }

      return {
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
        tipoMaquinaCodigo: operacao.tipo_maquina_codigo,
      }
    })
    .filter((operacao): operacao is TurnoSetorOperacaoApontamentoV2 => Boolean(operacao))
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
    .select('id, codigo, descricao, tipo_maquina_codigo')
    .in('id', operacaoIds)
    .returns<OperacaoResumoRow[]>()

  if (operacoesError) {
    throw new Error(`Erro ao carregar o cadastro das operações do turno: ${operacoesError.message}`)
  }

  return mapearOperacoesSecao(operacoesSecao ?? [], operacoes ?? [])
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
