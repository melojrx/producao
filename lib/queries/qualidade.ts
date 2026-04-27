import type { SupabaseClient } from '@supabase/supabase-js'
import { setorUsaRevisaoQualidade } from '@/lib/utils/qualidade'
import type {
  QualidadeIndicadorOperacaoV2,
  QualidadeOperadorEnvolvidoV2,
  QualidadeResumoOpV2,
  QualidadeResumoTurnoV2,
  TurnoOpV2,
  TurnoSetorOperacaoApontamentoV2,
  TurnoSetorOpV2,
} from '@/types'
import type { Database, Tables } from '@/types/supabase'

type RegistroProducaoResumoRow = Pick<
  Tables<'registros_producao'>,
  'operador_id' | 'quantidade' | 'turno_op_id' | 'turno_setor_operacao_id'
>

type OperadorResumoRow = Pick<Tables<'operadores'>, 'id' | 'nome' | 'matricula' | 'funcao'>
type QualidadeRegistroResumoRow = Pick<
  Tables<'qualidade_registros'>,
  'id' | 'quantidade_aprovada' | 'quantidade_reprovada' | 'quantidade_revisada' | 'turno_op_id'
>
type QualidadeDetalheResumoRow = Pick<
  Tables<'qualidade_detalhes'>,
  | 'operacao_id_origem'
  | 'qualidade_registro_id'
  | 'quantidade_defeito'
  | 'setor_id_origem'
  | 'turno_setor_operacao_id_origem'
>

export interface QualidadeOperadorEnvolvido {
  operadorId: string
  nome: string
  matricula: string | null
  funcao: string | null
  quantidadeApontada: number
}

export interface QualidadeOperacaoOrigemEnvolvida {
  turnoSetorOperacaoIdOrigem: string
  possuiApontamentos: boolean
  operadores: QualidadeOperadorEnvolvido[]
}

export interface ResumoQualidadeTurnoResult {
  resumoTurno: QualidadeResumoTurnoV2 | null
  resumoOps: QualidadeResumoOpV2[]
}

interface QueryErrorLike {
  code?: string
  message?: string
}

interface QualidadeOperacaoAgregada {
  turnoSetorOperacaoIdOrigem: string
  operacaoIdOrigem: string
  setorIdOrigem: string
  setorNomeOrigem: string
  operacaoCodigoOrigem: string
  operacaoDescricaoOrigem: string
  quantidadeDefeitos: number
  sequencia: number
}

interface QualidadeOpAgregada {
  turnoOpId: string
  quantidadeAprovada: number
  quantidadeReprovada: number
  quantidadeRevisada: number
  totalDefeitos: number
  operacoesProdutivasCount: number
  operacoes: Map<string, QualidadeOperacaoAgregada>
}

function isQueryErrorLike(value: unknown): value is QueryErrorLike {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    candidate.code === undefined || typeof candidate.code === 'string'
  ) && (candidate.message === undefined || typeof candidate.message === 'string')
}

function isSchemaQualidadeIndisponivel(error: unknown): boolean {
  if (!isQueryErrorLike(error)) {
    return false
  }

  if (error.code === '42P01' || error.code === '42703') {
    return true
  }

  const mensagem = (error.message ?? '').toLowerCase()

  return (
    mensagem.includes('does not exist') ||
    mensagem.includes('schema cache') ||
    mensagem.includes('could not find the table')
  )
}

