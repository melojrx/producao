'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { buscarPlanejamentoTurnoPorId } from '@/lib/queries/turnos'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AdicionarTurnoOpV2Input,
  CriarTurnoV2Input,
  EditarTurnoOpV2Input,
  FormActionState,
  PlanejamentoTurnoV2,
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
type TurnoSetorOpRow = Tables<'turno_setor_ops'>

type ProdutoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia' | 'ativo'>
type ProdutoOperacaoRow = Pick<Tables<'produto_operacoes'>, 'operacao_id'>
type OperacaoSetorRow = Pick<Tables<'operacoes'>, 'id' | 'setor_id'>
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

function parseOperadorIds(raw: string): { data?: string[]; erro?: string } {
  if (!raw) {
    return { data: [] }
  }

  try {
    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      return { erro: 'A lista de operadores selecionados é inválida.' }
    }

    return { data: parsed }
  } catch {
    return { erro: 'Não foi possível ler os operadores selecionados do formulário.' }
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
      erro: `O produto ${produto.nome} possui operações sem setor e não pode derivar seções do turno.`,
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

async function encerrarTurnoInternamente(turnoId: string): Promise<{ erro?: string }> {
  const supabase = createAdminClient()
  const encerradoEm = new Date().toISOString()

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
  input: TurnoOpPlanejadaInput
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

  const payload: TurnoOpInsert = {
    turno_id: turnoId,
    numero_op: numeroOp,
    produto_id: input.produtoId,
    quantidade_planejada: input.quantidadePlanejada,
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

  if (input.ops.length === 0) {
    return {
      sucesso: false,
      erro: 'Informe pelo menos uma OP para abrir o turno.',
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

    const { erro: erroProduto } = await validarProdutoPlanejado(op.produtoId)
    if (erroProduto) {
      return { sucesso: false, erro: erroProduto }
    }
  }

  const supabase = createAdminClient()
  let turnoCriadoId: string | null = null

  try {
    const turnoAberto = await buscarTurnoAbertoRow()
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
      'id, turno_id, numero_op, produto_id, quantidade_planejada, quantidade_realizada, status, iniciado_em, encerrado_em, created_at, updated_at'
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

    const { data: secoes, error: secoesError } = await supabase
      .from('turno_setor_ops')
      .select('id, quantidade_realizada')
      .eq('turno_op_id', input.turnoOpId)
      .returns<Pick<TurnoSetorOpRow, 'id' | 'quantidade_realizada'>[]>()

    if (secoesError) {
      return {
        sucesso: false,
        erro: `Erro ao validar seções existentes da OP: ${secoesError.message}`,
      }
    }

    const possuiRealizado = (secoes ?? []).some((secao) => secao.quantidade_realizada > 0)
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

  const payload: TurnoOpUpdate = {
    numero_op: numeroOp,
    produto_id: input.produtoId,
    quantidade_planejada: input.quantidadePlanejada,
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

  const { erro } = await encerrarTurnoInternamente(turnoAlvoId)
  if (erro) {
    return { sucesso: false, erro }
  }

  revalidatePath('/admin/dashboard')
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
  const { data: ops, erro: erroOps } = parseTurnoOpsPlanejadas(obterTexto(formData, 'ops_planejadas'))
  if (erroOps || !ops) {
    return {
      sucesso: false,
      erro: erroOps,
    }
  }

  const { data: operadorIds, erro: erroOperadores } = parseOperadorIds(
    obterTexto(formData, 'operador_ids')
  )

  if (erroOperadores || !operadorIds) {
    return {
      sucesso: false,
      erro: erroOperadores,
    }
  }

  const resultado = await abrirTurno({
    operadoresDisponiveis: obterInteiro(formData, 'operadores_disponiveis'),
    minutosTurno: obterInteiro(formData, 'minutos_turno'),
    observacao: obterTexto(formData, 'observacao'),
    operadorIds,
    ops,
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
