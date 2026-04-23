'use server'

import { revalidatePath } from 'next/cache'
import {
  getAuthorizationErrorMessage,
  requireAdminUser,
} from '@/lib/auth/require-admin-user'
import {
  MINUTOS_TURNO_PADRAO,
  OPERACAO_IMAGENS_BUCKET,
  OPERACAO_IMAGENS_MAX_BYTES,
  OPERACAO_IMAGENS_MIME_TYPES,
} from '@/lib/constants'
import { createAdminClient } from '@/lib/supabase/admin'
import { calcularMetaDia, calcularMetaHora } from '@/lib/utils/producao'
import type { FormActionState } from '@/types'
import type { Tables } from '@/types/supabase'

type OperacaoRow = Tables<'operacoes'>
type AdminClient = ReturnType<typeof createAdminClient>

interface OperacaoImagemPersistida {
  id: string
  imagem_url: string | null
}

interface UploadImagemOperacaoResultado {
  caminho: string
  urlPublica: string
}

interface MutacaoImagemOperacaoResultado {
  imagemUrl: string | null
  novosArquivos: string[]
  caminhosParaExcluir: string[]
}

const EXTENSAO_POR_MIME_TYPE: Record<(typeof OPERACAO_IMAGENS_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
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

function obterNumero(formData: FormData, campo: string): number {
  const valor = formData.get(campo)

  if (typeof valor !== 'string') {
    return Number.NaN
  }

  return Number.parseFloat(valor)
}

function obterAtiva(formData: FormData): boolean {
  const valor = formData.get('ativa')
  return valor === 'true'
}

function formatarTamanhoMaximoImagem(): string {
  return `${Math.floor(OPERACAO_IMAGENS_MAX_BYTES / (1024 * 1024))} MB`
}

function validarArquivoImagemOperacao(arquivo: File): string | null {
  if (
    !OPERACAO_IMAGENS_MIME_TYPES.includes(
      arquivo.type as (typeof OPERACAO_IMAGENS_MIME_TYPES)[number]
    )
  ) {
    return 'A imagem da operação deve estar em JPG, PNG ou WEBP.'
  }

  if (arquivo.size > OPERACAO_IMAGENS_MAX_BYTES) {
    return `A imagem da operação deve ter no maximo ${formatarTamanhoMaximoImagem()}.`
  }

  return null
}

function obterExtensaoImagem(arquivo: File): string {
  const extensao = EXTENSAO_POR_MIME_TYPE[arquivo.type as keyof typeof EXTENSAO_POR_MIME_TYPE]

  if (extensao) {
    return extensao
  }

  throw new Error('Nao foi possivel determinar a extensao da imagem enviada.')
}

function construirCaminhoImagemOperacao(operacaoId: string, arquivo: File): string {
  const extensao = obterExtensaoImagem(arquivo)
  return `${operacaoId}/${Date.now()}-${crypto.randomUUID()}.${extensao}`
}

function extrairCaminhoStorageOperacao(url: string | null, operacaoId: string): string | null {
  if (!url) {
    return null
  }

  try {
    const parsedUrl = new URL(url)
    const marcadorBucket = `/storage/v1/object/public/${OPERACAO_IMAGENS_BUCKET}/`
    const indiceMarcador = parsedUrl.pathname.indexOf(marcadorBucket)

    if (indiceMarcador < 0) {
      return null
    }

    const caminho = decodeURIComponent(parsedUrl.pathname.slice(indiceMarcador + marcadorBucket.length))

    if (!caminho.startsWith(`${operacaoId}/`)) {
      return null
    }

    return caminho
  } catch {
    return null
  }
}

async function garantirBucketImagensOperacao(supabase: AdminClient): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    throw new Error(`Erro ao validar bucket de imagens da operação: ${listError.message}`)
  }

  const bucketExiste = (buckets ?? []).some(
    (bucket) => bucket.id === OPERACAO_IMAGENS_BUCKET || bucket.name === OPERACAO_IMAGENS_BUCKET
  )

  if (bucketExiste) {
    return
  }

  const { error: createError } = await supabase.storage.createBucket(OPERACAO_IMAGENS_BUCKET, {
    public: true,
    fileSizeLimit: OPERACAO_IMAGENS_MAX_BYTES,
    allowedMimeTypes: [...OPERACAO_IMAGENS_MIME_TYPES],
  })

  if (createError && !createError.message.toLowerCase().includes('already exists')) {
    throw new Error(`Erro ao criar bucket de imagens da operação: ${createError.message}`)
  }
}

