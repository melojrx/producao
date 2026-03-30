'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buscarUsuarioSistemaPorAuthUserId } from '@/lib/queries/usuarios-sistema'

export interface RegistrarProducaoInput {
  operadorId: string
  turnoSetorOpId: string
  quantidade: number
  maquinaId?: string | null
}

export interface RegistrarProducaoResultado {
  sucesso: boolean
  erro?: string
  registroId?: string
  quantidadeRealizada?: number
  saldoRestante?: number
  statusTurnoSetorOp?: string
}

interface RegistrarProducaoRpcRow {
  quantidade_realizada: number
  quantidade_registrada: number
  registro_id: string
  saldo_restante: number
  status_turno_setor_op: string
  turno_setor_op_id: string
}

export interface RegistrarProducaoOperacaoInput {
  operadorId: string
  turnoSetorOperacaoId: string
  quantidade: number
  usuarioSistemaId?: string | null
  origemApontamento?: 'operador_qr' | 'supervisor_manual'
  maquinaId?: string | null
  observacao?: string | null
}

export interface RegistrarProducaoOperacaoResultado {
  sucesso: boolean
  erro?: string
  registroId?: string
  quantidadeRealizadaOperacao?: number
  saldoRestanteOperacao?: number
  statusTurnoSetorOperacao?: string
  quantidadeRealizadaSecao?: number
  saldoRestanteSecao?: number
  statusTurnoSetorOp?: string
  quantidadeRealizadaTurnoOp?: number
  statusTurnoOp?: string
}

interface RegistrarProducaoOperacaoRpcRow {
  quantidade_realizada_operacao: number
  quantidade_realizada_secao: number
  quantidade_realizada_turno_op: number
  quantidade_registrada: number
  registro_id: string
  saldo_restante_operacao: number
  saldo_restante_secao: number
  status_turno_op: string
  status_turno_setor_op: string
  status_turno_setor_operacao: string
  turno_setor_operacao_id: string
}

export interface RegistrarApontamentosSupervisorActionState {
  sucesso: boolean
  erro?: string
  mensagem?: string
}

interface LancamentoSupervisorPayload {
  operadorId: string
  turnoSetorOperacaoId: string
  quantidade: number
}

interface RegistrarSupervisorRpcRow {
  quantidade_realizada_secao: number
  quantidade_realizada_turno_op: number
  saldo_restante_secao: number
  status_turno_op: string
  status_turno_setor_op: string
  total_lancamentos: number
}

function quantidadeValida(quantidade: number): boolean {
  return Number.isInteger(quantidade) && quantidade >= 1
}

function validarLancamentoSupervisor(value: unknown): value is LancamentoSupervisorPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.operadorId === 'string' &&
    typeof candidate.turnoSetorOperacaoId === 'string' &&
    typeof candidate.quantidade === 'number'
  )
}

function parseLancamentosSupervisor(raw: string): { data?: LancamentoSupervisorPayload[]; erro?: string } {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { erro: 'Adicione ao menos um lançamento antes de registrar.' }
    }

    if (!parsed.every(validarLancamentoSupervisor)) {
      return { erro: 'Um ou mais lançamentos possuem formato inválido.' }
    }

    const lancamentoInvalido = parsed.find(
      (lancamento) =>
        !lancamento.operadorId ||
        !lancamento.turnoSetorOperacaoId ||
        !quantidadeValida(lancamento.quantidade)
    )

    if (lancamentoInvalido) {
      return {
        erro: 'Todos os lançamentos precisam informar operador, operação e quantidade válida.',
      }
    }

    return { data: parsed }
  } catch {
    return { erro: 'Não foi possível interpretar os lançamentos informados.' }
  }
}

async function resolverUsuarioSistemaAutenticadoOpcional(): Promise<string | null> {
  const supabaseServer = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser()

  if (userError || !user) {
    return null
  }

  const usuarioSistema = await buscarUsuarioSistemaPorAuthUserId(supabaseServer, user.id)
  return usuarioSistema?.id ?? null
}

