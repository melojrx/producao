'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { obterDataHojeLocal } from '@/lib/utils/data'
import { calcularMetaGrupo, calcularTpProduto } from '@/lib/utils/producao'
import type { FormActionState, OrigemTpBloco, StatusConfiguracaoTurnoBloco } from '@/types'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

type ConfiguracaoTurnoRow = Pick<
  Tables<'configuracao_turno'>,
  'id' | 'data' | 'funcionarios_ativos' | 'minutos_turno'
>

type ConfiguracaoTurnoBlocoRow = Tables<'configuracao_turno_blocos'>
type ConfiguracaoTurnoBlocoInsert = TablesInsert<'configuracao_turno_blocos'>
type ConfiguracaoTurnoBlocoUpdate = TablesUpdate<'configuracao_turno_blocos'>
type ProdutoOperacaoRow = Pick<Tables<'produto_operacoes'>, 'operacao_id'>
type OperacaoTempoRow = Pick<Tables<'operacoes'>, 'id' | 'tempo_padrao_min'>
type ProdutoResumoRow = Pick<Tables<'produtos'>, 'id' | 'nome' | 'referencia' | 'ativo'>

export interface BlocoTurnoInput {
  configuracaoTurnoId: string
  produtoId?: string | null
  descricaoBloco?: string
  sequencia: number
  funcionariosAtivos: number
  minutosPlanejados: number
  origemTp: OrigemTpBloco
  tpProdutoManual?: number | null
}

export interface BlocoTurnoResultado {
  sucesso: boolean
  bloco?: ConfiguracaoTurnoBlocoRow
  erro?: string
}

export interface ReordenarBlocosTurnoInput {
  configuracaoTurnoId: string
  blocoIdsEmOrdem: string[]
}

interface PlanejamentoBlocoPayload {
  descricaoBloco?: string
  funcionariosAtivos: number
  minutosPlanejados: number
  origemTp: OrigemTpBloco
  produtoId?: string | null
  sequencia: number
  status?: StatusConfiguracaoTurnoBloco
  tpProdutoManual?: number | null
}

interface BlocoCalculado {
  produtoId: string | null
  descricaoBloco: string
  funcionariosAtivos: number
  minutosPlanejados: number
  tpProdutoMin: number
  origemTp: OrigemTpBloco
  metaGrupo: number
}

function inteiroPositivo(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0
}

function decimalPositivo(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0
}

function normalizarDescricao(descricao: string | undefined): string {
  return descricao?.trim() ?? ''
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

function obterDescricaoProduto(produto: ProdutoResumoRow): string {
  return `${produto.nome} (${produto.referencia})`
}

function obterMensagemAutorizacao(error: unknown): { sucesso: false; erro: string } {
  return {
    sucesso: false,
    erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.',
  }
}

async function carregarConfiguracaoTurno(
  configuracaoTurnoId: string
): Promise<ConfiguracaoTurnoRow | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('configuracao_turno')
    .select('id, data, funcionarios_ativos, minutos_turno')
    .eq('id', configuracaoTurnoId)
    .maybeSingle<ConfiguracaoTurnoRow>()

  if (error || !data) {
    return null
  }

  return data
}