async function uploadImagemOperacao(
  supabase: AdminClient,
  operacaoId: string,
  arquivo: File
): Promise<UploadImagemOperacaoResultado> {
  const caminho = construirCaminhoImagemOperacao(operacaoId, arquivo)
  const conteudo = await arquivo.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from(OPERACAO_IMAGENS_BUCKET)
    .upload(caminho, conteudo, {
      cacheControl: '3600',
      contentType: arquivo.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Erro ao enviar imagem da operação: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from(OPERACAO_IMAGENS_BUCKET).getPublicUrl(caminho)

  return {
    caminho,
    urlPublica: data.publicUrl,
  }
}

async function removerArquivosOperacao(supabase: AdminClient, caminhos: string[]): Promise<void> {
  if (caminhos.length === 0) {
    return
  }

  const { error } = await supabase.storage.from(OPERACAO_IMAGENS_BUCKET).remove(caminhos)

  if (error) {
    throw new Error(`Erro ao remover imagens antigas da operação: ${error.message}`)
  }
}

async function carregarImagemOperacaoAtual(
  supabase: AdminClient,
  id: string
): Promise<OperacaoImagemPersistida | null> {
  const { data, error } = await supabase
    .from('operacoes')
    .select('id, imagem_url')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw new Error(`Erro ao carregar imagem atual da operação: ${error.message}`)
  }

  return data
}

async function prepararMutacaoImagemOperacao(
  supabase: AdminClient,
  operacaoId: string,
  formData: FormData,
  imagemPersistida: OperacaoImagemPersistida
): Promise<MutacaoImagemOperacaoResultado> {
  const arquivo = obterArquivoOpcional(formData, 'imagem_arquivo')
  const removerImagem = obterBooleano(formData, 'remover_imagem')
  const imagemAtual = imagemPersistida.imagem_url ?? null
  const caminhoAtual = extrairCaminhoStorageOperacao(imagemAtual, operacaoId)
  let imagemUrl = imagemAtual
  const novosArquivos: string[] = []
  const candidatosRemocao = new Set<string>()

  if (!arquivo && !removerImagem) {
    return {
      imagemUrl,
      novosArquivos,
      caminhosParaExcluir: [],
    }
  }

  if (arquivo) {
    const mensagemValidacao = validarArquivoImagemOperacao(arquivo)

    if (mensagemValidacao) {
      throw new Error(mensagemValidacao)
    }

    await garantirBucketImagensOperacao(supabase)
  }

  try {
    if (arquivo) {
      const upload = await uploadImagemOperacao(supabase, operacaoId, arquivo)
      novosArquivos.push(upload.caminho)
      imagemUrl = upload.urlPublica

      if (caminhoAtual) {
        candidatosRemocao.add(caminhoAtual)
      }
    } else if (removerImagem) {
      imagemUrl = null

      if (caminhoAtual) {
        candidatosRemocao.add(caminhoAtual)
      }
    }
  } catch (error) {
    await removerArquivosOperacao(supabase, novosArquivos)
    throw error
  }

  const caminhoPreservado = extrairCaminhoStorageOperacao(imagemUrl, operacaoId)
  const caminhosParaExcluir = Array.from(candidatosRemocao).filter(
    (caminho) => caminho !== caminhoPreservado
  )

  return {
    imagemUrl,
    novosArquivos,
    caminhosParaExcluir,
  }
}

function obterMensagemDependencia(
  totalRoteiros: number,
  totalRegistros: number
): string | null {
  if (totalRoteiros > 0 || totalRegistros > 0) {
    return 'Esta operação já faz parte de roteiro ou histórico de produção e não pode ser excluída permanentemente.'
  }

  return null
}

export async function criarOperacao(
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
    const codigo = obterTexto(formData, 'codigo')
    const descricao = obterTexto(formData, 'descricao')
    const setorId = obterTexto(formData, 'setor_id')
    const maquinaId = obterTextoOpcional(formData, 'maquina_id')
    const tempoPadraoMin = obterNumero(formData, 'tempo_padrao_min')

    if (!codigo || !descricao || !setorId || !maquinaId || tempoPadraoMin <= 0) {
      return { erro: 'Código, setor, descrição, máquina e T.P válido são obrigatórios' }
    }

    const metaHora = calcularMetaHora(tempoPadraoMin)
    const metaDia = calcularMetaDia(tempoPadraoMin, MINUTOS_TURNO_PADRAO)

    const { data: operacao, error } = await supabase
      .from('operacoes')
      .insert({
        codigo,
        descricao,
        maquina_id: maquinaId,
        setor_id: setorId,
        tempo_padrao_min: tempoPadraoMin,
        meta_hora: metaHora,
        meta_dia: metaDia,
      })
      .select('id, imagem_url')
      .single<Pick<OperacaoRow, 'id' | 'imagem_url'>>()

    if (error || !operacao) {
      if (error?.code === '23505') {
        return { erro: 'Código da operação já cadastrado' }
      }

      return { erro: `Erro ao criar operação: ${error?.message ?? 'erro desconhecido'}` }
    }

    const mutacaoImagem = await prepararMutacaoImagemOperacao(supabase, operacao.id, formData, operacao)

    if (mutacaoImagem.imagemUrl !== operacao.imagem_url) {
      const { error: updateError } = await supabase
        .from('operacoes')
        .update({
          imagem_url: mutacaoImagem.imagemUrl,
        })
        .eq('id', operacao.id)

      if (updateError) {
        await removerArquivosOperacao(supabase, mutacaoImagem.novosArquivos)
        await supabase.from('operacoes').delete().eq('id', operacao.id)
        return { erro: `Erro ao salvar imagem da operação: ${updateError.message}` }
      }
    }

    await removerArquivosOperacao(supabase, mutacaoImagem.caminhosParaExcluir)

    revalidatePath('/admin/operacoes')
    revalidatePath(`/admin/operacoes/${operacao.id}`)
    return { sucesso: true }
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel salvar a imagem da operacao.',
    }
  }
}

