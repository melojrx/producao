'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type { MaquinaStatus, OperadorStatus } from '@/types'

export interface RegistrarProducaoInput {
  operadorId: string
  maquinaId: string
  operacaoId: string
  quantidade: number
}

export interface RegistrarProducaoResultado {
  sucesso: boolean
  erro?: string
}

interface OperadorValidacaoRow {
  id: string
  status: OperadorStatus | null
}

interface MaquinaValidacaoRow {
  id: string
  status: MaquinaStatus | null
}

interface OperacaoValidacaoRow {
  id: string
  ativa: boolean | null
}

interface ConfiguracaoTurnoHojeRow {
  id: string
}

interface BlocoTurnoAtivoRow {
  id: string
  produto_id: string | null
}

function quantidadeValida(quantidade: number): boolean {
  return Number.isInteger(quantidade) && quantidade >= 1
}

export async function registrarProducao(
  input: RegistrarProducaoInput
): Promise<RegistrarProducaoResultado> {
  if (!quantidadeValida(input.quantidade)) {
    return { sucesso: false, erro: 'A quantidade deve ser um número inteiro maior ou igual a 1.' }
  }

  const supabase = createAdminClient()

  const [
    { data: operador, error: operadorError },
    { data: maquina, error: maquinaError },
    { data: operacao, error: operacaoError },
    { data: configuracaoTurno, error: configuracaoError },
  ] = await Promise.all([
    supabase
      .from('operadores')
      .select('id, status')
      .eq('id', input.operadorId)
      .single<OperadorValidacaoRow>(),
    supabase
      .from('maquinas')
      .select('id, status')
      .eq('id', input.maquinaId)
      .single<MaquinaValidacaoRow>(),
    supabase
      .from('operacoes')
      .select('id, ativa')
      .eq('id', input.operacaoId)
      .single<OperacaoValidacaoRow>(),
    supabase
      .from('configuracao_turno')
      .select('id')
      .eq('data', obterDataHojeLocal())
      .maybeSingle<ConfiguracaoTurnoHojeRow>(),
  ])

  if (operadorError || !operador || operador.status !== 'ativo') {
    return { sucesso: false, erro: 'Operador inválido ou inativo para registro de produção.' }
  }

  if (maquinaError || !maquina || !maquina.status) {
    return { sucesso: false, erro: 'Máquina não encontrada para registro de produção.' }
  }

  if (maquina.status === 'manutencao') {
    return { sucesso: false, erro: 'Máquina em manutenção. Não é possível registrar produção.' }
  }

  if (maquina.status !== 'ativa') {
    return { sucesso: false, erro: 'Máquina parada. Ative a máquina antes de registrar produção.' }
  }

  if (operacaoError || !operacao || operacao.ativa !== true) {
    return { sucesso: false, erro: 'Operação inválida ou inativa para registro de produção.' }
  }

  if (configuracaoError) {
    return { sucesso: false, erro: `Erro ao buscar configuração do turno: ${configuracaoError.message}` }
  }

  if (!configuracaoTurno) {
    return {
      sucesso: false,
      erro: 'Configuração do turno de hoje não encontrada. Solicite o preenchimento ao supervisor.',
    }
  }

  const { data: blocoAtivo, error: blocoAtivoError } = await supabase
    .from('configuracao_turno_blocos')
    .select('id, produto_id')
    .eq('configuracao_turno_id', configuracaoTurno.id)
    .eq('status', 'ativo')
    .maybeSingle<BlocoTurnoAtivoRow>()

  if (blocoAtivoError) {
    return {
      sucesso: false,
      erro: `Erro ao buscar bloco ativo do turno: ${blocoAtivoError.message}`,
    }
  }

  if (!blocoAtivo) {
    return {
      sucesso: false,
      erro: 'Nenhum bloco de produção está ativo para hoje. Solicite o ajuste ao supervisor.',
    }
  }

  const { error: insertError } = await supabase.from('registros_producao').insert({
    operador_id: input.operadorId,
    maquina_id: input.maquinaId,
    operacao_id: input.operacaoId,
    produto_id: blocoAtivo.produto_id,
    configuracao_turno_bloco_id: blocoAtivo.id,
    quantidade: input.quantidade,
  })

  if (insertError) {
    return { sucesso: false, erro: `Erro ao registrar produção: ${insertError.message}` }
  }

  revalidatePath('/scanner')
  revalidatePath('/admin/dashboard')

  return { sucesso: true }
}