async function carregarProdutoComTp(
  produtoId: string
): Promise<{ produto: ProdutoResumoRow; tpProdutoMin: number } | { erro: string }> {
  const supabase = createAdminClient()

  const [
    { data: produto, error: produtoError },
    { data: roteiro, error: roteiroError },
  ] = await Promise.all([
    supabase
      .from('produtos')
      .select('id, nome, referencia, ativo')
      .eq('id', produtoId)
      .maybeSingle<ProdutoResumoRow>(),
    supabase
      .from('produto_operacoes')
      .select('operacao_id')
      .eq('produto_id', produtoId)
      .returns<ProdutoOperacaoRow[]>(),
  ])

  if (produtoError || !produto) {
    return { erro: 'Produto não encontrado para o bloco planejado.' }
  }

  if (produto.ativo !== true) {
    return { erro: 'Produto inativo não pode ser usado no planejamento do turno.' }
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

  const tpProdutoMin = calcularTpProduto(
    operacoes.map((operacao) => ({
      tempoPadraoMin: operacao.tempo_padrao_min,
    }))
  )

  if (!decimalPositivo(tpProdutoMin)) {
    return { erro: 'O T.P do produto calculado é inválido.' }
  }

  return { produto, tpProdutoMin }
}

async function calcularBloco(input: BlocoTurnoInput): Promise<BlocoCalculado | { erro: string }> {
  if (!inteiroPositivo(input.sequencia)) {
    return { erro: 'A sequência do bloco deve ser um número inteiro maior que zero.' }
  }

  if (!inteiroPositivo(input.funcionariosAtivos)) {
    return { erro: 'Funcionários ativos do bloco devem ser um número inteiro maior que zero.' }
  }

  if (!inteiroPositivo(input.minutosPlanejados)) {
    return { erro: 'Minutos planejados do bloco devem ser um número inteiro maior que zero.' }
  }

  if (input.origemTp === 'produto') {
    if (!input.produtoId) {
      return { erro: 'Selecione um produto para blocos com T.P de origem produto.' }
    }

    const resultadoProduto = await carregarProdutoComTp(input.produtoId)
    if ('erro' in resultadoProduto) {
      return resultadoProduto
    }

    const descricaoBloco =
      normalizarDescricao(input.descricaoBloco) || obterDescricaoProduto(resultadoProduto.produto)

    return {
      produtoId: resultadoProduto.produto.id,
      descricaoBloco,
      funcionariosAtivos: input.funcionariosAtivos,
      minutosPlanejados: input.minutosPlanejados,
      tpProdutoMin: resultadoProduto.tpProdutoMin,
      origemTp: 'produto',
      metaGrupo: calcularMetaGrupo(
        input.funcionariosAtivos,
        input.minutosPlanejados,
        resultadoProduto.tpProdutoMin
      ),
    }
  }

  const descricaoBloco = normalizarDescricao(input.descricaoBloco)
  if (!descricaoBloco) {
    return { erro: 'Informe uma descrição para blocos com T.P manual.' }
  }

  if (!decimalPositivo(input.tpProdutoManual ?? Number.NaN)) {
    return { erro: 'O T.P manual do bloco deve ser maior que zero.' }
  }

  const tpProdutoMin = Number(input.tpProdutoManual)

  return {
    produtoId: null,
    descricaoBloco,
    funcionariosAtivos: input.funcionariosAtivos,
    minutosPlanejados: input.minutosPlanejados,
    tpProdutoMin,
    origemTp: 'manual',
    metaGrupo: calcularMetaGrupo(input.funcionariosAtivos, input.minutosPlanejados, tpProdutoMin),
  }
}

async function listarBlocosPorConfiguracao(
  configuracaoTurnoId: string
): Promise<ConfiguracaoTurnoBlocoRow[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .select('*')
    .eq('configuracao_turno_id', configuracaoTurnoId)
    .order('sequencia', { ascending: true })
    .returns<ConfiguracaoTurnoBlocoRow[]>()

  if (error) {
    throw new Error(`Erro ao listar blocos do turno: ${error.message}`)
  }

  return data ?? []
}

async function sincronizarCabecalhoTurno(configuracaoTurnoId: string): Promise<void> {
  const supabase = createAdminClient()
  const blocos = await listarBlocosPorConfiguracao(configuracaoTurnoId)

  const metaGrupoTotal = blocos.reduce((soma, bloco) => soma + bloco.meta_grupo, 0)
  const blocoUnico = blocos.length === 1 ? blocos[0] : null

  const payload: TablesUpdate<'configuracao_turno'> = {
    meta_grupo: blocos.length > 0 ? metaGrupoTotal : null,
    produto_id:
      blocoUnico && blocoUnico.origem_tp === 'produto' ? blocoUnico.produto_id : null,
    tp_produto_min: blocoUnico ? blocoUnico.tp_produto_min : null,
  }

  const { error } = await supabase
    .from('configuracao_turno')
    .update(payload)
    .eq('id', configuracaoTurnoId)

  if (error) {
    throw new Error(`Erro ao sincronizar cabeçalho do turno: ${error.message}`)
  }
}

function revalidarFluxosTurno(): void {
  revalidatePath('/admin/dashboard')
  revalidatePath('/scanner')
}

function isPlanejamentoBlocoPayload(value: unknown): value is PlanejamentoBlocoPayload {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  const statusValido =
    item.status === undefined ||
    item.status === 'planejado' ||
    item.status === 'ativo' ||
    item.status === 'concluido'

  return (
    (item.origemTp === 'produto' || item.origemTp === 'manual') &&
    typeof item.sequencia === 'number' &&
    Number.isInteger(item.sequencia) &&
    item.sequencia > 0 &&
    typeof item.funcionariosAtivos === 'number' &&
    Number.isInteger(item.funcionariosAtivos) &&
    item.funcionariosAtivos > 0 &&
    typeof item.minutosPlanejados === 'number' &&
    Number.isInteger(item.minutosPlanejados) &&
    item.minutosPlanejados > 0 &&
    (item.produtoId === undefined || item.produtoId === null || typeof item.produtoId === 'string') &&
    (item.descricaoBloco === undefined || typeof item.descricaoBloco === 'string') &&
    (item.tpProdutoManual === undefined ||
      item.tpProdutoManual === null ||
      typeof item.tpProdutoManual === 'number') &&
    statusValido
  )
}

function lerPlanejamentoDoForm(
  formData: FormData
): PlanejamentoBlocoPayload[] | null {
  const valor = formData.get('planejamento_blocos')

  if (typeof valor !== 'string' || !valor) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(valor)
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || !parsed.every(isPlanejamentoBlocoPayload)) {
    return null
  }

  return parsed
    .slice()
    .sort((primeiro, segundo) => primeiro.sequencia - segundo.sequencia)
    .map((bloco, index) => ({
      ...bloco,
      sequencia: index + 1,
    }))
}

