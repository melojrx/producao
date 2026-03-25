'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterDataHojeLocal } from '@/lib/utils/data'
import { calcularMetaGrupo, calcularTpProduto } from '@/lib/utils/producao'
import type { FormActionState } from '@/types'
import type { Tables } from '@/types/supabase'

export interface SalvarConfiguracaoTurnoInput {
  funcionariosAtivos: number
  minutosTurno: number
  produtoId: string
}

export interface SalvarConfiguracaoTurnoResultado {
  sucesso: boolean
  metaGrupo: number
  erro?: string
}

export interface ConfiguracaoTurnoActionState extends FormActionState {
  metaGrupo?: number
}

interface ProdutoValidacaoRow {
  id: string
  ativo: boolean | null
}

type ProdutoOperacaoRow = Pick<Tables<'produto_operacoes'>, 'operacao_id'>
type OperacaoTempoRow = Pick<Tables<'operacoes'>, 'id' | 'tempo_padrao_min'>

function inteiroPositivo(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0
}

function obterInteiro(formData: FormData, campo: string): number {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return Number.NaN
  }

  return Number.parseInt(valor, 10)
}

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

async function carregarOperacoesDoProduto(
  produtoId: string
): Promise<{ erro?: string; operacoes?: OperacaoTempoRow[] }> {
  const supabase = createAdminClient()

  const [
    { data: produto, error: produtoError },
    { data: roteiro, error: roteiroError },
  ] = await Promise.all([
    supabase.from('produtos').select('id, ativo').eq('id', produtoId).single<ProdutoValidacaoRow>(),
    supabase.from('produto_operacoes').select('operacao_id').eq('produto_id', produtoId),
  ])

  if (produtoError || !produto) {
    return { erro: 'Produto do dia não encontrado.' }
  }

  if (produto.ativo !== true) {
    return { erro: 'Produto do dia está inativo e não pode ser usado na configuração do turno.' }
  }

  if (roteiroError) {
    return { erro: `Erro ao carregar roteiro do produto: ${roteiroError.message}` }
  }

  const operacaoIds = (roteiro ?? [])
    .map((item) => item.operacao_id)
    .filter((operacaoId): operacaoId is string => Boolean(operacaoId))

  if (operacaoIds.length === 0) {
    return { erro: 'O produto selecionado não possui roteiro configurado.' }
  }

  const { data: operacoes, error: operacoesError } = await supabase
    .from('operacoes')
    .select('id, tempo_padrao_min')
    .in('id', operacaoIds)
    .returns<OperacaoTempoRow[]>()

  if (operacoesError) {
    return { erro: `Erro ao carregar operações do roteiro: ${operacoesError.message}` }
  }

  if (!operacoes || operacoes.length !== operacaoIds.length) {
    return { erro: 'O roteiro do produto possui operações inválidas ou incompletas.' }
  }

  return { operacoes }
}

export async function salvarConfiguracaoTurno(
  input: SalvarConfiguracaoTurnoInput
): Promise<SalvarConfiguracaoTurnoResultado> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return {
      sucesso: false,
      metaGrupo: 0,
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
    }
  }

  if (
    !inteiroPositivo(input.funcionariosAtivos) ||
    !inteiroPositivo(input.minutosTurno) ||
    !input.produtoId
  ) {
    return {
      sucesso: false,
      metaGrupo: 0,
      erro: 'Funcionários ativos, minutos do turno e produto do dia são obrigatórios.',
    }
  }

  const { operacoes, erro } = await carregarOperacoesDoProduto(input.produtoId)

  if (erro || !operacoes) {
    return { sucesso: false, metaGrupo: 0, erro: erro ?? 'Não foi possível calcular a meta do grupo.' }
  }

  const tpProduto = calcularTpProduto(
    operacoes.map((operacao) => ({ tempoPadraoMin: operacao.tempo_padrao_min }))
  )
  const metaGrupo = calcularMetaGrupo(input.funcionariosAtivos, input.minutosTurno, tpProduto)

  const supabase = createAdminClient()
  const { error: upsertError } = await supabase.from('configuracao_turno').upsert(
    {
      data: obterDataHojeLocal(),
      funcionarios_ativos: input.funcionariosAtivos,
      minutos_turno: input.minutosTurno,
      produto_id: input.produtoId,
      tp_produto_min: tpProduto,
      meta_grupo: metaGrupo,
    },
    {
      onConflict: 'data',
    }
  )

  if (upsertError) {
    return {
      sucesso: false,
      metaGrupo: 0,
      erro: `Erro ao salvar configuração do turno: ${upsertError.message}`,
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/scanner')

  return { sucesso: true, metaGrupo }
}

export async function salvarConfiguracaoTurnoFormulario(
  _prevState: ConfiguracaoTurnoActionState,
  formData: FormData
): Promise<ConfiguracaoTurnoActionState> {
  const resultado = await salvarConfiguracaoTurno({
    funcionariosAtivos: obterInteiro(formData, 'funcionarios_ativos'),
    minutosTurno: obterInteiro(formData, 'minutos_turno'),
    produtoId: obterTexto(formData, 'produto_id'),
  })

  if (!resultado.sucesso) {
    return {
      sucesso: false,
      erro: resultado.erro,
      metaGrupo: resultado.metaGrupo,
    }
  }

  return {
    sucesso: true,
    metaGrupo: resultado.metaGrupo,
  }
}
