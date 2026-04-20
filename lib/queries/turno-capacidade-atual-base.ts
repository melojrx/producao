import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tables } from '@/types/supabase'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'

type RegistroProducaoCapacidadeAtualRow = Pick<
  Tables<'registros_producao'>,
  'turno_setor_operacao_id' | 'turno_setor_op_id' | 'operacao_id' | 'quantidade'
>

function criarChaveFallbackOperacao(turnoSetorOpId: string, operacaoId: string): string {
  return `${turnoSetorOpId}:${operacaoId}`
}

export async function listarQuantidadeRealizadaAtualPorOperacaoDoTurnoComClient(
  supabase: SupabaseClient<Database>,
  operacoesSecao: Pick<TurnoSetorOperacaoApontamentoV2, 'id' | 'turnoSetorOpId' | 'operacaoId'>[]
): Promise<Map<string, number>> {
  const operacaoIds = Array.from(
    new Set(operacoesSecao.map((operacao) => operacao.id).filter(Boolean))
  )
  const secoesIds = Array.from(
    new Set(operacoesSecao.map((operacao) => operacao.turnoSetorOpId).filter(Boolean))
  )

  if (operacaoIds.length === 0 || secoesIds.length === 0) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('registros_producao')
    .select('turno_setor_operacao_id, turno_setor_op_id, operacao_id, quantidade')
    .in('turno_setor_op_id', secoesIds)
    .not('turno_setor_op_id', 'is', null)
    .returns<RegistroProducaoCapacidadeAtualRow[]>()

  if (error) {
    throw new Error(
      `Erro ao carregar a produção atual do turno para capacidade setorial: ${error.message}`
    )
  }

  const operacoesPorId = new Set(operacaoIds)
  const operacoesPorSecaoEOperacao = new Map(
    operacoesSecao.map((operacao) => [
      criarChaveFallbackOperacao(operacao.turnoSetorOpId, operacao.operacaoId),
      operacao.id,
    ] as const)
  )
  const quantidadePorOperacaoId = new Map<string, number>()

  for (const registro of data ?? []) {
    const quantidade =
      Number.isFinite(registro.quantidade) && registro.quantidade > 0 ? registro.quantidade : 0

    if (quantidade <= 0) {
      continue
    }

    const operacaoIdDireta =
      registro.turno_setor_operacao_id && operacoesPorId.has(registro.turno_setor_operacao_id)
        ? registro.turno_setor_operacao_id
        : null

    const operacaoIdFallback =
      !operacaoIdDireta && registro.turno_setor_op_id && registro.operacao_id
        ? operacoesPorSecaoEOperacao.get(
            criarChaveFallbackOperacao(registro.turno_setor_op_id, registro.operacao_id)
          ) ?? null
        : null

    const operacaoId = operacaoIdDireta ?? operacaoIdFallback

    if (!operacaoId) {
      continue
    }

    quantidadePorOperacaoId.set(
      operacaoId,
      (quantidadePorOperacaoId.get(operacaoId) ?? 0) + quantidade
    )
  }

  return quantidadePorOperacaoId
}