async function salvarCabecalhoTurno(
  funcionariosAtivos: number,
  minutosTurno: number
): Promise<{ id: string } | { erro: string }> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('configuracao_turno')
    .upsert(
      {
        data: obterDataHojeLocal(),
        funcionarios_ativos: funcionariosAtivos,
        minutos_turno: minutosTurno,
        produto_id: null,
        tp_produto_min: null,
        meta_grupo: null,
      },
      { onConflict: 'data' }
    )
    .select('id')
    .single()

  if (error || !data) {
    return {
      erro: `Erro ao salvar cabeçalho do turno: ${error?.message ?? 'erro desconhecido'}`,
    }
  }

  return { id: data.id }
}

export async function salvarPlanejamentoTurnoFormulario(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  const minutosTurno = obterInteiro(formData, 'minutos_turno')
  const planejamento = lerPlanejamentoDoForm(formData)
  const blocoAtivoSequencia = obterTexto(formData, 'bloco_ativo_sequencia')
  const blocoAtivo = blocoAtivoSequencia ? Number.parseInt(blocoAtivoSequencia, 10) : 1

  if (!inteiroPositivo(minutosTurno)) {
    return {
      sucesso: false,
      erro: 'Minutos do turno devem ser um número inteiro maior que zero.',
    }
  }

  if (!planejamento || planejamento.length === 0) {
    return {
      sucesso: false,
      erro: 'Adicione pelo menos um bloco ao planejamento do dia.',
    }
  }

  const funcionariosAtivosTotal = planejamento.reduce(
    (soma, bloco) => soma + bloco.funcionariosAtivos,
    0
  )

  if (!inteiroPositivo(funcionariosAtivosTotal)) {
    return {
      sucesso: false,
      erro: 'A soma de funcionários dos blocos deve ser maior que zero.',
    }
  }

  const cabecalho = await salvarCabecalhoTurno(funcionariosAtivosTotal, minutosTurno)
  if ('erro' in cabecalho) {
    return { sucesso: false, erro: cabecalho.erro }
  }

  const supabase = createAdminClient()

  const blocosCalculados: ConfiguracaoTurnoBlocoInsert[] = []

  for (const bloco of planejamento) {
    const blocoCalculado = await calcularBloco({
      configuracaoTurnoId: cabecalho.id,
      produtoId: bloco.produtoId ?? null,
      descricaoBloco: bloco.descricaoBloco,
      sequencia: bloco.sequencia,
      funcionariosAtivos: bloco.funcionariosAtivos,
      minutosPlanejados: bloco.minutosPlanejados,
      origemTp: bloco.origemTp,
      tpProdutoManual: bloco.tpProdutoManual ?? null,
    })

    if ('erro' in blocoCalculado) {
      return { sucesso: false, erro: blocoCalculado.erro }
    }

    const status: StatusConfiguracaoTurnoBloco =
      bloco.sequencia === blocoAtivo ? 'ativo' : bloco.status === 'concluido' ? 'concluido' : 'planejado'

    blocosCalculados.push({
      configuracao_turno_id: cabecalho.id,
      produto_id: blocoCalculado.produtoId,
      descricao_bloco: blocoCalculado.descricaoBloco,
      sequencia: bloco.sequencia,
      funcionarios_ativos: blocoCalculado.funcionariosAtivos,
      minutos_planejados: blocoCalculado.minutosPlanejados,
      tp_produto_min: blocoCalculado.tpProdutoMin,
      origem_tp: blocoCalculado.origemTp,
      meta_grupo: blocoCalculado.metaGrupo,
      status,
      iniciado_em: status === 'ativo' ? new Date().toISOString() : null,
      encerrado_em: status === 'concluido' ? new Date().toISOString() : null,
    })
  }

  const { error: deleteError } = await supabase
    .from('configuracao_turno_blocos')
    .delete()
    .eq('configuracao_turno_id', cabecalho.id)

  if (deleteError) {
    return {
      sucesso: false,
      erro: `Erro ao substituir blocos do turno: ${deleteError.message}`,
    }
  }

  const { error: insertError } = await supabase
    .from('configuracao_turno_blocos')
    .insert(blocosCalculados)

  if (insertError) {
    return {
      sucesso: false,
      erro: `Erro ao salvar blocos do turno: ${insertError.message}`,
    }
  }

  await sincronizarCabecalhoTurno(cabecalho.id)
  revalidarFluxosTurno()

  return { sucesso: true }
}

