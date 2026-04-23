'use server'

import { revalidatePath } from 'next/cache'
import {
  PRODUTO_IMAGENS_BUCKET,
  PRODUTO_IMAGENS_MAX_BYTES,
  PRODUTO_IMAGENS_MIME_TYPES,
} from '@/lib/constants'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularTpProduto } from '@/lib/utils/producao'
import type { FormActionState } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>
type ProdutoRow = Tables<'produtos'>
type ProdutoOperacaoRow = Tables<'produto_operacoes'>
type AdminClient = ReturnType<typeof createAdminClient>
type ProdutoImagemTipo = 'frente' | 'costa'
type ProdutoImagemColuna = 'imagem_frente_url' | 'imagem_costa_url'

interface ProdutoImagemConfig {
  tipo: ProdutoImagemTipo
  rotulo: string
  coluna: ProdutoImagemColuna
  campoArquivo: string
  campoRemocao: string
}

interface RoteiroPayloadItem {
  operacaoId: string
  sequencia: number
}

interface DependenciasProduto {
  emTurnoAberto: boolean
  totalTurnos: number
  totalConfiguracoes: number
  totalRegistros: number
}

interface ProdutoImagemPersistida {
  id: string
  imagem_url: string | null
  imagem_frente_url: string | null
  imagem_costa_url: string | null
}

interface EstadoImagensProduto {
  imagemFrenteUrl: string | null
  imagemCostaUrl: string | null
  imagemLegadaUrl: string | null
}

interface UploadImagemProdutoResultado {
  caminho: string
  urlPublica: string
}

interface MutacaoImagensProdutoResultado {
  valores: Pick<ProdutoRow, 'imagem_url' | 'imagem_frente_url' | 'imagem_costa_url'>
  novosArquivos: string[]
  caminhosParaExcluir: string[]
}

const PRODUTO_IMAGEM_CONFIGS: readonly ProdutoImagemConfig[] = [
  {
    tipo: 'frente',
    rotulo: 'Frente',
    coluna: 'imagem_frente_url',
    campoArquivo: 'imagem_frente_arquivo',
    campoRemocao: 'remover_imagem_frente',
  },
  {
    tipo: 'costa',
    rotulo: 'Costa',
    coluna: 'imagem_costa_url',
    campoArquivo: 'imagem_costa_arquivo',
    campoRemocao: 'remover_imagem_costa',
  },
]

const EXTENSAO_POR_MIME_TYPE: Record<(typeof PRODUTO_IMAGENS_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function obterMensagemProdutoEmUso(): string {
  return 'Este produto está em uso em um turno aberto e não pode ser arquivado ou excluído no momento.'
}

function obterMensagemHistoricoProduto(): string {
  return 'Este produto já possui histórico operacional ou de planejamento e não pode ser excluído permanentemente. Use arquivar/desativar para preservar o histórico.'
}

function obterMensagemRoteiroComHistorico(): string {
  return 'Este produto já possui histórico operacional ou de planejamento e o roteiro não pode mais ser alterado. Atualize apenas dados cadastrais/imagens ou duplique o produto para criar uma nova versão.'
}

function produtoTemHistorico(dependencias: DependenciasProduto): boolean {
  return (
    dependencias.totalTurnos > 0 ||
    dependencias.totalConfiguracoes > 0 ||
    dependencias.totalRegistros > 0
  )
}

async function carregarDependenciasProduto(id: string): Promise<DependenciasProduto> {
  const supabase = createAdminClient()

  const [
    { count: totalTurnosAbertos, error: turnosAbertosError },
    { count: totalTurnos, error: turnosError },
    { count: totalConfiguracoes, error: configuracaoError },
    { count: totalRegistros, error: registrosError },
  ] = await Promise.all([
    supabase
      .from('turno_ops')
      .select('id, turnos!inner(status)', { count: 'exact', head: true })
      .eq('produto_id', id)
      .eq('turnos.status', 'aberto'),
    supabase
      .from('turno_ops')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
    supabase
      .from('configuracao_turno')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
    supabase
      .from('registros_producao')
      .select('*', { count: 'exact', head: true })
      .eq('produto_id', id),
  ])

  if (turnosAbertosError) {
    throw new Error(`Erro ao validar uso do produto em turno aberto: ${turnosAbertosError.message}`)
  }

  if (turnosError) {
    throw new Error(`Erro ao validar histórico do produto em turnos: ${turnosError.message}`)
  }

  if (configuracaoError) {
    throw new Error(`Erro ao validar configurações do produto: ${configuracaoError.message}`)
  }

  if (registrosError) {
    throw new Error(`Erro ao validar histórico do produto: ${registrosError.message}`)
  }

  return {
    emTurnoAberto: (totalTurnosAbertos ?? 0) > 0,
    totalTurnos: totalTurnos ?? 0,
    totalConfiguracoes: totalConfiguracoes ?? 0,
    totalRegistros: totalRegistros ?? 0,
  }
}

function obterTexto(formData: FormData, campo: string): string {
  const valor = formData.get(campo)
  return typeof valor === 'string' ? valor.trim() : ''
}

function obterTextoOpcional(formData: FormData, campo: string): string | null {
  const valor = obterTexto(formData, campo)
  return valor ? valor : null
}

function obterBooleano(formData: FormData, campo: string): boolean {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return false
  }

  return valor === 'true' || valor === '1' || valor === 'on'
}

