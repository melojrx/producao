'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import {
  criarTipoDefeitoQualidadeDjango,
  editarTipoDefeitoQualidadeDjango,
  inativarTipoDefeitoQualidadeDjango,
  mapearErroAcaoQualidadeDefeitoDjango,
  reativarTipoDefeitoQualidadeDjango,
} from '@/lib/django/actions/qualidade-defeitos'
import { estaUsandoDjango } from '@/lib/django/flags'
import { createAdminClient } from '@/lib/supabase/admin'
import { validarTipoDefeitoInput } from '@/lib/utils/qualidade-defeitos'
import type { FormActionState } from '@/types'

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

function obterAtivo(formData: FormData): boolean {
  return formData.get('ativo') === 'true'
}

async function validarSessaoAdmin(): Promise<FormActionState | null> {
  try {
    await requireAdminUser({ redirectOnFail: false })
    return null
  } catch (error) {
    return {
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
    }
  }
}

function revalidarSuperficiesQualidade() {
  revalidatePath('/admin/tipos-defeito')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/dashboard')
}

async function contarVinculosHistoricosTipoDefeito(id: string): Promise<number> {
  const supabase = createAdminClient()
  const { count, error } = await supabase
    .from('qualidade_detalhes')
    .select('id', { count: 'exact', head: true })
    .eq('qualidade_defeito_id', id)

  if (error) {
    throw new Error(`Erro ao validar histórico do tipo de defeito: ${error.message}`)
  }

  return count ?? 0
}

export async function criarTipoDefeitoQualidade(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const validacao = validarTipoDefeitoInput({
    nome: obterTexto(formData, 'nome'),
    classificacao: obterTexto(formData, 'classificacao'),
    ordem: obterInteiro(formData, 'ordem'),
    ativo: obterAtivo(formData),
  })

  if (!validacao.valido) {
    return { erro: validacao.erro }
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      await criarTipoDefeitoQualidadeDjango(validacao.dados)
      revalidarSuperficiesQualidade()
      return { sucesso: true }
    } catch (error) {
      return { erro: mapearErroAcaoQualidadeDefeitoDjango(error) }
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('qualidade_defeitos').insert({
    nome: validacao.dados.nome,
    classificacao: validacao.dados.classificacao,
    ordem: validacao.dados.ordem,
    ativo: validacao.dados.ativo,
  })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Já existe um tipo de defeito com este nome.' }
    }

    return { erro: `Erro ao criar tipo de defeito: ${error.message}` }
  }

  revalidarSuperficiesQualidade()
  return { sucesso: true }
}

export async function editarTipoDefeitoQualidade(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  const validacao = validarTipoDefeitoInput({
    nome: obterTexto(formData, 'nome'),
    classificacao: obterTexto(formData, 'classificacao'),
    ordem: obterInteiro(formData, 'ordem'),
    ativo: obterAtivo(formData),
  })

  if (!validacao.valido) {
    return { erro: validacao.erro }
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      await editarTipoDefeitoQualidadeDjango(id, validacao.dados)
      revalidarSuperficiesQualidade()
      return { sucesso: true }
    } catch (error) {
      return { erro: mapearErroAcaoQualidadeDefeitoDjango(error) }
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('qualidade_defeitos')
    .update({
      nome: validacao.dados.nome,
      classificacao: validacao.dados.classificacao,
      ordem: validacao.dados.ordem,
      ativo: validacao.dados.ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Já existe um tipo de defeito com este nome.' }
    }

    return { erro: `Erro ao editar tipo de defeito: ${error.message}` }
  }

  revalidarSuperficiesQualidade()
  return { sucesso: true }
}

export async function alterarStatusTipoDefeitoQualidade(
  id: string,
  ativo: boolean
): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      if (ativo) {
        await reativarTipoDefeitoQualidadeDjango(id)
      } else {
        await inativarTipoDefeitoQualidadeDjango(id)
      }

      revalidarSuperficiesQualidade()
      return { sucesso: true }
    } catch (error) {
      return {
        erro: mapearErroAcaoQualidadeDefeitoDjango(error),
      }
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('qualidade_defeitos')
    .update({
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao ${ativo ? 'reativar' : 'inativar'} tipo de defeito: ${error.message}` }
  }

  revalidarSuperficiesQualidade()
  return { sucesso: true }
}

export async function excluirTipoDefeitoQualidade(id: string): Promise<FormActionState> {
  const erroSessao = await validarSessaoAdmin()
  if (erroSessao) {
    return erroSessao
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      await inativarTipoDefeitoQualidadeDjango(id)
      revalidarSuperficiesQualidade()
      return { sucesso: true }
    } catch (error) {
      return { erro: mapearErroAcaoQualidadeDefeitoDjango(error) }
    }
  }

  const supabase = createAdminClient()

  try {
    const totalVinculosHistoricos = await contarVinculosHistoricosTipoDefeito(id)

    if (totalVinculosHistoricos > 0) {
      const { error } = await supabase
        .from('qualidade_defeitos')
        .update({
          ativo: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) {
        return { erro: `Erro ao inativar tipo de defeito com histórico: ${error.message}` }
      }

      revalidarSuperficiesQualidade()
      return { sucesso: true }
    }

    const { error } = await supabase.from('qualidade_defeitos').delete().eq('id', id)

    if (error) {
      return { erro: `Erro ao excluir tipo de defeito: ${error.message}` }
    }

    revalidarSuperficiesQualidade()
    return { sucesso: true }
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir ou inativar o tipo de defeito.',
    }
  }
}
