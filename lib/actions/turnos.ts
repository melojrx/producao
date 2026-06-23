'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { abrirTurnoDjango, encerrarTurnoDjango } from '@/lib/django/actions/turnos'
import { DjangoApiError } from '@/lib/django/client'
import { estaUsandoDjango } from '@/lib/django/flags'
import { buscarPlanejamentoTurnoPorId } from '@/lib/queries/turnos'
import { createAdminClient } from '@/lib/supabase/admin'
import { ABRIR_TURNO_FORM_FIELDS } from '@/lib/utils/turno-formulario'
import {
  calcularQuantidadePlanejadaRemanescenteCarryOver,
  consolidarDemandasCarryOverComOperacoes,
  normalizarDemandasCarryOverEntreTurnos,
} from '@/lib/utils/carry-over-turno'
import { validarNovaOpFisica } from '@/lib/utils/op-fisica'
import { setorParticipaFluxoProdutivoAtivo } from '@/lib/utils/qualidade'
import type {
  AdicionarTurnoOpV2Input,
  CarregarPendenciasTurnoAnteriorInput,
  CriarTurnoV2Input,
  EditarTurnoOpV2Input,
  FormActionState,
  PlanejamentoTurnoV2,
  TurnoSetorDemandaStatusV2,
  TurnoOpPlanejadaInput,
} from '@/types'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

type TurnoRow = Tables<'turnos'>
type TurnoInsert = TablesInsert<'turnos'>
type TurnoUpdate = TablesUpdate<'turnos'>
type TurnoOperadorInsert = TablesInsert<'turno_operadores'>
type TurnoOpRow = Tables<'turno_ops'>
type TurnoOpInsert = TablesInsert<'turno_ops'>
type TurnoOpUpdate = TablesUpdate<'turno_ops'>
type TurnoSetorDemandaRow = Tables<'turno_setor_demandas'>
type TurnoSetorDemandaUpdate = TablesUpdate<'turno_setor_demandas'>
type TurnoOpFisicaRow = Pick<
  TurnoOpRow,
  'id' | 'numero_op' | 'status' | 'turno_op_origem_id' | 'quantidade_planejada_remanescente'
>

type ProdutoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia' | 'ativo'>
type ProdutoOperacaoRow = Pick<Tables<'produto_operacoes'>, 'operacao_id'>
type OperacaoSetorRow = Pick<Tables<'operacoes'>, 'id' | 'setor_id'>
type SetorResumoRow = Pick<Tables<'setores'>, 'id' | 'nome' | 'modo_apontamento'>
type OperadorRow = Pick<Tables<'operadores'>, 'id' | 'status'>

interface ProdutoValidado {
  id: string
  nome: string
  referencia: string
}

interface ResultadoActionTurno<T> extends FormActionState {
  data?: T
}

export interface AbrirTurnoV2ActionState extends FormActionState {
  turnoId?: string
}

interface TurnoOpInsercaoInput extends TurnoOpPlanejadaInput {
  quantidadePlanejadaOriginal?: number
  quantidadePlanejadaRemanescente?: number
  turnoOpOrigemId?: string | null
}

interface TurnoOpCarryOver {
  id: string
  numeroOp: string
  produtoId: string
  quantidadePlanejada: number
  quantidadePlanejadaOriginal: number
  quantidadePlanejadaRemanescente: number
  quantidadeRealizada: number
  turnoOpOrigemId: string | null
  status: TurnoOpRow['status']
}

interface TurnoSetorDemandaCarryOverFluxoRow {
  id: string
  turno_op_id: string
  setor_id: string
  quantidade_planejada: number
  quantidade_herdada_setor: number
  quantidade_realizada: number
  quantidade_liberada_setor: number
  status: TurnoSetorDemandaRow['status']
  iniciado_em: string | null
  encerrado_em: string | null
        setores:
    | {
        codigo: number
        nome: string
        modo_apontamento: string
      }
    | {
        codigo: number
        nome: string
        modo_apontamento: string
      }[]
    | null
}

interface TurnoSetorOperacaoCarryOverRow {
  turno_op_id: string
  turno_setor_demanda_id: string | null
  setor_id: string
  quantidade_realizada: number
}

interface DemandaCarryOverSaldo {
  turno_op_id: string
  quantidade_planejada: number
  quantidade_herdada_setor: number
  quantidade_realizada: number
}

function extrairRegistroUnico<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) {
    return null
  }

  return Array.isArray(valor) ? valor[0] ?? null : valor
}

function inteiroPositivo(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0
}

function normalizarTexto(valor: string): string {
  return valor.trim()
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

function obterBooleano(formData: FormData, campo: string): boolean {
  const valor = formData.get(campo)
  return valor === 'true'
}

function validarTurnoOpPlanejada(value: unknown): value is TurnoOpPlanejadaInput {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.numeroOp === 'string' &&
    typeof candidate.produtoId === 'string' &&
    typeof candidate.quantidadePlanejada === 'number'
  )
}

function parseTurnoOpsPlanejadas(raw: string): { data?: TurnoOpPlanejadaInput[]; erro?: string } {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return { erro: 'A lista de OPs planejadas é inválida.' }
    }

    if (!parsed.every(validarTurnoOpPlanejada)) {
      return { erro: 'Uma ou mais OPs planejadas possuem formato inválido.' }
    }

    return { data: parsed }
  } catch {
    return { erro: 'Não foi possível ler as OPs planejadas do formulário.' }
  }
}

function parseStringArray(raw: string, nomeCampo: string): { data?: string[]; erro?: string } {
  if (!raw) {
    return { data: [] }
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return { erro: `A lista de ${nomeCampo} é inválida.` }
    }

    return { data: parsed }
  } catch {
    return { erro: `Não foi possível ler ${nomeCampo} do formulário.` }
  }
}

function formatarErroPadrao(prefixo: string, erro: unknown): string {
  if (erro instanceof Error && erro.message) {
    return `${prefixo}: ${erro.message}`
  }

  return `${prefixo}.`
}

