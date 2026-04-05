'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  normalizarCompetenciaMensal,
  obterCompetenciaMesAtual,
  obterDiasDaCompetencia,
} from '@/lib/utils/data'
import type { MetaMensal, MetaMensalActionState } from '@/types'
import type { Tables } from '@/types/supabase'

type MetaMensalRow = Tables<'metas_mensais'>

export interface SalvarMetaMensalInput {
  competencia: string
  metaPecas: number
  diasProdutivos: number
  observacao?: string
}

export interface EditarMetaMensalInput extends SalvarMetaMensalInput {
  id: string
}

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterInteiro(formData: FormData, campo: string): number {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return Number.NaN
  }

  return Number.parseInt(valor, 10)
}

function inteiroPositivo(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0
}

function mapearMetaMensal(metaMensal: MetaMensalRow): MetaMensal {
  return {
    id: metaMensal.id,
    competencia: metaMensal.competencia,
    metaPecas: metaMensal.meta_pecas,
    diasProdutivos: metaMensal.dias_produtivos,
    observacao: metaMensal.observacao,
    createdAt: metaMensal.created_at,
    updatedAt: metaMensal.updated_at,
  }
}

async function validarSessaoAdmin(): Promise<MetaMensalActionState | null> {
  try {
    await requireAdminUser({ redirectOnFail: false })
    return null
  } catch (error) {
    return {
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
      sucesso: false,
    }
  }
}

function validarInput(input: SalvarMetaMensalInput): { erro?: string; competencia?: string } {
  const competencia =
    normalizarCompetenciaMensal(input.competencia) ?? normalizarCompetenciaMensal(obterCompetenciaMesAtual())

  if (!competencia) {
    return { erro: 'Competência mensal inválida.' }
  }

  if (!inteiroPositivo(input.metaPecas)) {
    return { erro: 'A meta mensal deve ser um número inteiro maior que zero.' }
  }

  if (!inteiroPositivo(input.diasProdutivos)) {
    return { erro: 'Os dias produtivos devem ser um número inteiro maior que zero.' }
  }

  const diasDaCompetencia = obterDiasDaCompetencia(competencia)
  if (input.diasProdutivos > diasDaCompetencia) {
    return {
      erro: `Os dias produtivos não podem ultrapassar ${diasDaCompetencia} dias nesta competência.`,
    }
  }

  return { competencia }
}

export async function criarMetaMensal(
  input: SalvarMetaMensalInput
): Promise<MetaMensalActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const validacao = validarInput(input)
  if (validacao.erro || !validacao.competencia) {
    return { erro: validacao.erro, sucesso: false }
  }

  const observacao = input.observacao?.trim() ? input.observacao.trim() : null
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('metas_mensais')
    .insert({
      competencia: validacao.competencia,
      meta_pecas: input.metaPecas,
      dias_produtivos: input.diasProdutivos,
      observacao,
    })
    .select('*')
    .single<MetaMensalRow>()

  if (error || !data) {
    if (error?.code === '23505') {
      return {
        erro: 'Já existe uma meta mensal cadastrada para esta competência.',
        sucesso: false,
      }
    }

    return {
      erro: `Erro ao cadastrar meta mensal: ${error?.message ?? 'erro desconhecido'}`,
      sucesso: false,
    }
  }

  revalidatePath('/admin/dashboard')

  return {
    sucesso: true,
    metaMensal: mapearMetaMensal(data),
  }
}

export async function criarMetaMensalFormulario(
  _prevState: MetaMensalActionState,
  formData: FormData
): Promise<MetaMensalActionState> {
  return criarMetaMensal({
    competencia: obterTexto(formData, 'competencia'),
    metaPecas: obterInteiro(formData, 'meta_pecas'),
    diasProdutivos: obterInteiro(formData, 'dias_produtivos'),
    observacao: obterTexto(formData, 'observacao'),
  })
}

export async function editarMetaMensal(
  input: EditarMetaMensalInput
): Promise<MetaMensalActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  if (!input.id) {
    return {
      erro: 'Meta mensal inválida para edição.',
      sucesso: false,
    }
  }

  const validacao = validarInput(input)
  if (validacao.erro || !validacao.competencia) {
    return { erro: validacao.erro, sucesso: false }
  }

  const observacao = input.observacao?.trim() ? input.observacao.trim() : null
  const supabase = createAdminClient()

  const { data: metaAtual, error: metaAtualError } = await supabase
    .from('metas_mensais')
    .select('*')
    .eq('id', input.id)
    .maybeSingle<MetaMensalRow>()

  if (metaAtualError) {
    return {
      erro: `Erro ao carregar meta mensal para edição: ${metaAtualError.message}`,
      sucesso: false,
    }
  }

  if (!metaAtual) {
    return {
      erro: 'Meta mensal da competência selecionada não foi encontrada.',
      sucesso: false,
    }
  }

  const { data, error } = await supabase
    .from('metas_mensais')
    .update({
      competencia: validacao.competencia,
      meta_pecas: input.metaPecas,
      dias_produtivos: input.diasProdutivos,
      observacao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single<MetaMensalRow>()

  if (error || !data) {
    if (error?.code === '23505') {
      return {
        erro: 'Já existe uma meta mensal cadastrada para esta competência.',
        sucesso: false,
      }
    }

    return {
      erro: `Erro ao editar meta mensal: ${error?.message ?? 'erro desconhecido'}`,
      sucesso: false,
    }
  }

  revalidatePath('/admin/dashboard')

  return {
    sucesso: true,
    metaMensal: mapearMetaMensal(data),
  }
}

export async function editarMetaMensalFormulario(
  id: string,
  _prevState: MetaMensalActionState,
  formData: FormData
): Promise<MetaMensalActionState> {
  return editarMetaMensal({
    id,
    competencia: obterTexto(formData, 'competencia'),
    metaPecas: obterInteiro(formData, 'meta_pecas'),
    diasProdutivos: obterInteiro(formData, 'dias_produtivos'),
    observacao: obterTexto(formData, 'observacao'),
  })
}
