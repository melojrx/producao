'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import type { FormActionState, MaquinaStatus } from '@/types'

const STATUS_VALIDOS: MaquinaStatus[] = ['ativa', 'parada', 'manutencao']

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterTextoOpcional(formData: FormData, campo: string): string | null {
  const valor = obterTexto(formData, campo)
  return valor ? valor : null
}

function obterStatus(formData: FormData): MaquinaStatus {
  const status = obterTexto(formData, 'status')
  return STATUS_VALIDOS.includes(status as MaquinaStatus)
    ? (status as MaquinaStatus)
    : 'ativa'
}

function obterMensagemDependencia(totalRegistros: number): string | null {
  if (totalRegistros > 0) {
    return 'Esta máquina já possui registros de produção e não pode ser excluída permanentemente.'
  }

  return null
}

export async function criarMaquina(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const codigo = obterTexto(formData, 'codigo')
  const tipoMaquinaCodigo = obterTexto(formData, 'tipo_maquina_codigo')
  const modelo = obterTextoOpcional(formData, 'modelo')
  const marca = obterTextoOpcional(formData, 'marca')
  const numeroPatrimonio = obterTextoOpcional(formData, 'numero_patrimonio')
  const setor = obterTextoOpcional(formData, 'setor')

  if (!codigo || !tipoMaquinaCodigo) {
    return { erro: 'Código e tipo da máquina são obrigatórios' }
  }

  const { error } = await supabase.from('maquinas').insert({
    codigo,
    tipo_maquina_codigo: tipoMaquinaCodigo,
    modelo,
    marca,
    numero_patrimonio: numeroPatrimonio,
    setor,
  })

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Código da máquina já cadastrado' }
    }

    return { erro: `Erro ao criar máquina: ${error.message}` }
  }

  revalidatePath('/admin/maquinas')
  return { sucesso: true }
}

export async function editarMaquina(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const codigo = obterTexto(formData, 'codigo')
  const tipoMaquinaCodigo = obterTexto(formData, 'tipo_maquina_codigo')
  const modelo = obterTextoOpcional(formData, 'modelo')
  const marca = obterTextoOpcional(formData, 'marca')
  const numeroPatrimonio = obterTextoOpcional(formData, 'numero_patrimonio')
  const setor = obterTextoOpcional(formData, 'setor')
  const status = obterStatus(formData)

  if (!codigo || !tipoMaquinaCodigo) {
    return { erro: 'Código e tipo da máquina são obrigatórios' }
  }

  const { error } = await supabase
    .from('maquinas')
    .update({
      codigo,
      tipo_maquina_codigo: tipoMaquinaCodigo,
      modelo,
      marca,
      numero_patrimonio: numeroPatrimonio,
      setor,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    if (error.code === '23505') {
      return { erro: 'Código da máquina já cadastrado' }
    }

    return { erro: `Erro ao editar máquina: ${error.message}` }
  }

  revalidatePath('/admin/maquinas')
  return { sucesso: true }
}

export async function trocarStatusMaquina(
  id: string,
  status: MaquinaStatus
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  if (!STATUS_VALIDOS.includes(status)) {
    return { erro: 'Status de máquina inválido' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('maquinas')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao atualizar status da máquina: ${error.message}` }
  }

  revalidatePath('/admin/maquinas')
  revalidatePath(`/admin/maquinas/${id}`)
  return { sucesso: true }
}

export async function desativarMaquina(id: string): Promise<FormActionState> {
  return trocarStatusMaquina(id, 'parada')
}

export async function excluirMaquina(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const { count, error: countError } = await supabase
    .from('registros_producao')
    .select('*', { count: 'exact', head: true })
    .eq('maquina_id', id)

  if (countError) {
    return { erro: `Erro ao validar vínculos da máquina: ${countError.message}` }
  }

  const mensagemDependencia = obterMensagemDependencia(count ?? 0)
  if (mensagemDependencia) {
    return { erro: mensagemDependencia }
  }

  const { error } = await supabase
    .from('maquinas')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir máquina: ${error.message}` }
  }

  revalidatePath('/admin/maquinas')
  revalidatePath(`/admin/maquinas/${id}`)
  return { sucesso: true }
}