async function validarAcessoAdmin(): Promise<{ erro?: string }> {
  try {
    await requireAdminUser({ redirectOnFail: false })
    return {}
  } catch (error) {
    return {
      erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
    }
  }
}

function validarPayloadTurnoOp(input: TurnoOpPlanejadaInput): string | null {
  if (!normalizarTexto(input.numeroOp)) {
    return 'O número da OP é obrigatório.'
  }

  if (!input.produtoId) {
    return 'O produto da OP é obrigatório.'
  }

  if (!inteiroPositivo(input.quantidadePlanejada)) {
    return 'A quantidade planejada da OP deve ser um número inteiro maior que zero.'
  }

  return null
}

async function validarNumeroOpComoContainerFisico(input: {
  numeroOp: string
  turnoOpOrigemId?: string | null
  ignorarTurnoOpId?: string | null
}): Promise<string | null> {
  const supabase = createAdminClient()
  const numeroOp = normalizarTexto(input.numeroOp)

  const { data, error } = await supabase
    .from('turno_ops')
    .select('id, numero_op, status, turno_op_origem_id, quantidade_planejada_remanescente')
    .eq('numero_op', numeroOp)
    .returns<TurnoOpFisicaRow[]>()

  if (error) {
    return `Erro ao validar histórico físico da OP: ${error.message}`
  }

  const validacao = validarNovaOpFisica({
    numeroOp,
    turnoOpOrigemId: input.turnoOpOrigemId,
    ignorarTurnoOpId: input.ignorarTurnoOpId,
    opsExistentes: (data ?? []).map((op) => ({
      id: op.id,
      numeroOp: op.numero_op,
      status: op.status,
      turnoOpOrigemId: op.turno_op_origem_id,
      quantidadePlanejadaRemanescente: op.quantidade_planejada_remanescente,
    })),
  })

  return validacao.permitido ? null : validacao.mensagem ?? 'A OP informada já existe.'
}

async function validarOperadores(turnoId: string, operadorIds: string[]): Promise<string | null> {
  const idsUnicos = Array.from(new Set(operadorIds.filter(Boolean)))

  if (idsUnicos.length === 0) {
    return null
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('operadores')
    .select('id, status')
    .in('id', idsUnicos)
    .returns<OperadorRow[]>()

  if (error) {
    return `Erro ao validar operadores do turno: ${error.message}`
  }

  if (!data || data.length !== idsUnicos.length) {
    return 'Um ou mais operadores informados não foram encontrados.'
  }

  const operadorInvalido = data.find((operador) => operador.status !== 'ativo')
  if (operadorInvalido) {
    return 'Apenas operadores com status ativo podem ser alocados no turno.'
  }

  const payloadOperadores: TurnoOperadorInsert[] = idsUnicos.map((operadorId) => ({
    turno_id: turnoId,
    operador_id: operadorId,
    setor_id: null,
  }))

  const { error: insertError } = await supabase.from('turno_operadores').insert(payloadOperadores)

  if (insertError) {
    return `Erro ao alocar operadores no turno: ${insertError.message}`
  }

  return null
}

async function validarProdutoPlanejado(
  produtoId: string
): Promise<{ produto?: ProdutoValidado; erro?: string }> {
  const supabase = createAdminClient()

  const [
    { data: produto, error: produtoError },
    { data: roteiro, error: roteiroError },
  ] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, referencia, ativo')
      .eq('id', produtoId)
      .maybeSingle<ProdutoRow>(),
    supabase
      .from('produto_operacoes')
      .select('operacao_id')
      .eq('produto_id', produtoId)
      .eq('vigente', true)
      .returns<ProdutoOperacaoRow[]>(),
  ])

  if (produtoError || !produto) {
    return { erro: 'Produto da OP não encontrado.' }
  }

  if (produto.ativo !== true) {
    return { erro: `O produto ${produto.nome} está inativo e não pode ser planejado.` }
  }

  if (roteiroError) {
    return { erro: `Erro ao carregar roteiro do produto: ${roteiroError.message}` }
  }

  const operacaoIds = (roteiro ?? [])
    .map((item) => item.operacao_id)
    .filter((operacaoId): operacaoId is string => Boolean(operacaoId))

  if (operacaoIds.length === 0) {
    return {
      erro: `O produto ${produto.nome} não possui roteiro configurado e não pode ser usado no turno.`,
    }
  }

  const { data: operacoes, error: operacoesError } = await supabase
    .from('operacoes')
    .select('id, setor_id')
    .in('id', operacaoIds)
    .returns<OperacaoSetorRow[]>()

  if (operacoesError) {
    return { erro: `Erro ao validar operações do produto: ${operacoesError.message}` }
  }

  if (!operacoes || operacoes.length !== operacaoIds.length) {
    return { erro: `O roteiro do produto ${produto.nome} possui operações inválidas.` }
  }

  const possuiOperacaoSemSetor = operacoes.some((operacao) => operacao.setor_id === null)
  if (possuiOperacaoSemSetor) {
    return {
      erro: `O produto ${produto.nome} possui operações sem setor e não pode derivar demandas setoriais do turno.`,
    }
  }

  const setorIds = Array.from(
    new Set(operacoes.map((operacao) => operacao.setor_id).filter((setorId): setorId is string => Boolean(setorId)))
  )
  const { data: setores, error: setoresError } = await supabase
    .from('setores')
    .select('id, nome, modo_apontamento')
    .in('id', setorIds)
    .returns<SetorResumoRow[]>()

  if (setoresError) {
    return { erro: `Erro ao validar setores do produto: ${setoresError.message}` }
  }

  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))
  const possuiOperacaoProdutivaAtiva = operacoes.some((operacao) => {
    if (!operacao.setor_id) {
      return false
    }

    const setor = setoresPorId.get(operacao.setor_id)
    return Boolean(
      setor && setorParticipaFluxoProdutivoAtivo(setor.nome, setor.modo_apontamento)
    )
  })

  if (!possuiOperacaoProdutivaAtiva) {
    return {
      erro: `O produto ${produto.nome} precisa possuir ao menos uma operação produtiva ativa no roteiro. Qualidade legado não compõe mais o fluxo do turno.`,
    }
  }

  return {
    produto: {
      id: produto.id,
      nome: produto.nome,
      referencia: produto.referencia,
    },
  }
}

