import type { SupabaseClient } from '@supabase/supabase-js'
import { setorUsaRevisaoQualidade } from '@/lib/utils/qualidade'
import {
  calcularIndicadoresQualidadeTurno,
  type QualidadeDetalheIndicadorEntrada,
  type QualidadeLoteIndicadorEntrada,
  type QualidadeRegistroIndicadorEntrada,
} from '@/lib/utils/qualidade-indicadores'
import type {
  QualidadeDefeitoClassificacao,
  QualidadeIndicadoresTurnoV2,
  QualidadeIndicadorOperacaoV2,
  QualidadeLoteStatus,
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
type QualidadeRegistroIndicadorRow = Pick<
  Tables<'qualidade_registros'>,
  | 'id'
  | 'qualidade_lote_id'
  | 'quantidade_aprovada'
  | 'quantidade_reprovada'
  | 'quantidade_revisada'
  | 'turno_op_id'
>
type QualidadeDetalheResumoRow = Pick<
  Tables<'qualidade_detalhes'>,
  | 'operacao_id_origem'
  | 'qualidade_registro_id'
  | 'quantidade_defeito'
  | 'setor_id_origem'
  | 'turno_setor_operacao_id_origem'
>
type QualidadeDetalheIndicadorRow = Pick<
  Tables<'qualidade_detalhes'>,
  'qualidade_defeito_id' | 'qualidade_registro_id' | 'quantidade_defeito'
>
type QualidadeLoteFilaRow = Pick<
  Tables<'qualidade_lotes'>,
  | 'id'
  | 'turno_id'
  | 'turno_op_id'
  | 'produto_id'
  | 'turno_setor_operacao_id_origem'
  | 'operacao_id_origem'
  | 'setor_id_origem'
  | 'quantidade_lote'
  | 'status'
  | 'criado_em'
  | 'iniciado_em'
>
type QualidadeLoteIndicadorRow = Pick<
  Tables<'qualidade_lotes'>,
  | 'id'
  | 'turno_op_id'
  | 'produto_id'
  | 'quantidade_lote'
  | 'status'
  | 'criado_em'
  | 'registro_producao_id'
>
type TurnoOpFilaRow = Pick<Tables<'turno_ops'>, 'id' | 'numero_op' | 'produto_id'>
type ProdutoFilaRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia'>
type SetorFilaRow = Pick<Tables<'setores'>, 'id' | 'nome'>
type OperacaoFilaRow = Pick<Tables<'operacoes'>, 'id' | 'codigo' | 'descricao'>
type RegistroProducaoIndicadorRow = Pick<Tables<'registros_producao'>, 'id' | 'operador_id'>
type OperadorIndicadorRow = Pick<Tables<'operadores'>, 'id' | 'nome'>
type QualidadeDefeitoCatalogoRow = Pick<
  Tables<'qualidade_defeitos'>,
  'id' | 'nome' | 'classificacao' | 'ordem'
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

export interface QualidadeDefeitoCatalogoItem {
  id: string
  nome: string
  classificacao: QualidadeDefeitoClassificacao
  ordem: number
}

export interface QualidadeLoteFilaItem {
  id: string
  turnoId: string
  turnoOpId: string
  numeroOp: string
  produtoId: string | null
  produtoNome: string
  produtoReferencia: string
  turnoSetorOperacaoIdOrigem: string
  operacaoIdOrigem: string
  operacaoCodigoOrigem: string
  operacaoDescricaoOrigem: string
  setorIdOrigem: string
  setorNomeOrigem: string
  quantidadeLote: number
  status: Extract<QualidadeLoteStatus, 'pendente' | 'em_revisao'>
  criadoEm: string
  iniciadoEm: string | null
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

function normalizarStatusFilaQualidade(
  status: string
): Extract<QualidadeLoteStatus, 'pendente' | 'em_revisao'> {
  return status === 'em_revisao' ? 'em_revisao' : 'pendente'
}

function normalizarStatusQualidade(status: string): QualidadeLoteStatus {
  if (status === 'pendente' || status === 'em_revisao' || status === 'revisado' || status === 'cancelado') {
    return status
  }

  return 'pendente'
}

function normalizarClassificacaoDefeito(classificacao: string): QualidadeDefeitoClassificacao {
  if (
    classificacao === 'maquina' ||
    classificacao === 'operador' ||
    classificacao === 'processo' ||
    classificacao === 'materia_prima'
  ) {
    return classificacao
  }

  return 'processo'
}

function produtosPorIdTemId(produtos: ProdutoFilaRow[], produtoId: string): boolean {
  return produtos.some((produto) => produto.id === produtoId)
}

export async function listarCatalogoDefeitosQualidadeComClient(
  supabase: SupabaseClient<Database>
): Promise<QualidadeDefeitoCatalogoItem[]> {
  const { data, error } = await supabase
    .from('qualidade_defeitos')
    .select('id, nome, classificacao, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .returns<QualidadeDefeitoCatalogoRow[]>()

  if (error) {
    if (isSchemaQualidadeIndisponivel(error)) {
      return []
    }

    throw new Error(`Erro ao listar catálogo de defeitos da qualidade: ${error.message}`)
  }

  return (data ?? []).map((defeito) => ({
    id: defeito.id,
    nome: defeito.nome,
    classificacao: normalizarClassificacaoDefeito(defeito.classificacao),
    ordem: defeito.ordem,
  }))
}

export async function listarFilaLotesQualidadeTurnoComClient(
  supabase: SupabaseClient<Database>,
  turnoId: string
): Promise<QualidadeLoteFilaItem[]> {
  if (!turnoId) {
    return []
  }

  const { data: lotes, error: lotesError } = await supabase
    .from('qualidade_lotes')
    .select(
      'id, turno_id, turno_op_id, produto_id, turno_setor_operacao_id_origem, operacao_id_origem, setor_id_origem, quantidade_lote, status, criado_em, iniciado_em'
    )
    .eq('turno_id', turnoId)
    .in('status', ['pendente', 'em_revisao'])
    .order('criado_em', { ascending: true })
    .returns<QualidadeLoteFilaRow[]>()

  if (lotesError) {
    if (isSchemaQualidadeIndisponivel(lotesError)) {
      return []
    }

    throw new Error(`Erro ao listar lotes pendentes da qualidade: ${lotesError.message}`)
  }

  const lotesFila = lotes ?? []

  if (lotesFila.length === 0) {
    return []
  }

  const turnoOpIds = Array.from(new Set(lotesFila.map((lote) => lote.turno_op_id)))
  const produtoIds = Array.from(
    new Set(lotesFila.map((lote) => lote.produto_id).filter((id): id is string => Boolean(id)))
  )
  const setorIds = Array.from(new Set(lotesFila.map((lote) => lote.setor_id_origem)))
  const operacaoIds = Array.from(new Set(lotesFila.map((lote) => lote.operacao_id_origem)))

  const [
    { data: turnoOps, error: turnoOpsError },
    { data: produtos, error: produtosError },
    { data: setores, error: setoresError },
    { data: operacoes, error: operacoesError },
  ] = await Promise.all([
    supabase
      .from('turno_ops')
      .select('id, numero_op, produto_id')
      .in('id', turnoOpIds)
      .returns<TurnoOpFilaRow[]>(),
    produtoIds.length > 0
      ? supabase
          .from('produtos')
          .select('id, nome, referencia')
          .in('id', produtoIds)
          .returns<ProdutoFilaRow[]>()
      : Promise.resolve({ data: [] as ProdutoFilaRow[], error: null }),
    supabase.from('setores').select('id, nome').in('id', setorIds).returns<SetorFilaRow[]>(),
    supabase
      .from('operacoes')
      .select('id, codigo, descricao')
      .in('id', operacaoIds)
      .returns<OperacaoFilaRow[]>(),
  ])

  if (turnoOpsError) {
    throw new Error(`Erro ao carregar OPs dos lotes de qualidade: ${turnoOpsError.message}`)
  }

  if (produtosError) {
    throw new Error(`Erro ao carregar produtos dos lotes de qualidade: ${produtosError.message}`)
  }

  if (setoresError) {
    throw new Error(`Erro ao carregar setores dos lotes de qualidade: ${setoresError.message}`)
  }

  if (operacoesError) {
    throw new Error(`Erro ao carregar operações dos lotes de qualidade: ${operacoesError.message}`)
  }

  const turnoOpsPorId = new Map((turnoOps ?? []).map((turnoOp) => [turnoOp.id, turnoOp]))
  const produtosPorId = new Map((produtos ?? []).map((produto) => [produto.id, produto]))
  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))
  const operacoesPorId = new Map((operacoes ?? []).map((operacao) => [operacao.id, operacao]))

  return lotesFila.map((lote) => {
    const turnoOp = turnoOpsPorId.get(lote.turno_op_id) ?? null
    const produto = lote.produto_id ? produtosPorId.get(lote.produto_id) ?? null : null
    const setor = setoresPorId.get(lote.setor_id_origem) ?? null
    const operacao = operacoesPorId.get(lote.operacao_id_origem) ?? null

    return {
      id: lote.id,
      turnoId: lote.turno_id,
      turnoOpId: lote.turno_op_id,
      numeroOp: turnoOp?.numero_op ?? lote.turno_op_id,
      produtoId: lote.produto_id,
      produtoNome: produto?.nome ?? 'Produto não identificado',
      produtoReferencia: produto?.referencia ?? 'Sem referência',
      turnoSetorOperacaoIdOrigem: lote.turno_setor_operacao_id_origem,
      operacaoIdOrigem: lote.operacao_id_origem,
      operacaoCodigoOrigem: operacao?.codigo ?? '—',
      operacaoDescricaoOrigem: operacao?.descricao ?? 'Operação não identificada',
      setorIdOrigem: lote.setor_id_origem,
      setorNomeOrigem: setor?.nome ?? 'Setor não identificado',
      quantidadeLote: lote.quantidade_lote,
      status: normalizarStatusFilaQualidade(lote.status),
      criadoEm: lote.criado_em,
      iniciadoEm: lote.iniciado_em,
    }
  })
}

export async function listarIndicadoresQualidadeTurnoComClient(
  supabase: SupabaseClient<Database>,
  turnoId: string
): Promise<QualidadeIndicadoresTurnoV2 | null> {
  if (!turnoId) {
    return null
  }

  const [
    { data: lotes, error: lotesError },
    { data: registros, error: registrosError },
  ] = await Promise.all([
    supabase
      .from('qualidade_lotes')
      .select('id, turno_op_id, produto_id, quantidade_lote, status, criado_em, registro_producao_id')
      .eq('turno_id', turnoId)
      .returns<QualidadeLoteIndicadorRow[]>(),
    supabase
      .from('qualidade_registros')
      .select(
        'id, qualidade_lote_id, quantidade_aprovada, quantidade_reprovada, quantidade_revisada, turno_op_id'
      )
      .eq('turno_id', turnoId)
      .returns<QualidadeRegistroIndicadorRow[]>(),
  ])

  if (lotesError) {
    if (isSchemaQualidadeIndisponivel(lotesError)) {
      return null
    }

    throw new Error(`Erro ao listar lotes para indicadores de qualidade: ${lotesError.message}`)
  }

  if (registrosError) {
    if (isSchemaQualidadeIndisponivel(registrosError)) {
      return null
    }

    throw new Error(
      `Erro ao listar revisões para indicadores de qualidade: ${registrosError.message}`
    )
  }

  const lotesQualidade = lotes ?? []
  const registrosQualidade = registros ?? []

  if (lotesQualidade.length === 0 && registrosQualidade.length === 0) {
    return null
  }

  const registroQualidadeIds = registrosQualidade.map((registro) => registro.id)
  const turnoOpIds = Array.from(
    new Set([
      ...lotesQualidade.map((lote) => lote.turno_op_id),
      ...registrosQualidade.map((registro) => registro.turno_op_id),
    ])
  )
  const produtoIds = Array.from(
    new Set(lotesQualidade.map((lote) => lote.produto_id).filter((id): id is string => Boolean(id)))
  )
  const registroProducaoIds = Array.from(
    new Set(
      lotesQualidade
        .map((lote) => lote.registro_producao_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const [
    { data: detalhes, error: detalhesError },
    { data: turnoOps, error: turnoOpsError },
    { data: produtos, error: produtosError },
    { data: registrosProducao, error: registrosProducaoError },
  ] = await Promise.all([
    registroQualidadeIds.length > 0
      ? supabase
          .from('qualidade_detalhes')
          .select('qualidade_defeito_id, qualidade_registro_id, quantidade_defeito')
          .in('qualidade_registro_id', registroQualidadeIds)
          .returns<QualidadeDetalheIndicadorRow[]>()
      : Promise.resolve({ data: [] as QualidadeDetalheIndicadorRow[], error: null }),
    turnoOpIds.length > 0
      ? supabase
          .from('turno_ops')
          .select('id, numero_op, produto_id')
          .in('id', turnoOpIds)
          .returns<TurnoOpFilaRow[]>()
      : Promise.resolve({ data: [] as TurnoOpFilaRow[], error: null }),
    produtoIds.length > 0
      ? supabase
          .from('produtos')
          .select('id, nome, referencia')
          .in('id', produtoIds)
          .returns<ProdutoFilaRow[]>()
      : Promise.resolve({ data: [] as ProdutoFilaRow[], error: null }),
    registroProducaoIds.length > 0
      ? supabase
          .from('registros_producao')
          .select('id, operador_id')
          .in('id', registroProducaoIds)
          .returns<RegistroProducaoIndicadorRow[]>()
      : Promise.resolve({ data: [] as RegistroProducaoIndicadorRow[], error: null }),
  ])

  if (detalhesError) {
    if (isSchemaQualidadeIndisponivel(detalhesError)) {
      return null
    }

    throw new Error(
      `Erro ao listar detalhes para indicadores de qualidade: ${detalhesError.message}`
    )
  }

  if (turnoOpsError) {
    throw new Error(`Erro ao carregar OPs dos indicadores de qualidade: ${turnoOpsError.message}`)
  }

  if (produtosError) {
    throw new Error(`Erro ao carregar produtos dos indicadores de qualidade: ${produtosError.message}`)
  }

  if (registrosProducaoError) {
    throw new Error(
      `Erro ao carregar apontamentos de origem dos indicadores de qualidade: ${registrosProducaoError.message}`
    )
  }

  let produtosIndicadores = produtos ?? []
  const produtoIdsComplementares = Array.from(
    new Set(
      (turnoOps ?? [])
        .map((turnoOp) => turnoOp.produto_id)
        .filter((id): id is string => Boolean(id) && !produtosPorIdTemId(produtosIndicadores, id))
    )
  )

  if (produtoIdsComplementares.length > 0) {
    const { data: produtosComplementares, error: produtosComplementaresError } = await supabase
      .from('produtos')
      .select('id, nome, referencia')
      .in('id', produtoIdsComplementares)
      .returns<ProdutoFilaRow[]>()

    if (produtosComplementaresError) {
      throw new Error(
        `Erro ao carregar produtos complementares dos indicadores de qualidade: ${produtosComplementaresError.message}`
      )
    }

    produtosIndicadores = [...produtosIndicadores, ...(produtosComplementares ?? [])]
  }

  const detalhesQualidade = detalhes ?? []
  const qualidadeDefeitoIds = Array.from(
    new Set(
      detalhesQualidade
        .map((detalhe) => detalhe.qualidade_defeito_id)
        .filter((id): id is string => Boolean(id))
    )
  )
  const operadorIds = Array.from(
    new Set(
      (registrosProducao ?? [])
        .map((registro) => registro.operador_id)
        .filter((id): id is string => Boolean(id))
    )
  )

  const [
    { data: defeitosCatalogo, error: defeitosCatalogoError },
    { data: operadores, error: operadoresError },
  ] = await Promise.all([
    qualidadeDefeitoIds.length > 0
      ? supabase
          .from('qualidade_defeitos')
          .select('id, nome, classificacao, ordem')
          .in('id', qualidadeDefeitoIds)
          .returns<QualidadeDefeitoCatalogoRow[]>()
      : Promise.resolve({ data: [] as QualidadeDefeitoCatalogoRow[], error: null }),
    operadorIds.length > 0
      ? supabase
          .from('operadores')
          .select('id, nome')
          .in('id', operadorIds)
          .returns<OperadorIndicadorRow[]>()
      : Promise.resolve({ data: [] as OperadorIndicadorRow[], error: null }),
  ])

  if (defeitosCatalogoError) {
    throw new Error(
      `Erro ao carregar catálogo dos indicadores de qualidade: ${defeitosCatalogoError.message}`
    )
  }

  if (operadoresError) {
    throw new Error(
      `Erro ao carregar operadores dos indicadores de qualidade: ${operadoresError.message}`
    )
  }

  const turnoOpsPorId = new Map((turnoOps ?? []).map((turnoOp) => [turnoOp.id, turnoOp]))
  const produtosPorId = new Map(produtosIndicadores.map((produto) => [produto.id, produto]))
  const registrosProducaoPorId = new Map(
    (registrosProducao ?? []).map((registro) => [registro.id, registro])
  )
  const operadoresPorId = new Map((operadores ?? []).map((operador) => [operador.id, operador]))
  const defeitosPorId = new Map((defeitosCatalogo ?? []).map((defeito) => [defeito.id, defeito]))

  function resolverProduto(turnoOpId: string, produtoId: string | null) {
    const turnoOp = turnoOpsPorId.get(turnoOpId) ?? null
    const produto =
      (produtoId ? produtosPorId.get(produtoId) ?? null : null) ??
      (turnoOp?.produto_id ? produtosPorId.get(turnoOp.produto_id) ?? null : null)

    return {
      numeroOp: turnoOp?.numero_op ?? turnoOpId,
      produtoReferencia: produto?.referencia ?? 'Sem referência',
      produtoNome: produto?.nome ?? 'Produto não identificado',
    }
  }

  const lotesEntrada: QualidadeLoteIndicadorEntrada[] = lotesQualidade.map((lote) => {
    const origemProducao = lote.registro_producao_id
      ? registrosProducaoPorId.get(lote.registro_producao_id) ?? null
      : null
    const operador = origemProducao ? operadoresPorId.get(origemProducao.operador_id) ?? null : null
    const produto = resolverProduto(lote.turno_op_id, lote.produto_id)

    return {
      id: lote.id,
      turnoOpId: lote.turno_op_id,
      numeroOp: produto.numeroOp,
      produtoReferencia: produto.produtoReferencia,
      produtoNome: produto.produtoNome,
      status: normalizarStatusQualidade(lote.status),
      quantidadeLote: lote.quantidade_lote,
      criadoEm: lote.criado_em,
      operadorId: operador?.id ?? null,
      operadorNome: operador?.nome ?? null,
    }
  })

  const registrosEntrada: QualidadeRegistroIndicadorEntrada[] = registrosQualidade.map((registro) => {
    const lote = registro.qualidade_lote_id
      ? lotesQualidade.find((item) => item.id === registro.qualidade_lote_id) ?? null
      : null
    const produto = resolverProduto(registro.turno_op_id, lote?.produto_id ?? null)

    return {
      id: registro.id,
      qualidadeLoteId: registro.qualidade_lote_id,
      turnoOpId: registro.turno_op_id,
      numeroOp: produto.numeroOp,
      produtoReferencia: produto.produtoReferencia,
      produtoNome: produto.produtoNome,
      quantidadeAprovada: registro.quantidade_aprovada,
      quantidadeReprovada: registro.quantidade_reprovada,
      quantidadeRevisada: registro.quantidade_revisada,
    }
  })

  const detalhesEntrada: QualidadeDetalheIndicadorEntrada[] = detalhesQualidade.map((detalhe) => {
    const defeito = detalhe.qualidade_defeito_id
      ? defeitosPorId.get(detalhe.qualidade_defeito_id) ?? null
      : null

    return {
      qualidadeRegistroId: detalhe.qualidade_registro_id,
      qualidadeDefeitoId: detalhe.qualidade_defeito_id,
      defeitoNome: defeito?.nome ?? 'Defeito não catalogado',
      quantidadeDefeito: detalhe.quantidade_defeito,
    }
  })

  return calcularIndicadoresQualidadeTurno({
    lotes: lotesEntrada,
    registros: registrosEntrada,
    detalhes: detalhesEntrada,
  })
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