export async function criarBlocoTurno(input: BlocoTurnoInput): Promise<BlocoTurnoResultado> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  const configuracaoTurno = await carregarConfiguracaoTurno(input.configuracaoTurnoId)
  if (!configuracaoTurno) {
    return { sucesso: false, erro: 'Configuração do turno não encontrada.' }
  }

  const blocoCalculado = await calcularBloco(input)
  if ('erro' in blocoCalculado) {
    return { sucesso: false, erro: blocoCalculado.erro }
  }

  const supabase = createAdminClient()
  const payload: ConfiguracaoTurnoBlocoInsert = {
    configuracao_turno_id: input.configuracaoTurnoId,
    produto_id: blocoCalculado.produtoId,
    descricao_bloco: blocoCalculado.descricaoBloco,
    sequencia: input.sequencia,
    funcionarios_ativos: blocoCalculado.funcionariosAtivos,
    minutos_planejados: blocoCalculado.minutosPlanejados,
    tp_produto_min: blocoCalculado.tpProdutoMin,
    origem_tp: blocoCalculado.origemTp,
    meta_grupo: blocoCalculado.metaGrupo,
    status: 'planejado',
  }

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .insert(payload)
    .select('*')
    .single<ConfiguracaoTurnoBlocoRow>()

  if (error || !data) {
    return {
      sucesso: false,
      erro: `Erro ao criar bloco do turno: ${error?.message ?? 'erro desconhecido'}`,
    }
  }

  await sincronizarCabecalhoTurno(input.configuracaoTurnoId)
  revalidarFluxosTurno()

  return { sucesso: true, bloco: data }
}

export async function editarBlocoTurno(
  blocoId: string,
  input: BlocoTurnoInput
): Promise<BlocoTurnoResultado> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  const configuracaoTurno = await carregarConfiguracaoTurno(input.configuracaoTurnoId)
  if (!configuracaoTurno) {
    return { sucesso: false, erro: 'Configuração do turno não encontrada.' }
  }

  const supabase = createAdminClient()
  const { data: blocoAtual, error: blocoAtualError } = await supabase
    .from('configuracao_turno_blocos')
    .select('*')
    .eq('id', blocoId)
    .maybeSingle<ConfiguracaoTurnoBlocoRow>()

  if (blocoAtualError || !blocoAtual) {
    return { sucesso: false, erro: 'Bloco do turno não encontrado para edição.' }
  }

  if (blocoAtual.configuracao_turno_id !== input.configuracaoTurnoId) {
    return { sucesso: false, erro: 'O bloco informado não pertence à configuração do turno selecionada.' }
  }

  const blocoCalculado = await calcularBloco(input)
  if ('erro' in blocoCalculado) {
    return { sucesso: false, erro: blocoCalculado.erro }
  }

  const payload: ConfiguracaoTurnoBlocoUpdate = {
    produto_id: blocoCalculado.produtoId,
    descricao_bloco: blocoCalculado.descricaoBloco,
    sequencia: input.sequencia,
    funcionarios_ativos: blocoCalculado.funcionariosAtivos,
    minutos_planejados: blocoCalculado.minutosPlanejados,
    tp_produto_min: blocoCalculado.tpProdutoMin,
    origem_tp: blocoCalculado.origemTp,
    meta_grupo: blocoCalculado.metaGrupo,
  }

  const { data, error } = await supabase
    .from('configuracao_turno_blocos')
    .update(payload)
    .eq('id', blocoId)
    .select('*')
    .single<ConfiguracaoTurnoBlocoRow>()

  if (error || !data) {
    return {
      sucesso: false,
      erro: `Erro ao editar bloco do turno: ${error?.message ?? 'erro desconhecido'}`,
    }
  }

  await sincronizarCabecalhoTurno(input.configuracaoTurnoId)
  revalidarFluxosTurno()

  return { sucesso: true, bloco: data }
}