async function buscarTurnoAbertoRow(): Promise<TurnoRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(
      'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
    )
    .eq('status', 'aberto')
    .order('iniciado_em', { ascending: false })
    .maybeSingle<TurnoRow>()

  if (error || !data) {
    return null
  }

  return data
}

async function buscarUltimoTurnoEncerradoRow(): Promise<TurnoRow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('turnos')
    .select(
      'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
    )
    .eq('status', 'encerrado')
    .order('encerrado_em', { ascending: false, nullsFirst: false })
    .limit(1)
    .returns<TurnoRow[]>()

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0]
}

async function listarTurnoOpsCarryOver(turnoId: string): Promise<{
  data?: TurnoOpCarryOver[]
  erro?: string
}> {
  const supabase = createAdminClient()

  const { data: ops, error: opsError } = await supabase
    .from('turno_ops')
    .select(
      'id, numero_op, produto_id, quantidade_planejada, quantidade_planejada_original, quantidade_planejada_remanescente, quantidade_realizada, turno_op_origem_id, status'
    )
    .eq('turno_id', turnoId)
    .order('created_at', { ascending: true })
    .returns<
      Pick<
        TurnoOpRow,
        | 'id'
        | 'numero_op'
        | 'produto_id'
        | 'quantidade_planejada'
        | 'quantidade_planejada_original'
        | 'quantidade_planejada_remanescente'
        | 'quantidade_realizada'
        | 'turno_op_origem_id'
        | 'status'
      >[]
    >()

  if (opsError) {
    return { erro: `Erro ao listar OPs para carry-over: ${opsError.message}` }
  }

  const { data: demandas, error: demandasError } = await supabase
    .from('turno_setor_demandas')
    .select(
      'id, turno_op_id, setor_id, quantidade_planejada, quantidade_herdada_setor, quantidade_realizada'
    )
    .eq('turno_id', turnoId)
    .returns<
      Pick<
        TurnoSetorDemandaRow,
        | 'id'
        | 'turno_op_id'
        | 'setor_id'
        | 'quantidade_planejada'
        | 'quantidade_herdada_setor'
        | 'quantidade_realizada'
      >[]
    >()

  if (demandasError) {
    return {
      erro: `Erro ao consolidar demandas setoriais para carry-over: ${demandasError.message}`,
    }
  }

  const { data: operacoes, error: operacoesError } = await supabase
    .from('turno_setor_operacoes')
    .select('turno_op_id, turno_setor_demanda_id, setor_id, quantidade_realizada')
    .eq('turno_id', turnoId)
    .returns<TurnoSetorOperacaoCarryOverRow[]>()

  if (operacoesError) {
    return {
      erro: `Erro ao consolidar operações setoriais para carry-over: ${operacoesError.message}`,
    }
  }

  const setorIds = Array.from(
    new Set([
      ...(demandas ?? []).map((demanda) => demanda.setor_id),
      ...(operacoes ?? []).map((operacao) => operacao.setor_id),
    ].filter((setorId): setorId is string => Boolean(setorId)))
  )
  const { data: setores, error: setoresError } = setorIds.length
    ? await supabase
        .from('setores')
        .select('id, nome, modo_apontamento')
        .in('id', setorIds)
        .returns<SetorResumoRow[]>()
    : { data: [], error: null }

  if (setoresError) {
    return {
      erro: `Erro ao carregar setores para carry-over: ${setoresError.message}`,
    }
  }

  const setoresPorId = new Map((setores ?? []).map((setor) => [setor.id, setor]))
  const demandasProdutivas = (demandas ?? []).filter((demanda) => {
    const setor = setoresPorId.get(demanda.setor_id)
    return Boolean(setor && setorParticipaFluxoProdutivoAtivo(setor.nome, setor.modo_apontamento))
  })
  const operacoesProdutivas = (operacoes ?? []).filter((operacao) => {
    const setor = setoresPorId.get(operacao.setor_id)
    return Boolean(setor && setorParticipaFluxoProdutivoAtivo(setor.nome, setor.modo_apontamento))
  })

  const demandasConsolidadas = consolidarDemandasCarryOverComOperacoes(
    demandasProdutivas.map((demanda) => ({
      id: demanda.id,
      turnoOpId: demanda.turno_op_id,
      setorId: demanda.setor_id,
      quantidadePlanejada: demanda.quantidade_planejada,
      quantidadeHerdadaSetor: demanda.quantidade_herdada_setor,
      quantidadeRealizada: demanda.quantidade_realizada,
    })),
    operacoesProdutivas.map((operacao) => ({
      turnoOpId: operacao.turno_op_id,
      turnoSetorDemandaId: operacao.turno_setor_demanda_id,
      setorId: operacao.setor_id,
      quantidadeRealizada: operacao.quantidade_realizada,
    }))
  )
  const demandasPorTurnoOpId = new Map<string, DemandaCarryOverSaldo[]>()

  for (const demanda of demandasConsolidadas) {
    const demandasTurnoOp = demandasPorTurnoOpId.get(demanda.turnoOpId) ?? []
    demandasTurnoOp.push({
      turno_op_id: demanda.turnoOpId,
      quantidade_planejada: demanda.quantidadePlanejada,
      quantidade_herdada_setor: demanda.quantidadeHerdadaSetor ?? 0,
      quantidade_realizada: demanda.quantidadeRealizada,
    })
    demandasPorTurnoOpId.set(demanda.turnoOpId, demandasTurnoOp)
  }

  return {
    data: (ops ?? []).map((op) => {
      const demandasTurnoOp = demandasPorTurnoOpId.get(op.id) ?? []
      const quantidadeRealizadaConsolidada =
        demandasTurnoOp.length > 0
          ? Math.min(...demandasTurnoOp.map((demanda) => demanda.quantidade_realizada))
          : op.quantidade_realizada
      const quantidadeProgressoOperacionalConsolidada =
        demandasTurnoOp.length > 0
          ? Math.min(
              ...demandasTurnoOp.map(
                (demanda) =>
                  demanda.quantidade_herdada_setor + demanda.quantidade_realizada
              )
            )
          : op.quantidade_realizada

      const quantidadeRealizada = Math.max(
        0,
        Math.min(op.quantidade_planejada, quantidadeRealizadaConsolidada)
      )
      const quantidadePlanejadaRemanescente = calcularQuantidadePlanejadaRemanescenteCarryOver({
        quantidadePlanejadaOrigem: op.quantidade_planejada,
        demandasOrigem: demandasTurnoOp.map((demanda) => ({
          quantidadeHerdadaSetor: demanda.quantidade_herdada_setor,
          quantidadeRealizada: demanda.quantidade_realizada,
        })),
        quantidadeRealizadaFallback: quantidadeProgressoOperacionalConsolidada,
      })

      return {
        id: op.id,
        numeroOp: op.numero_op,
        produtoId: op.produto_id,
        quantidadePlanejada: op.quantidade_planejada,
        quantidadePlanejadaOriginal: op.quantidade_planejada_original,
        quantidadePlanejadaRemanescente,
        quantidadeRealizada,
        turnoOpOrigemId: op.turno_op_origem_id,
        status: op.status,
      }
    }),
  }
}