export async function listarOperadoresEnvolvidosPorOperacoesOrigemComClient(
  supabase: SupabaseClient<Database>,
  turnoOpId: string,
  turnoSetorOperacaoIdsOrigem: string[]
): Promise<QualidadeOperacaoOrigemEnvolvida[]> {
  const operacoesIds = Array.from(new Set(turnoSetorOperacaoIdsOrigem.filter(Boolean)))

  if (!turnoOpId || operacoesIds.length === 0) {
    return []
  }

  const { data: registros, error: registrosError } = await supabase
    .from('registros_producao')
    .select('operador_id, quantidade, turno_op_id, turno_setor_operacao_id')
    .eq('turno_op_id', turnoOpId)
    .in('turno_setor_operacao_id', operacoesIds)
    .returns<RegistroProducaoResumoRow[]>()

  if (registrosError) {
    throw new Error(
      `Erro ao listar operadores envolvidos nas operações de origem da qualidade: ${registrosError.message}`
    )
  }

  const registrosValidos = (registros ?? []).filter(
    (
      registro
    ): registro is RegistroProducaoResumoRow & {
      operador_id: string
      turno_setor_operacao_id: string
    } => Boolean(registro.operador_id && registro.turno_setor_operacao_id)
  )

  if (registrosValidos.length === 0) {
    return operacoesIds.map((turnoSetorOperacaoIdOrigem) => ({
      turnoSetorOperacaoIdOrigem,
      possuiApontamentos: false,
      operadores: [],
    }))
  }

  const operadorIds = Array.from(new Set(registrosValidos.map((registro) => registro.operador_id)))
  const { data: operadores, error: operadoresError } = await supabase
    .from('operadores')
    .select('id, nome, matricula, funcao')
    .in('id', operadorIds)
    .returns<OperadorResumoRow[]>()

  if (operadoresError) {
    throw new Error(
      `Erro ao carregar os operadores envolvidos nas operações de origem: ${operadoresError.message}`
    )
  }

  const operadoresPorId = new Map((operadores ?? []).map((operador) => [operador.id, operador]))
  const agregadosPorOperacao = new Map<string, Map<string, QualidadeOperadorEnvolvido>>()

  for (const registro of registrosValidos) {
    const operador = operadoresPorId.get(registro.operador_id)

    if (!operador) {
      continue
    }

    const operadoresDaOperacao =
      agregadosPorOperacao.get(registro.turno_setor_operacao_id) ?? new Map()

    const acumulado = operadoresDaOperacao.get(registro.operador_id)

    if (acumulado) {
      acumulado.quantidadeApontada += registro.quantidade
    } else {
      operadoresDaOperacao.set(registro.operador_id, {
        operadorId: operador.id,
        nome: operador.nome,
        matricula: operador.matricula,
        funcao: operador.funcao,
        quantidadeApontada: registro.quantidade,
      })
    }

    agregadosPorOperacao.set(registro.turno_setor_operacao_id, operadoresDaOperacao)
  }

  return operacoesIds.map((turnoSetorOperacaoIdOrigem) => {
    const operadoresDaOperacao = agregadosPorOperacao.get(turnoSetorOperacaoIdOrigem)
    const operadores = operadoresDaOperacao
      ? [...operadoresDaOperacao.values()].sort((left, right) => right.quantidadeApontada - left.quantidadeApontada)
      : []

    return {
      turnoSetorOperacaoIdOrigem,
      possuiApontamentos: operadores.length > 0,
      operadores,
    }
  })
}