function obterArquivoOpcional(formData: FormData, campo: string): File | null {
  const valor = formData.get(campo)

  if (!(valor instanceof File) || valor.size === 0) {
    return null
  }

  return valor
}

function resolverImagemUrlLegada(
  imagemFrenteUrl: string | null,
  imagemCostaUrl: string | null
): string | null {
  return imagemFrenteUrl ?? imagemCostaUrl ?? null
}

function normalizarEstadoImagensProduto(
  produto: ProdutoImagemPersistida,
  imagemLegadaFallback: string | null = null
): EstadoImagensProduto {
  const imagemLegada = produto.imagem_url ?? imagemLegadaFallback ?? null
  const imagemFrenteUrl = produto.imagem_frente_url ?? imagemLegada
  const imagemCostaUrl = produto.imagem_costa_url ?? null

  return {
    imagemFrenteUrl,
    imagemCostaUrl,
    imagemLegadaUrl: resolverImagemUrlLegada(imagemFrenteUrl, imagemCostaUrl),
  }
}

function formatarTamanhoMaximoImagem(): string {
  return `${Math.floor(PRODUTO_IMAGENS_MAX_BYTES / (1024 * 1024))} MB`
}

function validarArquivoImagemProduto(arquivo: File, rotulo: string): string | null {
  if (!PRODUTO_IMAGENS_MIME_TYPES.includes(arquivo.type as (typeof PRODUTO_IMAGENS_MIME_TYPES)[number])) {
    return `A imagem de ${rotulo} deve estar em JPG, PNG ou WEBP.`
  }

  if (arquivo.size > PRODUTO_IMAGENS_MAX_BYTES) {
    return `A imagem de ${rotulo} deve ter no maximo ${formatarTamanhoMaximoImagem()}.`
  }

  return null
}

function obterExtensaoImagem(arquivo: File): string {
  const extensaoPorMimeType = EXTENSAO_POR_MIME_TYPE[arquivo.type as keyof typeof EXTENSAO_POR_MIME_TYPE]

  if (extensaoPorMimeType) {
    return extensaoPorMimeType
  }

  throw new Error('Nao foi possivel determinar a extensao da imagem enviada.')
}

function construirCaminhoImagemProduto(produtoId: string, tipo: ProdutoImagemTipo, arquivo: File): string {
  const extensao = obterExtensaoImagem(arquivo)
  return `${produtoId}/${tipo}/${Date.now()}-${crypto.randomUUID()}.${extensao}`
}

function extrairCaminhoStorageProduto(url: string | null, produtoId: string): string | null {
  if (!url) {
    return null
  }

  try {
    const parsedUrl = new URL(url)
    const marcadorBucket = `/storage/v1/object/public/${PRODUTO_IMAGENS_BUCKET}/`
    const indiceMarcador = parsedUrl.pathname.indexOf(marcadorBucket)

    if (indiceMarcador < 0) {
      return null
    }

    const caminho = decodeURIComponent(parsedUrl.pathname.slice(indiceMarcador + marcadorBucket.length))

    if (!caminho.startsWith(`${produtoId}/`)) {
      return null
    }

    return caminho
  } catch {
    return null
  }
}