async function atualizarSaldosTurnoOps(turnoId: string): Promise<{ erro?: string }> {
  const supabase = createAdminClient()
  const { data: opsCarryOver, erro } = await listarTurnoOpsCarryOver(turnoId)

  if (erro || !opsCarryOver) {
    return { erro }
  }

  for (const op of opsCarryOver) {
    const payload: TurnoOpUpdate = {
      quantidade_realizada: op.quantidadeRealizada,
      quantidade_planejada_remanescente: op.quantidadePlanejadaRemanescente,
      quantidade_planejada_original: op.quantidadePlanejadaOriginal,
      status: op.quantidadePlanejadaRemanescente === 0 ? 'concluida' : undefined,
    }

    const { error } = await supabase.from('turno_ops').update(payload).eq('id', op.id)
    if (error) {
      return { erro: `Erro ao atualizar saldo remanescente da OP ${op.numeroOp}: ${error.message}` }
    }
  }

  return {}
}

async function selecionarPendenciasTurnoAnterior(
  turnoOrigemId: string,
  turnoOpIds?: string[]
): Promise<{ data?: TurnoOpCarryOver[]; erro?: string }> {
  const { data: opsCarryOver, erro } = await listarTurnoOpsCarryOver(turnoOrigemId)

  if (erro || !opsCarryOver) {
    return { erro }
  }

  const pendencias = opsCarryOver.filter((op) => op.quantidadePlanejadaRemanescente > 0)

  if (pendencias.length === 0) {
    return {
      erro: 'O turno anterior não possui pendências com saldo remanescente para carry-over.',
    }
  }

  if (!turnoOpIds || turnoOpIds.length === 0) {
    return { data: pendencias }
  }

  const idsSelecionados = new Set(turnoOpIds.filter(Boolean))
  const pendenciasSelecionadas = pendencias.filter((op) => idsSelecionados.has(op.id))

  if (pendenciasSelecionadas.length !== idsSelecionados.size) {
    return {
      erro: 'Uma ou mais OPs selecionadas para carry-over não pertencem às pendências do turno de origem.',
    }
  }

  return { data: pendenciasSelecionadas }
}

async function encerrarTurnoInternamente(turnoId: string): Promise<{ erro?: string }> {
  const supabase = createAdminClient()
  const encerradoEm = new Date().toISOString()

  const { erro: erroSaldos } = await atualizarSaldosTurnoOps(turnoId)
  if (erroSaldos) {
    return { erro: erroSaldos }
  }

  const { error: secoesError } = await supabase
    .from('turno_setor_ops')
    .update({
      status: 'encerrada_manualmente',
      encerrado_em: encerradoEm,
    })
    .eq('turno_id', turnoId)
    .in('status', ['planejada', 'aberta', 'em_andamento'])

  if (secoesError) {
    return { erro: `Erro ao encerrar seções do turno: ${secoesError.message}` }
  }

  const { error: demandasError } = await supabase
    .from('turno_setor_demandas')
    .update({
      status: 'encerrada_manualmente',
      encerrado_em: encerradoEm,
    })
    .eq('turno_id', turnoId)
    .in('status', ['planejada', 'aberta', 'em_andamento'])

  if (demandasError) {
    return { erro: `Erro ao encerrar demandas setoriais do turno: ${demandasError.message}` }
  }

  const { error: setoresError } = await supabase
    .from('turno_setores')
    .update({
      status: 'encerrada_manualmente',
      encerrado_em: encerradoEm,
    })
    .eq('turno_id', turnoId)
    .in('status', ['planejada', 'aberta', 'em_andamento'])

  if (setoresError) {
    return { erro: `Erro ao encerrar setores ativos do turno: ${setoresError.message}` }
  }

  const { error: opsError } = await supabase
    .from('turno_ops')
    .update({
      status: 'encerrada_manualmente',
      encerrado_em: encerradoEm,
    })
    .eq('turno_id', turnoId)
    .in('status', ['planejada', 'em_andamento'])

  if (opsError) {
    return { erro: `Erro ao encerrar OPs do turno: ${opsError.message}` }
  }

  const payloadTurno: TurnoUpdate = {
    status: 'encerrado',
    encerrado_em: encerradoEm,
  }

  const { error: turnoError } = await supabase.from('turnos').update(payloadTurno).eq('id', turnoId)

  if (turnoError) {
    return { erro: `Erro ao encerrar turno: ${turnoError.message}` }
  }

  return {}
}

