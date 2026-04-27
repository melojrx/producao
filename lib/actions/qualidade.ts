'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { listarDisponibilidadeSequencialOperacoesComClient } from '@/lib/queries/fluxo-sequencial-turno-base'
import { buscarUsuarioSistemaPorAuthUserId } from '@/lib/queries/usuarios-sistema'
import type { OrigemLancamentoQualidade } from '@/types'

export interface RegistrarDefeitoQualidadeInput {
  turnoSetorOperacaoIdOrigem: string
  quantidadeDefeito: number
}

export interface RegistrarRevisaoQualidadeInput {
  turnoSetorOperacaoIdQualidade: string
  quantidadeAprovada: number
  quantidadeReprovada: number
  origemLancamento: OrigemLancamentoQualidade
  defeitos: RegistrarDefeitoQualidadeInput[]
}

export interface RegistrarRevisaoQualidadeResultado {
  sucesso: boolean
  erro?: string
  qualidadeRegistroId?: string
  quantidadeAprovada?: number
  quantidadeReprovada?: number
  quantidadeRevisada?: number
  totalDefeitos?: number
  quantidadeRealizadaOperacao?: number
  saldoRestanteOperacao?: number
  statusTurnoSetorOperacao?: string
  quantidadeRealizadaSecao?: number
  saldoRestanteSecao?: number
  statusTurnoSetorOp?: string
  quantidadeRealizadaTurnoOp?: number
  statusTurnoOp?: string
}

interface RegistrarRevisaoQualidadeRpcRow {
  qualidade_registro_id: string
  turno_setor_operacao_id: string
  quantidade_aprovada: number
  quantidade_reprovada: number
  quantidade_revisada: number
  total_defeitos: number
  quantidade_realizada_operacao: number
  saldo_restante_operacao: number
  status_turno_setor_operacao: string
  quantidade_realizada_secao: number
  saldo_restante_secao: number
  status_turno_setor_op: string
  quantidade_realizada_turno_op: number
  status_turno_op: string
}

interface ValidacaoDisponibilidadeResultado {
  erro?: string
}

function quantidadeInteiraNaoNegativa(quantidade: number): boolean {
  return Number.isInteger(quantidade) && quantidade >= 0
}

function validarDefeitos(
  defeitos: RegistrarDefeitoQualidadeInput[],
  quantidadeReprovada: number
): string | null {
  if (quantidadeReprovada === 0) {
    return defeitos.length > 0
      ? 'Não informe defeitos por operação quando a revisão não possuir peças reprovadas.'
      : null
  }

  if (defeitos.length === 0) {
    return 'Informe ao menos uma operação de origem para as peças reprovadas.'
  }

  const ids = new Set<string>()

  for (const defeito of defeitos) {
    if (!defeito.turnoSetorOperacaoIdOrigem) {
      return 'Cada defeito precisa informar a operação de origem.'
    }

    if (!quantidadeInteiraNaoNegativa(defeito.quantidadeDefeito) || defeito.quantidadeDefeito === 0) {
      return 'Cada defeito precisa informar uma quantidade inteira maior que zero.'
    }

    if (ids.has(defeito.turnoSetorOperacaoIdOrigem)) {
      return 'Cada operação de origem pode aparecer apenas uma vez por revisão.'
    }

    ids.add(defeito.turnoSetorOperacaoIdOrigem)
  }

  return null
}

async function validarDisponibilidadeSequencialQualidade(
  turnoSetorOperacaoIdQualidade: string,
  quantidadeRevisada: number
): Promise<ValidacaoDisponibilidadeResultado> {
  const supabase = createAdminClient()
  const disponibilidade = await listarDisponibilidadeSequencialOperacoesComClient(supabase, [
    turnoSetorOperacaoIdQualidade,
  ])
  const contexto = disponibilidade[0]

  if (!contexto) {
    return {
      erro: 'A operação de qualidade selecionada não foi encontrada no fluxo sequencial do turno.',
    }
  }

  if (quantidadeRevisada > contexto.quantidadeDisponivelOperacao) {
    if (contexto.quantidadeDisponivelOperacao === 0 && contexto.setorAnteriorNome) {
      return {
        erro: `A operação de qualidade em ${contexto.setorNome} ainda não recebeu peças liberadas de ${contexto.setorAnteriorNome}.`,
      }
    }

    return {
      erro: `A operação de qualidade em ${contexto.setorNome} possui apenas ${contexto.quantidadeDisponivelOperacao} peça(s) liberadas no fluxo para revisão agora.`,
    }
  }

  return {}
}