async function garantirBucketImagensProduto(supabase: AdminClient): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    throw new Error(`Erro ao validar bucket de imagens do produto: ${listError.message}`)
  }

  const bucketExiste = (buckets ?? []).some(
    (bucket) => bucket.id === PRODUTO_IMAGENS_BUCKET || bucket.name === PRODUTO_IMAGENS_BUCKET
  )

  if (bucketExiste) {
    return
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUTO_IMAGENS_BUCKET, {
    public: true,
    fileSizeLimit: PRODUTO_IMAGENS_MAX_BYTES,
    allowedMimeTypes: [...PRODUTO_IMAGENS_MIME_TYPES],
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Erro ao criar bucket de imagens do produto: ${createError.message}`)
  }
}

async function uploadImagemProduto(
  supabase: AdminClient,
  produtoId: string,
  tipo: ProdutoImagemTipo,
  arquivo: File
): Promise<UploadImagemProdutoResultado> {
  const caminho = construirCaminhoImagemProduto(produtoId, tipo, arquivo)
  const conteudo = await arquivo.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(PRODUTO_IMAGENS_BUCKET)
    .upload(caminho, conteudo, {
      cacheControl: '3600',
      contentType: arquivo.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Erro ao enviar imagem de ${tipo}: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(PRODUTO_IMAGENS_BUCKET).getPublicUrl(caminho)

  return {
    caminho,
    urlPublica: data.publicUrl,
  }
}

async function removerArquivosProduto(supabase: AdminClient, caminhos: string[]): Promise<void> {
  if (caminhos.length === 0) {
    return
  }

  const { error } = await supabase.storage.from(PRODUTO_IMAGENS_BUCKET).remove(caminhos)

  if (error) {
    throw new Error(`Erro ao remover imagens antigas do produto: ${error.message}`)
  }
}

async function carregarImagensProdutoAtual(
  supabase: AdminClient,
  id: string
): Promise<ProdutoImagemPersistida | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('id, imagem_url, imagem_frente_url, imagem_costa_url')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(`Erro ao carregar imagens atuais do produto: ${error.message}`)
  }

  return data
}

async function prepararMutacaoImagensProduto(
  supabase: AdminClient,
  produtoId: string,
  formData: FormData,
  imagensPersistidas: ProdutoImagemPersistida
): Promise<MutacaoImagensProdutoResultado> {
  const estadoAtual = normalizarEstadoImagensProduto(imagensPersistidas)
  let imagemFrenteUrl = estadoAtual.imagemFrenteUrl
  let imagemCostaUrl = estadoAtual.imagemCostaUrl
  const novosArquivos: string[] = []
  const candidatosRemocao = new Set<string>()
  let precisaGarantirBucket = false

  for (const config of PRODUTO_IMAGEM_CONFIGS) {
    const arquivo = obterArquivoOpcional(formData, config.campoArquivo)

    if (arquivo) {
      const mensagemValidacao = validarArquivoImagemProduto(arquivo, config.rotulo)

      if (mensagemValidacao) {
        throw new Error(mensagemValidacao)
      }

      precisaGarantirBucket = true
    }
  }

  if (precisaGarantirBucket) {
    await garantirBucketImagensProduto(supabase)
  }

  try {
    for (const config of PRODUTO_IMAGEM_CONFIGS) {
      const arquivo = obterArquivoOpcional(formData, config.campoArquivo)
      const removerImagem = obterBooleano(formData, config.campoRemocao)
      const urlAtual = config.tipo === 'frente' ? imagemFrenteUrl : imagemCostaUrl
      const caminhoAtual = extrairCaminhoStorageProduto(urlAtual, produtoId)

      if (arquivo) {
        const upload = await uploadImagemProduto(supabase, produtoId, config.tipo, arquivo)
        novosArquivos.push(upload.caminho)

        if (config.tipo === 'frente') {
          imagemFrenteUrl = upload.urlPublica
        } else {
          imagemCostaUrl = upload.urlPublica
        }

        if (caminhoAtual) {
          candidatosRemocao.add(caminhoAtual)
        }

        continue
      }

      if (!removerImagem) {
        continue
      }

      if (config.tipo === 'frente') {
        imagemFrenteUrl = null
      } else {
        imagemCostaUrl = null
      }

      if (caminhoAtual) {
        candidatosRemocao.add(caminhoAtual)
      }
    }
  } catch (error) {
    await removerArquivosProduto(supabase, novosArquivos)
    throw error
  }

  const caminhosPreservados = new Set(
    [imagemFrenteUrl, imagemCostaUrl]
      .map((url) => extrairCaminhoStorageProduto(url, produtoId))
      .filter((caminho): caminho is string => Boolean(caminho))
  )

  const caminhosParaExcluir = Array.from(candidatosRemocao).filter(
    (caminho) => !caminhosPreservados.has(caminho)
  )

  return {
    valores: {
      imagem_frente_url: imagemFrenteUrl,
      imagem_costa_url: imagemCostaUrl,
      imagem_url: resolverImagemUrlLegada(imagemFrenteUrl, imagemCostaUrl),
    },
    novosArquivos,
    caminhosParaExcluir,
  }
}

function isRoteiroPayloadItem(value: unknown): value is RoteiroPayloadItem {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.operacaoId === 'string' &&
    item.operacaoId.length > 0 &&
    typeof item.sequencia === 'number' &&
    Number.isInteger(item.sequencia) &&
    item.sequencia > 0
  )
}

function lerRoteiroDoForm(formData: FormData): RoteiroPayloadItem[] | null {
  const valor = formData.get('roteiro')

  if (typeof valor !== 'string' || !valor) {
    return null
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(valor)
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || !parsed.every(isRoteiroPayloadItem)) {
    return null
  }

  const roteiroNormalizado = parsed
    .slice()
    .sort((primeiro, segundo) => primeiro.sequencia - segundo.sequencia)
    .map((item, index) => ({
      operacaoId: item.operacaoId,
      sequencia: index + 1,
    }))

  const operacoesUnicas = new Set(roteiroNormalizado.map((item) => item.operacaoId))

  if (operacoesUnicas.size !== roteiroNormalizado.length) {
    return null
  }

  return roteiroNormalizado
}

async function carregarOperacoesDoRoteiro(roteiro: RoteiroPayloadItem[]): Promise<OperacaoRow[] | null> {
  const supabase = createAdminClient()

  const operacaoIds = roteiro.map((item) => item.operacaoId)

  const { data, error } = await supabase
    .from('operacoes')
    .select('*')
    .in('id', operacaoIds)

  if (error) {
    throw new Error(`Erro ao carregar operações do roteiro: ${error.message}`)
  }

  if (data.length !== operacaoIds.length) {
    return null
  }

  const operacoesPorId = new Map(data.map((operacao) => [operacao.id, operacao]))

  return operacaoIds
    .map((operacaoId) => operacoesPorId.get(operacaoId))
    .filter((operacao): operacao is OperacaoRow => Boolean(operacao))
}

function operacoesSemSetor(operacoes: OperacaoRow[]): boolean {
  return operacoes.some((operacao) => !operacao.setor_id)
}

async function carregarRoteiroAtualProduto(produtoId: string): Promise<RoteiroPayloadItem[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('produto_operacoes')
    .select('operacao_id, sequencia')
    .eq('produto_id', produtoId)
    .order('sequencia')

  if (error) {
    throw new Error(`Erro ao carregar roteiro atual do produto: ${error.message}`)
  }

  return data
    .filter(
      (item): item is Pick<ProdutoOperacaoRow, 'operacao_id' | 'sequencia'> & { operacao_id: string } =>
        Boolean(item.operacao_id)
    )
    .map((item) => ({
      operacaoId: item.operacao_id,
      sequencia: item.sequencia,
    }))
}

function roteiroFoiAlterado(
  roteiroAtual: RoteiroPayloadItem[],
  roteiroNovo: RoteiroPayloadItem[]
): boolean {
  if (roteiroAtual.length !== roteiroNovo.length) {
    return true
  }

  return roteiroAtual.some((item, index) => {
    const itemNovo = roteiroNovo[index]

    if (!itemNovo) {
      return true
    }

    return item.operacaoId !== itemNovo.operacaoId || item.sequencia !== itemNovo.sequencia
  })
}

async function substituirRoteiro(
  produtoId: string,
  roteiro: RoteiroPayloadItem[]
): Promise<FormActionState> {
  const supabase = createAdminClient()
  const roteiroAtual = await carregarRoteiroAtualProduto(produtoId)

  if (!roteiroFoiAlterado(roteiroAtual, roteiro)) {
    return { sucesso: true }
  }

  const { error: deleteError } = await supabase
    .from('produto_operacoes')
    .delete()
    .eq('produto_id', produtoId)

  if (deleteError) {
    if (deleteError.code === '23503') {
      return { erro: obterMensagemRoteiroComHistorico() }
    }

    return { erro: `Erro ao atualizar roteiro: ${deleteError.message}` }
  }

  const { error: insertError } = await supabase.from('produto_operacoes').insert(
    roteiro.map((item) => ({
      produto_id: produtoId,
      operacao_id: item.operacaoId,
      sequencia: item.sequencia,
    }))
  )

  if (insertError) {
    return { erro: `Erro ao salvar roteiro: ${insertError.message}` }
  }

  return { sucesso: true }
}

export async function salvarRoteiro(
  produtoId: string,
  roteiro: RoteiroPayloadItem[]
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  if (!produtoId || roteiro.length === 0) {
    return { erro: 'Produto e roteiro são obrigatórios' }
  }

  const resultado = await substituirRoteiro(produtoId, roteiro)

  if (resultado.erro) {
    return resultado
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${produtoId}`)
  return { sucesso: true }
}