export async function registrarProducao(
  input: RegistrarProducaoInput
): Promise<RegistrarProducaoResultado> {
  if (!input.operadorId) {
    return { sucesso: false, erro: 'Operador não informado para o apontamento.' }
  }

  if (!input.turnoSetorOpId) {
    return { sucesso: false, erro: 'Seção do turno não informada para o apontamento.' }
  }

  if (!quantidadeValida(input.quantidade)) {
    return { sucesso: false, erro: 'A quantidade deve ser um número inteiro maior ou igual a 1.' }
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('registrar_producao_turno_setor_op', {
    p_operador_id: input.operadorId,
    p_turno_setor_op_id: input.turnoSetorOpId,
    p_quantidade: input.quantidade,
    p_maquina_id: input.maquinaId ?? null,
  })

  if (error) {
    return {
      sucesso: false,
      erro: error.message || 'Não foi possível registrar a produção no contexto do turno.',
    }
  }

  const resultado = (data ?? [])[0] as RegistrarProducaoRpcRow | undefined

  if (!resultado) {
    return {
      sucesso: false,
      erro: 'O registro foi executado, mas o banco não retornou o resultado esperado.',
    }
  }

  revalidatePath('/scanner')
  revalidatePath('/admin/dashboard')

  return {
    sucesso: true,
    registroId: resultado.registro_id,
    quantidadeRealizada: resultado.quantidade_realizada,
    saldoRestante: resultado.saldo_restante,
    statusTurnoSetorOp: resultado.status_turno_setor_op,
  }
}

export async function registrarProducaoOperacao(
  input: RegistrarProducaoOperacaoInput
): Promise<RegistrarProducaoOperacaoResultado> {
  if (!input.operadorId) {
    return { sucesso: false, erro: 'Operador não informado para o apontamento.' }
  }

  if (!input.turnoSetorOperacaoId) {
    return { sucesso: false, erro: 'Operação da seção não informada para o apontamento.' }
  }

  if (!quantidadeValida(input.quantidade)) {
    return { sucesso: false, erro: 'A quantidade deve ser um número inteiro maior ou igual a 1.' }
  }

  const usuarioSistemaId =
    input.usuarioSistemaId === undefined
      ? await resolverUsuarioSistemaAutenticadoOpcional()
      : input.usuarioSistemaId

  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('registrar_producao_turno_setor_operacao', {
    p_operador_id: input.operadorId,
    p_turno_setor_operacao_id: input.turnoSetorOperacaoId,
    p_quantidade: input.quantidade,
    p_usuario_sistema_id: usuarioSistemaId ?? null,
    p_origem_apontamento: input.origemApontamento ?? 'operador_qr',
    p_maquina_id: input.maquinaId ?? null,
    p_observacao: input.observacao ?? null,
  })

  if (error) {
    return {
      sucesso: false,
      erro: error.message || 'Não foi possível registrar a produção na operação da seção.',
    }
  }

  const resultado = (data ?? [])[0] as RegistrarProducaoOperacaoRpcRow | undefined

  if (!resultado) {
    return {
      sucesso: false,
      erro: 'O registro foi executado, mas o banco não retornou o resultado esperado.',
    }
  }

  revalidatePath('/scanner')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/relatorios')

  return {
    sucesso: true,
    registroId: resultado.registro_id,
    quantidadeRealizadaOperacao: resultado.quantidade_realizada_operacao,
    saldoRestanteOperacao: resultado.saldo_restante_operacao,
    statusTurnoSetorOperacao: resultado.status_turno_setor_operacao,
    quantidadeRealizadaSecao: resultado.quantidade_realizada_secao,
    saldoRestanteSecao: resultado.saldo_restante_secao,
    statusTurnoSetorOp: resultado.status_turno_setor_op,
    quantidadeRealizadaTurnoOp: resultado.quantidade_realizada_turno_op,
    statusTurnoOp: resultado.status_turno_op,
  }
}

export async function registrarApontamentosSupervisor(
  _previousState: RegistrarApontamentosSupervisorActionState,
  formData: FormData
): Promise<RegistrarApontamentosSupervisorActionState> {
  const turnoSetorOpId = String(formData.get('turno_setor_op_id') ?? '').trim()
  const lancamentosRaw = String(formData.get('lancamentos') ?? '')

  if (!turnoSetorOpId) {
    return { sucesso: false, erro: 'Selecione uma seção antes de registrar os apontamentos.' }
  }

  const parsedLancamentos = parseLancamentosSupervisor(lancamentosRaw)
  if (parsedLancamentos.erro || !parsedLancamentos.data) {
    return {
      sucesso: false,
      erro: parsedLancamentos.erro ?? 'Não foi possível validar os lançamentos informados.',
    }
  }

  const supabaseServer = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser()

  if (userError || !user) {
    return { sucesso: false, erro: 'Sua sessão expirou. Faça login novamente.' }
  }

  const usuarioSistema = await buscarUsuarioSistemaPorAuthUserId(supabaseServer, user.id)

  if (!usuarioSistema) {
    return {
      sucesso: false,
      erro: 'Seu usuário administrativo não foi encontrado para autoria do lançamento.',
    }
  }

  const supabase = createAdminClient()
  const payloadRpc = parsedLancamentos.data.map((lancamento) => ({
    operador_id: lancamento.operadorId,
    turno_setor_operacao_id: lancamento.turnoSetorOperacaoId,
    quantidade: lancamento.quantidade,
  }))

  const { data, error } = await supabase.rpc('registrar_producao_supervisor_em_lote', {
    p_usuario_sistema_id: usuarioSistema.id,
    p_turno_setor_op_id: turnoSetorOpId,
    p_lancamentos: payloadRpc,
  })

  if (error) {
    return {
      sucesso: false,
      erro: error.message || 'Não foi possível registrar os apontamentos do supervisor.',
    }
  }

  const resultado = (data ?? [])[0] as RegistrarSupervisorRpcRow | undefined

  if (!resultado) {
    return {
      sucesso: false,
      erro: 'O banco não retornou o resultado esperado após registrar os apontamentos.',
    }
  }

  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/relatorios')
  revalidatePath('/scanner')

  return {
    sucesso: true,
    mensagem: `${resultado.total_lancamentos} lançamento(s) registrados. Seção com ${resultado.quantidade_realizada_secao} unidade(s) consolidadas e saldo ${resultado.saldo_restante_secao}.`,
  }
}