async function resolverRevisorQualidadeAutenticado(): Promise<{
  id?: string
  erro?: string
}> {
  const supabaseServer = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabaseServer.auth.getUser()

  if (userError || !user) {
    return { erro: 'Sua sessão expirou. Faça login novamente.' }
  }

  const usuarioSistema = await buscarUsuarioSistemaPorAuthUserId(supabaseServer, user.id)

  if (!usuarioSistema) {
    return {
      erro: 'Seu usuário administrativo não foi encontrado para autoria da revisão.',
    }
  }

  if (usuarioSistema.pode_revisar_qualidade !== true) {
    return {
      erro: 'Seu usuário não possui permissão para registrar revisões de qualidade.',
    }
  }

  return { id: usuarioSistema.id }
}

export async function registrarRevisaoQualidade(
  input: RegistrarRevisaoQualidadeInput
): Promise<RegistrarRevisaoQualidadeResultado> {
  if (!input.turnoSetorOperacaoIdQualidade) {
    return {
      sucesso: false,
      erro: 'A operação de qualidade não foi informada para a revisão.',
    }
  }

  if (!quantidadeInteiraNaoNegativa(input.quantidadeAprovada)) {
    return {
      sucesso: false,
      erro: 'A quantidade aprovada deve ser um número inteiro maior ou igual a 0.',
    }
  }

  if (!quantidadeInteiraNaoNegativa(input.quantidadeReprovada)) {
    return {
      sucesso: false,
      erro: 'A quantidade reprovada deve ser um número inteiro maior ou igual a 0.',
    }
  }

  const quantidadeRevisada = input.quantidadeAprovada + input.quantidadeReprovada

  if (quantidadeRevisada <= 0) {
    return {
      sucesso: false,
      erro: 'A revisão precisa informar ao menos uma peça aprovada ou reprovada.',
    }
  }

  const erroDefeitos = validarDefeitos(input.defeitos, input.quantidadeReprovada)

  if (erroDefeitos) {
    return {
      sucesso: false,
      erro: erroDefeitos,
    }
  }

  const revisor = await resolverRevisorQualidadeAutenticado()

  if (revisor.erro || !revisor.id) {
    return {
      sucesso: false,
      erro: revisor.erro ?? 'Não foi possível identificar o revisor autenticado.',
    }
  }

  const { erro: erroDisponibilidadeSequencial } = await validarDisponibilidadeSequencialQualidade(
    input.turnoSetorOperacaoIdQualidade,
    quantidadeRevisada
  )

  if (erroDisponibilidadeSequencial) {
    return {
      sucesso: false,
      erro: erroDisponibilidadeSequencial,
    }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('registrar_revisao_qualidade_turno_setor_operacao', {
    p_turno_setor_operacao_id_qualidade: input.turnoSetorOperacaoIdQualidade,
    p_revisor_usuario_id: revisor.id,
    p_quantidade_aprovada: input.quantidadeAprovada,
    p_quantidade_reprovada: input.quantidadeReprovada,
    p_origem_lancamento: input.origemLancamento,
    p_detalhes: input.defeitos.map((defeito) => ({
      turno_setor_operacao_id_origem: defeito.turnoSetorOperacaoIdOrigem,
      quantidade_defeito: defeito.quantidadeDefeito,
    })),
  })

  if (error) {
    return {
      sucesso: false,
      erro: error.message || 'Não foi possível registrar a revisão de qualidade.',
    }
  }

  const resultado = (data ?? [])[0] as RegistrarRevisaoQualidadeRpcRow | undefined

  if (!resultado) {
    return {
      sucesso: false,
      erro: 'A revisão foi executada, mas o banco não retornou o resultado esperado.',
    }
  }

  revalidatePath('/scanner')
  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/relatorios')

  return {
    sucesso: true,
    qualidadeRegistroId: resultado.qualidade_registro_id,
    quantidadeAprovada: resultado.quantidade_aprovada,
    quantidadeReprovada: resultado.quantidade_reprovada,
    quantidadeRevisada: resultado.quantidade_revisada,
    totalDefeitos: resultado.total_defeitos,
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