export async function criarProduto(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  try {
    const supabase = createAdminClient()
    const referencia = obterTexto(formData, 'referencia')
    const nome = obterTexto(formData, 'nome')
    const descricao = obterTextoOpcional(formData, 'descricao')
    const imagemUrlLegada = obterTextoOpcional(formData, 'imagem_url')
    const roteiro = lerRoteiroDoForm(formData)

    if (!referencia || !nome || !roteiro || roteiro.length === 0) {
      return { erro: 'Referência, nome e pelo menos uma operação no roteiro são obrigatórios' }
    }

    const operacoes = await carregarOperacoesDoRoteiro(roteiro)

    if (!operacoes) {
      return { erro: 'Roteiro inválido. Selecione operações válidas.' }
    }

    if (operacoesSemSetor(operacoes)) {
      return { erro: 'Todas as operações do roteiro precisam ter setor definido para a V2.' }
    }

    const tpProdutoMin = calcularTpProduto(
      operacoes.map((operacao) => ({ tempoPadraoMin: operacao.tempo_padrao_min }))
    )

    const { data: produto, error } = await supabase
      .from('produtos')
      .insert({
        referencia,
        nome,
        descricao,
        imagem_url: imagemUrlLegada,
        imagem_frente_url: imagemUrlLegada,
        imagem_costa_url: null,
        tp_produto_min: tpProdutoMin,
      })
      .select('id, imagem_url, imagem_frente_url, imagem_costa_url')
      .single()

    if (error || !produto) {
      if (error?.code === '23505') {
        return { erro: 'Referência do produto já cadastrada' }
      }

      return { erro: `Erro ao criar produto: ${error?.message ?? 'erro desconhecido'}` }
    }

    const resultadoRoteiro = await substituirRoteiro(produto.id, roteiro)

    if (resultadoRoteiro.erro) {
      await supabase.from('produtos').delete().eq('id', produto.id)
      return resultadoRoteiro
    }

    const mutacaoImagens = await prepararMutacaoImagensProduto(supabase, produto.id, formData, produto)

    const { error: updateError } = await supabase
      .from('produtos')
      .update({
        ...mutacaoImagens.valores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', produto.id)

    if (updateError) {
      await removerArquivosProduto(supabase, mutacaoImagens.novosArquivos)
      await supabase.from('produtos').delete().eq('id', produto.id)
      return { erro: `Erro ao salvar imagens do produto: ${updateError.message}` }
    }

    await removerArquivosProduto(supabase, mutacaoImagens.caminhosParaExcluir)

    revalidatePath('/admin/produtos')
    revalidatePath(`/admin/produtos/${produto.id}`)
    return { sucesso: true }
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar as imagens do produto.',
    }
  }
}

export async function editarProduto(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  try {
    const supabase = createAdminClient()
    const referencia = obterTexto(formData, 'referencia')
    const nome = obterTexto(formData, 'nome')
    const descricao = obterTextoOpcional(formData, 'descricao')
    const ativo = formData.get('ativo') === 'true'
    const roteiro = lerRoteiroDoForm(formData)

    if (!referencia || !nome || !roteiro || roteiro.length === 0) {
      return { erro: 'Referência, nome e pelo menos uma operação no roteiro são obrigatórios' }
    }

    const operacoes = await carregarOperacoesDoRoteiro(roteiro)

    if (!operacoes) {
      return { erro: 'Roteiro inválido. Selecione operações válidas.' }
    }

    if (operacoesSemSetor(operacoes)) {
      return { erro: 'Todas as operações do roteiro precisam ter setor definido para a V2.' }
    }

    const roteiroAtual = await carregarRoteiroAtualProduto(id)
    const houveAlteracaoRoteiro = roteiroFoiAlterado(roteiroAtual, roteiro)

    if (houveAlteracaoRoteiro) {
      const dependencias = await carregarDependenciasProduto(id)

      if (dependencias.emTurnoAberto || produtoTemHistorico(dependencias)) {
        return { erro: obterMensagemRoteiroComHistorico() }
      }
    }

    const imagensPersistidas = await carregarImagensProdutoAtual(supabase, id)

    if (!imagensPersistidas) {
      return { erro: 'Produto não encontrado para editar imagens.' }
    }

    const tpProdutoMin = calcularTpProduto(
      operacoes.map((operacao) => ({ tempoPadraoMin: operacao.tempo_padrao_min }))
    )

    const mutacaoImagens = await prepararMutacaoImagensProduto(
      supabase,
      id,
      formData,
      imagensPersistidas
    )

    const { error } = await supabase
      .from('produtos')
      .update({
        referencia,
        nome,
        descricao,
        ativo,
        tp_produto_min: tpProdutoMin,
        ...mutacaoImagens.valores,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      await removerArquivosProduto(supabase, mutacaoImagens.novosArquivos)

      if (error.code === '23505') {
        return { erro: 'Referência do produto já cadastrada' }
      }

      return { erro: `Erro ao editar produto: ${error.message}` }
    }

    if (houveAlteracaoRoteiro) {
      const resultadoRoteiro = await substituirRoteiro(id, roteiro)

      if (resultadoRoteiro.erro) {
        return resultadoRoteiro
      }
    }

    await removerArquivosProduto(supabase, mutacaoImagens.caminhosParaExcluir)

    revalidatePath('/admin/produtos')
    revalidatePath(`/admin/produtos/${id}`)
    return { sucesso: true }
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel atualizar as imagens do produto.',
    }
  }
}

export async function desativarProduto(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  let dependencias: DependenciasProduto

  try {
    dependencias = await carregarDependenciasProduto(id)
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Não foi possível validar o uso atual do produto.',
    }
  }

  if (dependencias.emTurnoAberto) {
    return { erro: obterMensagemProdutoEmUso() }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('produtos')
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao desativar produto: ${error.message}` }
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  return { sucesso: true }
}

export async function excluirProduto(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  let dependencias: DependenciasProduto

  try {
    dependencias = await carregarDependenciasProduto(id)
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Não foi possível validar o uso atual do produto.',
    }
  }

  if (dependencias.emTurnoAberto) {
    return { erro: obterMensagemProdutoEmUso() }
  }

  if (produtoTemHistorico(dependencias)) {
    return { erro: obterMensagemHistoricoProduto() }
  }

  const supabase = createAdminClient()

  const { error: deleteRoteiroError } = await supabase
    .from('produto_operacoes')
    .delete()
    .eq('produto_id', id)

  if (deleteRoteiroError) {
    return { erro: `Erro ao remover roteiro do produto: ${deleteRoteiroError.message}` }
  }

  const { error } = await supabase
    .from('produtos')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir produto: ${error.message}` }
  }

  revalidatePath('/admin/produtos')
  revalidatePath(`/admin/produtos/${id}`)
  return { sucesso: true }
}