export async function listarResumoQualidadeTurnoComClient(
  supabase: SupabaseClient<Database>,
  turnoId: string,
  ops: TurnoOpV2[],
  secoesSetorOp: TurnoSetorOpV2[],
  operacoesSecao: TurnoSetorOperacaoApontamentoV2[]
): Promise<ResumoQualidadeTurnoResult> {
  if (!turnoId) {
    return {
      resumoTurno: null,
      resumoOps: [],
    }
  }

  const { data: registros, error: registrosError } = await supabase
    .from('qualidade_registros')
    .select('id, quantidade_aprovada, quantidade_reprovada, quantidade_revisada, turno_op_id')
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<QualidadeRegistroResumoRow[]>()

  if (registrosError) {
    if (isSchemaQualidadeIndisponivel(registrosError)) {
      return {
        resumoTurno: null,
        resumoOps: [],
      }
    }

    throw new Error(`Erro ao listar registros de qualidade do turno: ${registrosError.message}`)
  }

  const registrosQualidade = (registros ?? []).filter(
    (registro): registro is QualidadeRegistroResumoRow & { id: string; turno_op_id: string } =>
      Boolean(registro.id && registro.turno_op_id)
  )

  if (registrosQualidade.length === 0) {
    return {
      resumoTurno: null,
      resumoOps: [],
    }
  }

  const registroIds = registrosQualidade.map((registro) => registro.id)
  const { data: detalhes, error: detalhesError } = await supabase
    .from('qualidade_detalhes')
    .select(
      'operacao_id_origem, qualidade_registro_id, quantidade_defeito, setor_id_origem, turno_setor_operacao_id_origem'
    )
    .in('qualidade_registro_id', registroIds)
    .returns<QualidadeDetalheResumoRow[]>()

  if (detalhesError) {
    if (isSchemaQualidadeIndisponivel(detalhesError)) {
      return {
        resumoTurno: null,
        resumoOps: [],
      }
    }

    throw new Error(`Erro ao listar detalhes de qualidade do turno: ${detalhesError.message}`)
  }

  const secoesPorId = new Map(secoesSetorOp.map((secao) => [secao.id, secao]))
  const operacoesSecaoPorId = new Map(operacoesSecao.map((operacao) => [operacao.id, operacao]))
  const opsPorId = new Map(ops.map((op) => [op.id, op]))
  const operacoesProdutivasCountPorOp = new Map<string, number>()

  for (const operacao of operacoesSecao) {
    const secao = secoesPorId.get(operacao.turnoSetorOpId)

    if (!secao || setorUsaRevisaoQualidade(secao.setorNome)) {
      continue
    }

    operacoesProdutivasCountPorOp.set(
      operacao.turnoOpId,
      (operacoesProdutivasCountPorOp.get(operacao.turnoOpId) ?? 0) + 1
    )
  }

  const agregadosPorOp = new Map<string, QualidadeOpAgregada>()
  const turnoOpIdPorRegistroId = new Map<string, string>()

  for (const registro of registrosQualidade) {
    turnoOpIdPorRegistroId.set(registro.id, registro.turno_op_id)

    const agregadoAtual = agregadosPorOp.get(registro.turno_op_id) ?? {
      turnoOpId: registro.turno_op_id,
      quantidadeAprovada: 0,
      quantidadeReprovada: 0,
      quantidadeRevisada: 0,
      totalDefeitos: 0,
      operacoesProdutivasCount: operacoesProdutivasCountPorOp.get(registro.turno_op_id) ?? 0,
      operacoes: new Map<string, QualidadeOperacaoAgregada>(),
    }

    agregadoAtual.quantidadeAprovada += registro.quantidade_aprovada
    agregadoAtual.quantidadeReprovada += registro.quantidade_reprovada
    agregadoAtual.quantidadeRevisada += registro.quantidade_revisada

    agregadosPorOp.set(registro.turno_op_id, agregadoAtual)
  }

  for (const detalhe of detalhes ?? []) {
    const turnoOpId = turnoOpIdPorRegistroId.get(detalhe.qualidade_registro_id)

    if (!turnoOpId) {
      continue
    }

    const agregadoOp = agregadosPorOp.get(turnoOpId)

    if (!agregadoOp) {
      continue
    }

    agregadoOp.totalDefeitos += detalhe.quantidade_defeito

    const operacaoOrigem = operacoesSecaoPorId.get(detalhe.turno_setor_operacao_id_origem)
    const secaoOrigem = operacaoOrigem
      ? secoesPorId.get(operacaoOrigem.turnoSetorOpId) ?? null
      : null

    const operacaoAgregada = agregadoOp.operacoes.get(detalhe.turno_setor_operacao_id_origem) ?? {
      turnoSetorOperacaoIdOrigem: detalhe.turno_setor_operacao_id_origem,
      operacaoIdOrigem: detalhe.operacao_id_origem,
      setorIdOrigem: detalhe.setor_id_origem,
      setorNomeOrigem: secaoOrigem?.setorNome ?? 'Setor não identificado',
      operacaoCodigoOrigem: operacaoOrigem?.operacaoCodigo ?? '—',
      operacaoDescricaoOrigem: operacaoOrigem?.operacaoDescricao ?? 'Operação não identificada',
      quantidadeDefeitos: 0,
      sequencia: operacaoOrigem?.sequencia ?? Number.MAX_SAFE_INTEGER,
    }

    operacaoAgregada.quantidadeDefeitos += detalhe.quantidade_defeito
    agregadoOp.operacoes.set(detalhe.turno_setor_operacao_id_origem, operacaoAgregada)
  }

  const resumosOps = await Promise.all(
    [...agregadosPorOp.values()]
      .sort((opA, opB) => {
        const numeroOpA = opsPorId.get(opA.turnoOpId)?.numeroOp ?? opA.turnoOpId
        const numeroOpB = opsPorId.get(opB.turnoOpId)?.numeroOp ?? opB.turnoOpId

        return numeroOpA.localeCompare(numeroOpB, 'pt-BR', { numeric: true })
      })
      .map(async (agregadoOp): Promise<QualidadeResumoOpV2> => {
        const operacoesOrigemIds = [...agregadoOp.operacoes.keys()]
        const operadoresEnvolvidosPorOperacao =
          await listarOperadoresEnvolvidosPorOperacoesOrigemComClient(
            supabase,
            agregadoOp.turnoOpId,
            operacoesOrigemIds
          )

        const operadoresEnvolvidosPorId = new Map(
          operadoresEnvolvidosPorOperacao.map((operacao) => [
            operacao.turnoSetorOperacaoIdOrigem,
            operacao,
          ])
        )

        const operacoesComDefeito: QualidadeIndicadorOperacaoV2[] = [...agregadoOp.operacoes.values()]
          .sort((operacaoA, operacaoB) => {
            if (operacaoA.quantidadeDefeitos !== operacaoB.quantidadeDefeitos) {
              return operacaoB.quantidadeDefeitos - operacaoA.quantidadeDefeitos
            }

            if (operacaoA.sequencia !== operacaoB.sequencia) {
              return operacaoA.sequencia - operacaoB.sequencia
            }

            return operacaoA.operacaoCodigoOrigem.localeCompare(operacaoB.operacaoCodigoOrigem)
          })
          .map((operacao): QualidadeIndicadorOperacaoV2 => {
            const operadoresEnvolvidos =
              operadoresEnvolvidosPorId.get(operacao.turnoSetorOperacaoIdOrigem) ?? null

            return {
              turnoSetorOperacaoIdOrigem: operacao.turnoSetorOperacaoIdOrigem,
              operacaoIdOrigem: operacao.operacaoIdOrigem,
              setorIdOrigem: operacao.setorIdOrigem,
              setorNomeOrigem: operacao.setorNomeOrigem,
              operacaoCodigoOrigem: operacao.operacaoCodigoOrigem,
              operacaoDescricaoOrigem: operacao.operacaoDescricaoOrigem,
              quantidadeDefeitos: operacao.quantidadeDefeitos,
              percentualDefeitosOperacao:
                agregadoOp.quantidadeRevisada > 0
                  ? (operacao.quantidadeDefeitos / agregadoOp.quantidadeRevisada) * 100
                  : null,
              possuiApontamentos: operadoresEnvolvidos?.possuiApontamentos ?? false,
              operadoresEnvolvidos:
                (operadoresEnvolvidos?.operadores ?? []) as QualidadeOperadorEnvolvidoV2[],
            }
          })

        const oportunidadesRevisadas =
          agregadoOp.quantidadeRevisada * agregadoOp.operacoesProdutivasCount

        return {
          turnoOpId: agregadoOp.turnoOpId,
          quantidadeAprovada: agregadoOp.quantidadeAprovada,
          quantidadeReprovada: agregadoOp.quantidadeReprovada,
          quantidadeRevisada: agregadoOp.quantidadeRevisada,
          totalDefeitos: agregadoOp.totalDefeitos,
          operacoesProdutivasCount: agregadoOp.operacoesProdutivasCount,
          oportunidadesRevisadas,
          percentualReprovacao:
            agregadoOp.quantidadeRevisada > 0
              ? (agregadoOp.quantidadeReprovada / agregadoOp.quantidadeRevisada) * 100
              : null,
          percentualDefeitosOp:
            oportunidadesRevisadas > 0
              ? (agregadoOp.totalDefeitos / oportunidadesRevisadas) * 100
              : null,
          operacoesComDefeito,
        }
      })
  )

  if (resumosOps.length === 0) {
    return {
      resumoTurno: null,
      resumoOps: [],
    }
  }

  const resumoTurno: QualidadeResumoTurnoV2 = {
    quantidadeAprovadaTotal: resumosOps.reduce((soma, op) => soma + op.quantidadeAprovada, 0),
    quantidadeReprovadaTotal: resumosOps.reduce((soma, op) => soma + op.quantidadeReprovada, 0),
    quantidadeRevisadaTotal: resumosOps.reduce((soma, op) => soma + op.quantidadeRevisada, 0),
    totalDefeitos: resumosOps.reduce((soma, op) => soma + op.totalDefeitos, 0),
    oportunidadesRevisadasTotal: resumosOps.reduce(
      (soma, op) => soma + op.oportunidadesRevisadas,
      0
    ),
    percentualReprovacao:
      resumosOps.reduce((soma, op) => soma + op.quantidadeRevisada, 0) > 0
        ? (resumosOps.reduce((soma, op) => soma + op.quantidadeReprovada, 0) /
            resumosOps.reduce((soma, op) => soma + op.quantidadeRevisada, 0)) *
          100
        : null,
    percentualDefeitosOperacionais:
      resumosOps.reduce((soma, op) => soma + op.oportunidadesRevisadas, 0) > 0
        ? (resumosOps.reduce((soma, op) => soma + op.totalDefeitos, 0) /
            resumosOps.reduce((soma, op) => soma + op.oportunidadesRevisadas, 0)) *
          100
        : null,
    opsComRevisao: resumosOps.length,
    opsComReprovacao: resumosOps.filter((op) => op.quantidadeReprovada > 0).length,
  }

  return {
    resumoTurno,
    resumoOps: resumosOps,
  }
}