async function inserirTurnoOp(
  turnoId: string,
  input: TurnoOpInsercaoInput
): Promise<{ turnoOp?: TurnoOpRow; erro?: string }> {
  const supabase = createAdminClient()
  const numeroOp = normalizarTexto(input.numeroOp)

  const { data: duplicada, error: duplicadaError } = await supabase
    .from('turno_ops')
    .select('id')
    .eq('turno_id', turnoId)
    .eq('numero_op', numeroOp)
    .maybeSingle()

  if (duplicadaError) {
    return { erro: `Erro ao validar número da OP no turno: ${duplicadaError.message}` }
  }

  if (duplicada) {
    return { erro: `A OP ${numeroOp} já está cadastrada neste turno.` }
  }

  const erroContainerFisico = await validarNumeroOpComoContainerFisico({
    numeroOp,
    turnoOpOrigemId: input.turnoOpOrigemId,
  })

  if (erroContainerFisico) {
    return { erro: erroContainerFisico }
  }

  const payload: TurnoOpInsert = {
    turno_id: turnoId,
    numero_op: numeroOp,
    produto_id: input.produtoId,
    quantidade_planejada: input.quantidadePlanejada,
    quantidade_planejada_original: input.quantidadePlanejadaOriginal ?? input.quantidadePlanejada,
    quantidade_planejada_remanescente:
      input.quantidadePlanejadaRemanescente ?? input.quantidadePlanejada,
    turno_op_origem_id: input.turnoOpOrigemId ?? null,
  }

  const { data, error } = await supabase
    .from('turno_ops')
    .insert(payload)
    .select(
      'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em, created_at, updated_at'
    )
    .single<TurnoOpRow>()

  if (error || !data) {
    return { erro: `Erro ao adicionar OP ao turno: ${error?.message ?? 'sem retorno do banco'}` }
  }

  return { turnoOp: data }
}

async function hidratarProgressoCarryOverDaOp(
  turnoOpOrigemId: string,
  turnoOpDestinoId: string,
  quantidadePlanejadaDestino: number
): Promise<{ erro?: string }> {
  const supabase = createAdminClient()

  const { data: demandasOrigem, error: demandasOrigemError } = await supabase
    .from('turno_setor_demandas')
    .select(
      `
        id,
        turno_op_id,
        setor_id,
        quantidade_planejada,
        quantidade_herdada_setor,
        quantidade_realizada,
        quantidade_liberada_setor,
        status,
        iniciado_em,
        encerrado_em,
        setores!inner (
          codigo,
          nome,
          modo_apontamento
        )
      `
    )
    .eq('turno_op_id', turnoOpOrigemId)
    .order('created_at', { ascending: true })
    .returns<TurnoSetorDemandaCarryOverFluxoRow[]>()

  if (demandasOrigemError) {
    return {
      erro: `Erro ao carregar as demandas do turno anterior para carry-over: ${demandasOrigemError.message}`,
    }
  }

  if (!demandasOrigem || demandasOrigem.length === 0) {
    return {}
  }

  const { data: operacoesOrigem, error: operacoesOrigemError } = await supabase
    .from('turno_setor_operacoes')
    .select('turno_op_id, turno_setor_demanda_id, setor_id, quantidade_realizada')
    .eq('turno_op_id', turnoOpOrigemId)
    .returns<TurnoSetorOperacaoCarryOverRow[]>()

  if (operacoesOrigemError) {
    return {
      erro: `Erro ao carregar operações do turno anterior para carry-over: ${operacoesOrigemError.message}`,
    }
  }

  const demandasOrigemNormalizadas = (demandasOrigem ?? [])
    .map((demanda) => {
      const setor = extrairRegistroUnico(demanda.setores)

      if (!setor) {
        return null
      }

      if (!setorParticipaFluxoProdutivoAtivo(setor.nome, setor.modo_apontamento)) {
        return null
      }

      return {
        id: demanda.id,
        turnoOpId: demanda.turno_op_id,
        setorId: demanda.setor_id,
        setorCodigo: setor.codigo,
        setorNome: setor.nome,
        quantidadePlanejada: demanda.quantidade_planejada,
        quantidadeHerdadaSetor: demanda.quantidade_herdada_setor,
        quantidadeRealizada: demanda.quantidade_realizada,
        quantidadeLiberadaSetor: demanda.quantidade_liberada_setor,
        status: demanda.status as TurnoSetorDemandaStatusV2,
        iniciadoEm: demanda.iniciado_em,
        encerradoEm: demanda.encerrado_em,
      }
    })
    .filter(
      (
        demanda
      ): demanda is {
        id: string
        turnoOpId: string
        setorId: string
        setorCodigo: number
        setorNome: string
        quantidadePlanejada: number
        quantidadeHerdadaSetor: number
        quantidadeRealizada: number
        quantidadeLiberadaSetor: number
        status: TurnoSetorDemandaStatusV2
        iniciadoEm: string | null
        encerradoEm: string | null
      } => Boolean(demanda)
    )
  const demandasOrigemConsolidadas = consolidarDemandasCarryOverComOperacoes(
    demandasOrigemNormalizadas,
    (operacoesOrigem ?? []).map((operacao) => ({
      turnoOpId: operacao.turno_op_id,
      turnoSetorDemandaId: operacao.turno_setor_demanda_id,
      setorId: operacao.setor_id,
      quantidadeRealizada: operacao.quantidade_realizada,
    }))
  )

  const snapshotsCarryOverPorSetorId = new Map(
    normalizarDemandasCarryOverEntreTurnos({
      quantidadePlanejadaDestino,
      demandasOrigem: demandasOrigemConsolidadas,
    }).map((snapshot) => [snapshot.setorId, snapshot] as const)
  )

  const setoresComCarryOver = [...snapshotsCarryOverPorSetorId.entries()].filter(
    ([, snapshot]) =>
      snapshot.quantidadeHerdadaDestino > 0 ||
      snapshot.quantidadeLiberadaDestino > 0 ||
      snapshot.demandaConcluidaDestino
  )

  if (setoresComCarryOver.length === 0) {
    return {}
  }

  for (const [setorId, snapshot] of setoresComCarryOver) {
    const payload: TurnoSetorDemandaUpdate = {
      quantidade_herdada_setor: snapshot.quantidadeHerdadaDestino,
      quantidade_liberada_setor: snapshot.quantidadeLiberadaDestino,
    }

    if (snapshot.demandaConcluidaDestino) {
      payload.status = 'concluida'
    }

    const { error: updateDemandaError } = await supabase
      .from('turno_setor_demandas')
      .update(payload)
      .eq('turno_op_id', turnoOpDestinoId)
      .eq('setor_id', setorId)

    if (updateDemandaError) {
      return {
        erro: `Erro ao persistir quantidade liberada no carry-over do setor ${setorId}: ${updateDemandaError.message}`,
      }
    }
  }

  return {}
}