export async function ativarBlocoTurno(blocoId: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  const supabase = createAdminClient()
  const { data: bloco, error: blocoError } = await supabase
    .from('configuracao_turno_blocos')
    .select('*')
    .eq('id', blocoId)
    .maybeSingle<ConfiguracaoTurnoBlocoRow>()

  if (blocoError || !bloco) {
    return { sucesso: false, erro: 'Bloco do turno não encontrado para ativação.' }
  }

  const { error: resetError } = await supabase
    .from('configuracao_turno_blocos')
    .update({ status: 'planejado' satisfies StatusConfiguracaoTurnoBloco })
    .eq('configuracao_turno_id', bloco.configuracao_turno_id)
    .eq('status', 'ativo')
    .neq('id', bloco.id)

  if (resetError) {
    return { sucesso: false, erro: `Erro ao preparar ativação do bloco: ${resetError.message}` }
  }

  const { error: activateError } = await supabase
    .from('configuracao_turno_blocos')
    .update({
      status: 'ativo' satisfies StatusConfiguracaoTurnoBloco,
      iniciado_em: new Date().toISOString(),
    })
    .eq('id', bloco.id)

  if (activateError) {
    return { sucesso: false, erro: `Erro ao ativar bloco do turno: ${activateError.message}` }
  }

  await sincronizarCabecalhoTurno(bloco.configuracao_turno_id)
  revalidarFluxosTurno()
  return { sucesso: true }
}

export async function concluirBlocoTurno(blocoId: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  const supabase = createAdminClient()
  const { data: bloco, error: blocoError } = await supabase
    .from('configuracao_turno_blocos')
    .select('*')
    .eq('id', blocoId)
    .maybeSingle<ConfiguracaoTurnoBlocoRow>()

  if (blocoError || !bloco) {
    return { sucesso: false, erro: 'Bloco do turno não encontrado para conclusão.' }
  }

  const { error } = await supabase
    .from('configuracao_turno_blocos')
    .update({
      status: 'concluido' satisfies StatusConfiguracaoTurnoBloco,
      encerrado_em: new Date().toISOString(),
    })
    .eq('id', bloco.id)

  if (error) {
    return { sucesso: false, erro: `Erro ao concluir bloco do turno: ${error.message}` }
  }

  await sincronizarCabecalhoTurno(bloco.configuracao_turno_id)
  revalidarFluxosTurno()
  return { sucesso: true }
}

export async function reordenarBlocosTurno(
  input: ReordenarBlocosTurnoInput
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return obterMensagemAutorizacao(error)
  }

  if (!input.configuracaoTurnoId || input.blocoIdsEmOrdem.length === 0) {
    return { sucesso: false, erro: 'Informe a configuração do turno e a nova ordem dos blocos.' }
  }

  const supabase = createAdminClient()
  const { data: blocos, error: blocosError } = await supabase
    .from('configuracao_turno_blocos')
    .select('id, configuracao_turno_id')
    .eq('configuracao_turno_id', input.configuracaoTurnoId)

  if (blocosError) {
    return { sucesso: false, erro: `Erro ao carregar blocos para reordenação: ${blocosError.message}` }
  }

  const idsPersistidos = new Set((blocos ?? []).map((bloco) => bloco.id))
  if (
    idsPersistidos.size !== input.blocoIdsEmOrdem.length ||
    input.blocoIdsEmOrdem.some((blocoId) => !idsPersistidos.has(blocoId))
  ) {
    return { sucesso: false, erro: 'A nova ordem dos blocos está inconsistente com os blocos salvos.' }
  }

  for (const [index, blocoId] of input.blocoIdsEmOrdem.entries()) {
    const { error } = await supabase
      .from('configuracao_turno_blocos')
      .update({ sequencia: index + 1 })
      .eq('id', blocoId)

    if (error) {
      return { sucesso: false, erro: `Erro ao reordenar blocos: ${error.message}` }
    }
  }

  await sincronizarCabecalhoTurno(input.configuracaoTurnoId)
  revalidarFluxosTurno()
  return { sucesso: true }
}
