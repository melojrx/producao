import type { SupabaseClient } from '@supabase/supabase-js'
import { validarConsumoSaldoFisicoOperacao } from '@/lib/utils/saldo-fisico-op'
import type { Database, Tables } from '@/types/supabase'

type TurnoSetorOperacaoSaldoRow = Pick<
  Tables<'turno_setor_operacoes'>,
  | 'id'
  | 'turno_op_id'
  | 'turno_setor_demanda_id'
  | 'operacao_id'
  | 'quantidade_planejada'
  | 'quantidade_realizada'
>

type TurnoOpSaldoRow = Pick<
  Tables<'turno_ops'>,
  'id' | 'numero_op' | 'turno_op_origem_id'
>

type RegistroProducaoSaldoRow = Pick<Tables<'registros_producao'>, 'quantidade'>

type TurnoSetorDemandaSaldoRow = Pick<
  Tables<'turno_setor_demandas'>,
  'quantidade_herdada_setor'
>

export interface ConsumoSaldoFisicoOperacaoInput {
  turnoSetorOperacaoId: string
  quantidadeSolicitada: number
}

interface SaldoFisicoOperacaoContexto {
  numeroOp: string
  quantidadePlanejadaOp: number
  quantidadeProduzidaAcumuladaOperacao: number
  quantidadeRealizadaTurnoOperacao: number
}

function agregarQuantidadePorOperacao(
  lancamentos: ConsumoSaldoFisicoOperacaoInput[]
): ConsumoSaldoFisicoOperacaoInput[] {
  const quantidadePorOperacao = new Map<string, number>()

  for (const lancamento of lancamentos) {
    quantidadePorOperacao.set(
      lancamento.turnoSetorOperacaoId,
      (quantidadePorOperacao.get(lancamento.turnoSetorOperacaoId) ?? 0) +
        lancamento.quantidadeSolicitada
    )
  }

  return [...quantidadePorOperacao.entries()].map(
    ([turnoSetorOperacaoId, quantidadeSolicitada]) => ({
      turnoSetorOperacaoId,
      quantidadeSolicitada,
    })
  )
}

async function buscarContextoSaldoFisicoOperacao(
  supabase: SupabaseClient<Database>,
  turnoSetorOperacaoId: string
): Promise<{ contexto?: SaldoFisicoOperacaoContexto; erro?: string }> {
  const { data: operacao, error: operacaoError } = await supabase
    .from('turno_setor_operacoes')
    .select(
      'id, turno_op_id, turno_setor_demanda_id, operacao_id, quantidade_planejada, quantidade_realizada'
    )
    .eq('id', turnoSetorOperacaoId)
    .maybeSingle<TurnoSetorOperacaoSaldoRow>()

  if (operacaoError) {
    return {
      erro: `Erro ao validar saldo físico da operação: ${operacaoError.message}`,
    }
  }

  if (!operacao) {
    return { erro: 'A operação selecionada não foi encontrada para validar saldo físico da OP.' }
  }

  const { data: turnoOp, error: turnoOpError } = await supabase
    .from('turno_ops')
    .select('id, numero_op, turno_op_origem_id')
    .eq('id', operacao.turno_op_id)
    .maybeSingle<TurnoOpSaldoRow>()

  if (turnoOpError) {
    return {
      erro: `Erro ao validar a OP da operação: ${turnoOpError.message}`,
    }
  }

  if (!turnoOp) {
    return { erro: 'A OP da operação selecionada não foi encontrada.' }
  }

  const turnoOpRaizId = turnoOp.turno_op_origem_id ?? turnoOp.id
  const { data: opsRelacionadas, error: opsRelacionadasError } = await supabase
    .from('turno_ops')
    .select('id, numero_op, turno_op_origem_id')
    .or(`id.eq.${turnoOpRaizId},turno_op_origem_id.eq.${turnoOpRaizId}`)
    .returns<TurnoOpSaldoRow[]>()

  if (opsRelacionadasError) {
    return {
      erro: `Erro ao validar a linhagem física da OP: ${opsRelacionadasError.message}`,
    }
  }

  const turnoOpIds = Array.from(
    new Set([turnoOp.id, turnoOpRaizId, ...(opsRelacionadas ?? []).map((op) => op.id)])
  )
  const { data: registros, error: registrosError } = await supabase
    .from('registros_producao')
    .select('quantidade')
    .eq('operacao_id', operacao.operacao_id)
    .in('turno_op_id', turnoOpIds)
    .returns<RegistroProducaoSaldoRow[]>()

  if (registrosError) {
    return {
      erro: `Erro ao consolidar produção física acumulada da OP: ${registrosError.message}`,
    }
  }

  const quantidadeRegistradaNaLinhagem = (registros ?? []).reduce(
    (soma, registro) => soma + registro.quantidade,
    0
  )
  const quantidadeHerdadaSetor = await buscarQuantidadeHerdadaSetor(
    supabase,
    operacao.turno_setor_demanda_id
  )
  const quantidadeHerdadaMaisTurnoAtual =
    quantidadeHerdadaSetor + operacao.quantidade_realizada

  return {
    contexto: {
      numeroOp: turnoOp.numero_op,
      quantidadePlanejadaOp: operacao.quantidade_planejada,
      quantidadeProduzidaAcumuladaOperacao: Math.max(
        quantidadeRegistradaNaLinhagem,
        quantidadeHerdadaMaisTurnoAtual
      ),
      quantidadeRealizadaTurnoOperacao: operacao.quantidade_realizada,
    },
  }
}

async function buscarQuantidadeHerdadaSetor(
  supabase: SupabaseClient<Database>,
  turnoSetorDemandaId: string | null
): Promise<number> {
  if (!turnoSetorDemandaId) {
    return 0
  }

  const { data } = await supabase
    .from('turno_setor_demandas')
    .select('quantidade_herdada_setor')
    .eq('id', turnoSetorDemandaId)
    .maybeSingle<TurnoSetorDemandaSaldoRow>()

  return data?.quantidade_herdada_setor ?? 0
}

export async function validarConsumoSaldoFisicoOperacoesComClient(
  supabase: SupabaseClient<Database>,
  lancamentos: ConsumoSaldoFisicoOperacaoInput[]
): Promise<{ erro?: string }> {
  for (const lancamento of agregarQuantidadePorOperacao(lancamentos)) {
    const { contexto, erro } = await buscarContextoSaldoFisicoOperacao(
      supabase,
      lancamento.turnoSetorOperacaoId
    )

    if (erro || !contexto) {
      return { erro: erro ?? 'Não foi possível validar o saldo físico da OP.' }
    }

    const validacao = validarConsumoSaldoFisicoOperacao({
      ...contexto,
      quantidadeSolicitada: lancamento.quantidadeSolicitada,
    })

    if (!validacao.permitido) {
      return { erro: validacao.mensagem ?? 'A OP não possui saldo físico para esta operação.' }
    }
  }

  return {}
}