async function carregarPendenciasTurnoAnteriorInternamente(
  input: CarregarPendenciasTurnoAnteriorInput
): Promise<{ erro?: string }> {
  const { data: pendenciasSelecionadas, erro } = await selecionarPendenciasTurnoAnterior(
    input.turnoOrigemId,
    input.turnoOpIds
  )

  if (erro || !pendenciasSelecionadas) {
    return { erro }
  }

  for (const pendencia of pendenciasSelecionadas) {
    const { turnoOp, erro: erroInsercao } = await inserirTurnoOp(input.turnoDestinoId, {
      numeroOp: pendencia.numeroOp,
      produtoId: pendencia.produtoId,
      quantidadePlanejada: pendencia.quantidadePlanejadaRemanescente,
      quantidadePlanejadaOriginal: pendencia.quantidadePlanejadaOriginal,
      quantidadePlanejadaRemanescente: pendencia.quantidadePlanejadaRemanescente,
      turnoOpOrigemId: pendencia.turnoOpOrigemId ?? pendencia.id,
    })

    if (erroInsercao) {
      return { erro: erroInsercao }
    }

    if (!turnoOp) {
      return {
        erro: `A OP ${pendencia.numeroOp} foi criada no carry-over, mas não retornou do banco para hidratar o progresso anterior.`,
      }
    }

    const { erro: erroHidratacao } = await hidratarProgressoCarryOverDaOp(
      pendencia.id,
      turnoOp.id,
      turnoOp.quantidade_planejada
    )

    if (erroHidratacao) {
      return { erro: erroHidratacao }
    }
  }

  return {}
}

export async function abrirTurno(
  input: CriarTurnoV2Input
): Promise<ResultadoActionTurno<PlanejamentoTurnoV2>> {
  const { erro: erroAutorizacao } = await validarAcessoAdmin()
  if (erroAutorizacao) {
    return { sucesso: false, erro: erroAutorizacao }
  }

  if (!inteiroPositivo(input.operadoresDisponiveis) || !inteiroPositivo(input.minutosTurno)) {
    return {
      sucesso: false,
      erro: 'Operadores disponíveis e minutos do turno devem ser números inteiros maiores que zero.',
    }
  }

  if (input.ops.length === 0 && !input.carregarPendenciasTurnoAnterior) {
    return {
      sucesso: false,
      erro: 'Informe pelo menos uma OP ou carregue pendências do turno anterior para abrir o turno.',
    }
  }

  const numerosOp = new Set<string>()

  for (const op of input.ops) {
    const erroPayload = validarPayloadTurnoOp(op)
    if (erroPayload) {
      return { sucesso: false, erro: erroPayload }
    }

    const numeroOp = normalizarTexto(op.numeroOp)
    if (numerosOp.has(numeroOp)) {
      return {
        sucesso: false,
        erro: `A OP ${numeroOp} foi informada mais de uma vez no mesmo turno.`,
      }
    }

    numerosOp.add(numeroOp)

    if (!estaUsandoDjango('admin_writes')) {
      const { erro: erroProduto } = await validarProdutoPlanejado(op.produtoId)
      if (erroProduto) {
        return { sucesso: false, erro: erroProduto }
      }
    }
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      const planejamento = await abrirTurnoDjango(input)
      revalidatePath('/admin/dashboard')
      revalidatePath('/admin/apontamentos')
      revalidatePath('/scanner')

      return {
        sucesso: true,
        data: planejamento,
      }
    } catch (error) {
      if (error instanceof DjangoApiError) {
        return { sucesso: false, erro: error.message }
      }

      if (error instanceof Error) {
        return { sucesso: false, erro: error.message }
      }

      throw error
    }
  }

  const supabase = createAdminClient()
  let turnoCriadoId: string | null = null

  try {
    const turnoAberto = await buscarTurnoAbertoRow()
    let turnoOrigemPendenciasId = normalizarTexto(input.turnoOrigemPendenciasId ?? '') || null
    let pendenciasSelecionadas: TurnoOpCarryOver[] = []

    if (input.carregarPendenciasTurnoAnterior) {
      if (!turnoOrigemPendenciasId) {
        turnoOrigemPendenciasId = turnoAberto?.id ?? (await buscarUltimoTurnoEncerradoRow())?.id ?? null
      }

      if (!turnoOrigemPendenciasId) {
        return {
          sucesso: false,
          erro: 'Nenhum turno anterior com pendências foi encontrado para carry-over.',
        }
      }

      const { data: pendencias, erro: erroPendencias } = await selecionarPendenciasTurnoAnterior(
        turnoOrigemPendenciasId,
        input.turnoOpIdsPendentes
      )

      if (erroPendencias || !pendencias) {
        return { sucesso: false, erro: erroPendencias }
      }

      pendenciasSelecionadas = pendencias
    }

    const numerosOpNovoTurno = new Set<string>()

    for (const op of input.ops) {
      numerosOpNovoTurno.add(normalizarTexto(op.numeroOp))
    }

    for (const pendencia of pendenciasSelecionadas) {
      if (numerosOpNovoTurno.has(normalizarTexto(pendencia.numeroOp))) {
        return {
          sucesso: false,
          erro: `A OP ${pendencia.numeroOp} foi informada manualmente e também selecionada no carry-over.`,
        }
      }
    }

    if (turnoAberto) {
      const { erro: erroEncerramentoAtual } = await encerrarTurnoInternamente(turnoAberto.id)
      if (erroEncerramentoAtual) {
        return { sucesso: false, erro: erroEncerramentoAtual }
      }
    }

    const payloadTurno: TurnoInsert = {
      operadores_disponiveis: input.operadoresDisponiveis,
      minutos_turno: input.minutosTurno,
      observacao: normalizarTexto(input.observacao ?? '') || null,
      status: 'aberto',
    }

    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .insert(payloadTurno)
      .select(
        'id, iniciado_em, encerrado_em, operadores_disponiveis, minutos_turno, status, observacao, created_at, updated_at'
      )
      .single<TurnoRow>()

    if (turnoError || !turno) {
      return {
        sucesso: false,
        erro: `Erro ao abrir turno: ${turnoError?.message ?? 'sem retorno do banco'}`,
      }
    }

    turnoCriadoId = turno.id

    const erroOperadores = await validarOperadores(turno.id, input.operadorIds ?? [])
    if (erroOperadores) {
      throw new Error(erroOperadores)
    }

    if (input.carregarPendenciasTurnoAnterior && turnoOrigemPendenciasId) {
      const { erro: erroCarryOver } = await carregarPendenciasTurnoAnteriorInternamente({
        turnoOrigemId: turnoOrigemPendenciasId,
        turnoDestinoId: turno.id,
        turnoOpIds: input.turnoOpIdsPendentes,
      })

      if (erroCarryOver) {
        throw new Error(erroCarryOver)
      }
    }

    for (const op of input.ops) {
      const { erro: erroInsercao } = await inserirTurnoOp(turno.id, {
        ...op,
        numeroOp: normalizarTexto(op.numeroOp),
      })

      if (erroInsercao) {
        throw new Error(erroInsercao)
      }
    }

    const planejamento = await buscarPlanejamentoTurnoPorId(turno.id)
    if (!planejamento) {
      throw new Error('O turno foi criado, mas não pôde ser recarregado para a dashboard.')
    }

    revalidatePath('/admin/dashboard')
    revalidatePath('/scanner')

    return {
      sucesso: true,
      data: planejamento,
    }
  } catch (error) {
    if (turnoCriadoId) {
      await supabase.from('turnos').delete().eq('id', turnoCriadoId)
    }

    return {
      sucesso: false,
      erro: formatarErroPadrao('Não foi possível abrir o turno', error),
    }
  }
}