export async function desativarOperacao(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('operacoes')
    .update({
      ativa: false,
    })
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao desativar operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  revalidatePath(`/admin/operacoes/${id}`)
  return { sucesso: true }
}

export async function excluirOperacao(id: string): Promise<FormActionState> {
  try {
    await requireAdminUser({ redirectOnFail: false })
  } catch (error) {
    return { erro: getAuthorizationErrorMessage(error) ?? 'Não foi possível validar sua sessão.' }
  }

  const supabase = createAdminClient()

  const [{ count: totalRoteiros, error: roteiroError }, { count: totalRegistros, error: registrosError }] =
    await Promise.all([
      supabase
        .from('produto_operacoes')
        .select('*', { count: 'exact', head: true })
        .eq('operacao_id', id),
      supabase
        .from('registros_producao')
        .select('*', { count: 'exact', head: true })
        .eq('operacao_id', id),
    ])

  if (roteiroError) {
    return { erro: `Erro ao validar vínculos da operação: ${roteiroError.message}` }
  }

  if (registrosError) {
    return { erro: `Erro ao validar histórico da operação: ${registrosError.message}` }
  }

  const mensagemDependencia = obterMensagemDependencia(totalRoteiros ?? 0, totalRegistros ?? 0)
  if (mensagemDependencia) {
    return { erro: mensagemDependencia }
  }

  const { error } = await supabase
    .from('operacoes')
    .delete()
    .eq('id', id)

  if (error) {
    return { erro: `Erro ao excluir operação: ${error.message}` }
  }

  revalidatePath('/admin/operacoes')
  revalidatePath(`/admin/operacoes/${id}`)
  return { sucesso: true }
}

export async function editarOperacao(
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

    const codigo = obterTexto(formData, 'codigo')
    const descricao = obterTexto(formData, 'descricao')
    const setorId = obterTexto(formData, 'setor_id')
    const maquinaId = obterTextoOpcional(formData, 'maquina_id')
    const tempoPadraoMin = obterNumero(formData, 'tempo_padrao_min')
    const ativa = obterAtiva(formData)

    if (!codigo || !descricao || !setorId || !maquinaId || tempoPadraoMin <= 0) {
      return { erro: 'Código, setor, descrição, máquina e T.P válido são obrigatórios' }
    }

    const imagemPersistida = await carregarImagemOperacaoAtual(supabase, id)

    if (!imagemPersistida) {
      return { erro: 'Operação não encontrada para editar imagem.' }
    }

    const metaHora = calcularMetaHora(tempoPadraoMin)
    const metaDia = calcularMetaDia(tempoPadraoMin, MINUTOS_TURNO_PADRAO)
    const mutacaoImagem = await prepararMutacaoImagemOperacao(supabase, id, formData, imagemPersistida)

    const { error } = await supabase
      .from('operacoes')
      .update({
        codigo,
        descricao,
        imagem_url: mutacaoImagem.imagemUrl,
        maquina_id: maquinaId,
        setor_id: setorId,
        tempo_padrao_min: tempoPadraoMin,
        meta_hora: metaHora,
        meta_dia: metaDia,
        ativa,
      })
      .eq('id', id)

    if (error) {
      await removerArquivosOperacao(supabase, mutacaoImagem.novosArquivos)

      if (error.code === '23505') {
        return { erro: 'Código da operação já cadastrado' }
      }

      return { erro: `Erro ao editar operação: ${error.message}` }
    }

    await removerArquivosOperacao(supabase, mutacaoImagem.caminhosParaExcluir)

    revalidatePath('/admin/operacoes')
    revalidatePath(`/admin/operacoes/${id}`)
    return { sucesso: true }
  } catch (error) {
    return {
      erro:
        error instanceof Error
          ? error.message
          : 'Nao foi possivel atualizar a imagem da operacao.',
    }
  }
}