export async function adicionarOpAoTurno(
  input: AdicionarTurnoOpV2Input
): Promise<ResultadoActionTurno<PlanejamentoTurnoV2>> {
  const { erro: erroAutorizacao } = await validarAcessoAdmin()
  if (erroAutorizacao) {
    return { sucesso: false, erro: erroAutorizacao }
  }

  const erroPayload = validarPayloadTurnoOp(input)
  if (erroPayload) {
    return { sucesso: false, erro: erroPayload }
  }

  const supabase = createAdminClient()
  const { data: turno, error: turnoError } = await supabase
    .from('turnos')
    .select('id, status')
    .eq('id', input.turnoId)
    .maybeSingle()

  if (turnoError || !turno) {
    return { sucesso: false, erro: 'Turno não encontrado para adicionar a OP.' }
  }

  if (turno.status !== 'aberto') {
    return { sucesso: false, erro: 'Somente turnos abertos podem receber novas OPs.' }
  }

  const { erro: erroProduto } = await validarProdutoPlanejado(input.produtoId)
  if (erroProduto) {
    return { sucesso: false, erro: erroProduto }
  }

  const { erro } = await inserirTurnoOp(input.turnoId, {
    numeroOp: normalizarTexto(input.numeroOp),
    produtoId: input.produtoId,
    quantidadePlanejada: input.quantidadePlanejada,
  })

  if (erro) {
    return { sucesso: false, erro }
  }

  const planejamento = await buscarPlanejamentoTurnoPorId(input.turnoId)
  if (!planejamento) {
    return { sucesso: false, erro: 'A OP foi adicionada, mas o turno não pôde ser recarregado.' }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/relatorios')
  revalidatePath('/scanner')

  return {
    sucesso: true,
    data: planejamento,
  }
}

export async function editarOpDoTurno(
  input: EditarTurnoOpV2Input
): Promise<ResultadoActionTurno<PlanejamentoTurnoV2>> {
  const { erro: erroAutorizacao } = await validarAcessoAdmin()
  if (erroAutorizacao) {
    return { sucesso: false, erro: erroAutorizacao }
  }

  const erroPayload = validarPayloadTurnoOp(input)
  if (erroPayload) {
    return { sucesso: false, erro: erroPayload }
  }

  const supabase = createAdminClient()
  const { data: turnoOpAtual, error: turnoOpError } = await supabase
    .from('turno_ops')
    .select(
      'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_planejada_original, quantidade_planejada_remanescente, quantidade_realizada, turno_op_origem_id, status, iniciado_em, encerrado_em, created_at, updated_at'
    )
    .eq('id', input.turnoOpId)
    .maybeSingle<TurnoOpRow>()

  if (turnoOpError || !turnoOpAtual) {
    return { sucesso: false, erro: 'OP do turno não encontrada para edição.' }
  }

  const { data: turnoAtual, error: turnoError } = await supabase
    .from('turnos')
    .select('id, status')
    .eq('id', turnoOpAtual.turno_id)
    .maybeSingle<Pick<TurnoRow, 'id' | 'status'>>()

  if (turnoError || !turnoAtual) {
    return { sucesso: false, erro: 'Turno não encontrado para editar a OP.' }
  }

  if (turnoAtual.status !== 'aberto') {
    return { sucesso: false, erro: 'Somente turnos abertos permitem editar OP existente.' }
  }

  const numeroOp = normalizarTexto(input.numeroOp)
  const mudouNumero = turnoOpAtual.numero_op !== numeroOp
  const mudouProduto = turnoOpAtual.produto_id !== input.produtoId
  const mudouQuantidade = turnoOpAtual.quantidade_planejada !== input.quantidadePlanejada
  const houveMudancaEstrutural = mudouNumero || mudouProduto || mudouQuantidade

  if (houveMudancaEstrutural) {
    const { erro: erroProduto } = await validarProdutoPlanejado(input.produtoId)
    if (erroProduto) {
      return { sucesso: false, erro: erroProduto }
    }

    const { data: demandas, error: demandasError } = await supabase
      .from('turno_setor_demandas')
      .select('id, quantidade_realizada')
      .eq('turno_op_id', input.turnoOpId)
      .returns<Pick<TurnoSetorDemandaRow, 'id' | 'quantidade_realizada'>[]>()

    if (demandasError) {
      return {
        sucesso: false,
        erro: `Erro ao validar demandas setoriais existentes da OP: ${demandasError.message}`,
      }
    }

    const possuiRealizado = (demandas ?? []).some((demanda) => demanda.quantidade_realizada > 0)
    if (possuiRealizado) {
      return {
        sucesso: false,
        erro: 'Esta OP já possui produção apontada e não pode mais receber alterações estruturais.',
      }
    }
  }

  const { data: duplicada, error: duplicadaError } = await supabase
    .from('turno_ops')
    .select('id')
    .eq('turno_id', turnoOpAtual.turno_id)
    .eq('numero_op', numeroOp)
    .neq('id', input.turnoOpId)
    .maybeSingle()

  if (duplicadaError) {
    return { sucesso: false, erro: `Erro ao validar número da OP: ${duplicadaError.message}` }
  }

  if (duplicada) {
    return { sucesso: false, erro: `A OP ${numeroOp} já existe neste turno.` }
  }

  if (mudouNumero) {
    const erroContainerFisico = await validarNumeroOpComoContainerFisico({
      numeroOp,
      ignorarTurnoOpId: input.turnoOpId,
    })

    if (erroContainerFisico) {
      return { sucesso: false, erro: erroContainerFisico }
    }
  }

  const payload: TurnoOpUpdate = {
    numero_op: numeroOp,
    produto_id: input.produtoId,
    quantidade_planejada: input.quantidadePlanejada,
    quantidade_planejada_original:
      turnoOpAtual.quantidade_planejada_original ?? input.quantidadePlanejada,
    quantidade_planejada_remanescente: input.quantidadePlanejada,
  }

  const { error: updateError } = await supabase
    .from('turno_ops')
    .update(payload)
    .eq('id', input.turnoOpId)

  if (updateError) {
    return { sucesso: false, erro: `Erro ao editar OP do turno: ${updateError.message}` }
  }

  const planejamento = await buscarPlanejamentoTurnoPorId(turnoOpAtual.turno_id)
  if (!planejamento) {
    return { sucesso: false, erro: 'A OP foi atualizada, mas o turno não pôde ser recarregado.' }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/admin/relatorios')
  revalidatePath('/scanner')

  return {
    sucesso: true,
    data: planejamento,
  }
}

export async function encerrarTurno(
  turnoId?: string
): Promise<ResultadoActionTurno<{ turnoId: string }>> {
  const { erro: erroAutorizacao } = await validarAcessoAdmin()
  if (erroAutorizacao) {
    return { sucesso: false, erro: erroAutorizacao }
  }

  const turnoAlvoId = turnoId ?? (await buscarTurnoAbertoRow())?.id ?? null

  if (!turnoAlvoId) {
    return { sucesso: false, erro: 'Nenhum turno aberto foi encontrado para encerramento.' }
  }

  if (estaUsandoDjango('admin_writes')) {
    try {
      await encerrarTurnoDjango(turnoAlvoId)
    } catch (error) {
      if (error instanceof DjangoApiError) {
        return { sucesso: false, erro: error.message }
      }

      throw error
    }
  } else {
    const { erro } = await encerrarTurnoInternamente(turnoAlvoId)
    if (erro) {
      return { sucesso: false, erro }
    }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath('/admin/apontamentos')
  revalidatePath('/scanner')

  return {
    sucesso: true,
    data: { turnoId: turnoAlvoId },
  }
}

export async function abrirTurnoFormulario(
  _prevState: AbrirTurnoV2ActionState,
  formData: FormData
): Promise<AbrirTurnoV2ActionState> {
  const { data: ops, erro: erroOps } = parseTurnoOpsPlanejadas(
    obterTexto(formData, ABRIR_TURNO_FORM_FIELDS.opsPlanejadas)
  )
  if (erroOps || !ops) {
    return {
      sucesso: false,
      erro: erroOps,
    }
  }

  const { data: operadorIds, erro: erroOperadores } = parseStringArray(
    obterTexto(formData, ABRIR_TURNO_FORM_FIELDS.operadorIds),
    'operadores selecionados'
  )

  if (erroOperadores || !operadorIds) {
    return {
      sucesso: false,
      erro: erroOperadores,
    }
  }

  const { data: turnoOpIdsPendentes, erro: erroPendencias } = parseStringArray(
    obterTexto(formData, ABRIR_TURNO_FORM_FIELDS.turnoOpIdsPendentes),
    'as pendências selecionadas'
  )

  if (erroPendencias || !turnoOpIdsPendentes) {
    return {
      sucesso: false,
      erro: erroPendencias,
    }
  }

  const resultado = await abrirTurno({
    operadoresDisponiveis: obterInteiro(formData, ABRIR_TURNO_FORM_FIELDS.operadoresDisponiveis),
    minutosTurno: obterInteiro(formData, ABRIR_TURNO_FORM_FIELDS.minutosTurno),
    observacao: obterTexto(formData, 'observacao'),
    operadorIds,
    ops,
    carregarPendenciasTurnoAnterior: obterBooleano(
      formData,
      ABRIR_TURNO_FORM_FIELDS.carregarPendenciasTurnoAnterior
    ),
    turnoOrigemPendenciasId:
      obterTexto(formData, ABRIR_TURNO_FORM_FIELDS.turnoOrigemPendenciasId) || null,
    turnoOpIdsPendentes,
  })

  if (!resultado.sucesso) {
    return {
      sucesso: false,
      erro: resultado.erro,
    }
  }

  return {
    sucesso: true,
    turnoId: resultado.data?.turno.id,
  }
}
