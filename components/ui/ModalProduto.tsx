'use client'

import { useActionState, useEffect, useId, useRef, useState } from 'react'
import { ImagePlus, Plus, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
import { PRODUTO_IMAGENS_MAX_BYTES } from '@/lib/constants'
import { calcularTpProduto } from '@/lib/utils/producao'
import type {
  FormActionState,
  OperacaoListItem,
  ProdutoListItem,
  SetorListItem,
} from '@/types'

interface ModalProdutoProps {
  produto?: ProdutoListItem
  produtoBase?: ProdutoListItem
  operacoes: OperacaoListItem[]
  setores: SetorListItem[]
  aoFechar: () => void
}

interface SetorRoteiroOption {
  id: string
  codigo: number
  nome: string
  operacoes: OperacaoListItem[]
}

type ProdutoImagemTipo = 'frente' | 'costa'

interface ProdutoImagemDraft {
  arquivo: File | null
  objectUrl: string | null
  previewUrl: string | null
  removida: boolean
  urlInicial: string | null
}

interface ProdutoImagemCardConfig {
  tipo: ProdutoImagemTipo
  titulo: string
  descricao: string
  inputName: string
  removeFieldName: string
}

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }
const TAMANHO_MAXIMO_IMAGEM_MB = Math.floor(PRODUTO_IMAGENS_MAX_BYTES / (1024 * 1024))
const PRODUTO_IMAGEM_CARDS: readonly ProdutoImagemCardConfig[] = [
  {
    tipo: 'frente',
    titulo: 'Frente',
    descricao: 'Vista principal para reconhecer rapidamente a peça em produção.',
    inputName: 'imagem_frente_arquivo',
    removeFieldName: 'remover_imagem_frente',
  },
  {
    tipo: 'costa',
    titulo: 'Costa',
    descricao: 'Vista complementar para inspeção visual completa do produto.',
    inputName: 'imagem_costa_arquivo',
    removeFieldName: 'remover_imagem_costa',
  },
]

function compararSetores(primeiro: SetorRoteiroOption, segundo: SetorRoteiroOption): number {
  if (primeiro.codigo !== segundo.codigo) {
    return primeiro.codigo - segundo.codigo
  }

  return primeiro.nome.localeCompare(segundo.nome)
}

function listarSetoresDisponiveis(
  setores: SetorListItem[],
  operacoes: OperacaoListItem[]
): SetorRoteiroOption[] {
  const operacoesPorSetor = new Map<string, OperacaoListItem[]>()

  operacoes.forEach((operacao) => {
    if (!operacao.setor_id) {
      return
    }

    const operacoesAtuais = operacoesPorSetor.get(operacao.setor_id) ?? []
    operacoesAtuais.push(operacao)
    operacoesPorSetor.set(operacao.setor_id, operacoesAtuais)
  })

  return setores
    .map((setor) => ({
      id: setor.id,
      codigo: setor.codigo,
      nome: setor.nome,
      operacoes: (operacoesPorSetor.get(setor.id) ?? []).slice().sort((primeiro, segundo) =>
        primeiro.codigo.localeCompare(segundo.codigo)
      ),
    }))
    .sort(compararSetores)
}

function ordenarSetoresSelecionados(
  setoresDisponiveis: SetorRoteiroOption[],
  setoresSelecionadosIds: string[]
): SetorRoteiroOption[] {
  const setoresPorId = new Map(setoresDisponiveis.map((setor) => [setor.id, setor]))

  return setoresSelecionadosIds
    .map((setorId) => setoresPorId.get(setorId))
    .filter((setor): setor is SetorRoteiroOption => Boolean(setor))
}

function deduplicarSetoresIniciais(produto?: ProdutoListItem): string[] {
  if (!produto) {
    return []
  }

  return Array.from(
    new Set(
      produto.roteiro
        .map((item) => item.setorId)
        .filter((setorId): setorId is string => Boolean(setorId))
    )
  )
}

function obterReferenciaInicial(produtoBase?: ProdutoListItem): string {
  if (!produtoBase) {
    return ''
  }

  return `${produtoBase.referencia}-COPIA`
}

function obterNomeInicial(produtoBase?: ProdutoListItem): string {
  if (!produtoBase) {
    return ''
  }

  return `${produtoBase.nome} (Copia)`
}

function obterDescricaoInicial(produtoBase?: ProdutoListItem): string {
  return produtoBase?.descricao ?? ''
}

function obterImagemInicial(produto: ProdutoListItem | undefined, tipo: ProdutoImagemTipo): string | null {
  if (!produto) {
    return null
  }

  if (tipo === 'frente') {
    return produto.imagem_frente_url ?? produto.imagem_url ?? null
  }

  return produto.imagem_costa_url ?? null
}

function criarImagemDraftInicial(
  produto: ProdutoListItem | undefined,
  tipo: ProdutoImagemTipo
): ProdutoImagemDraft {
  const urlInicial = obterImagemInicial(produto, tipo)

  return {
    arquivo: null,
    objectUrl: null,
    previewUrl: urlInicial,
    removida: false,
    urlInicial,
  }
}

function obterStatusImagem(draft: ProdutoImagemDraft): string {
  if (draft.arquivo) {
    return 'Nova imagem pronta'
  }

  if (draft.previewUrl) {
    return 'Imagem atual'
  }

  if (draft.removida) {
    return 'Remocao pendente'
  }

  return 'Sem imagem'
}

function obterClasseStatusImagem(draft: ProdutoImagemDraft): string {
  if (draft.arquivo) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (draft.previewUrl) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }

  if (draft.removida) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }

  return 'border-gray-200 bg-gray-100 text-gray-600'
}

export function ModalProduto({
  produto,
  produtoBase,
  operacoes,
  setores,
  aoFechar,
}: ModalProdutoProps) {
  const acao = produto ? editarProduto.bind(null, produto.id) : criarProduto
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const produtoInicial = produto ?? produtoBase
  const prefixoIds = useId()
  const inputFrenteRef = useRef<HTMLInputElement | null>(null)
  const inputCostaRef = useRef<HTMLInputElement | null>(null)
  const [roteiroIds, setRoteiroIds] = useState<string[]>(
    produtoInicial ? produtoInicial.roteiro.map((item) => item.operacaoId) : []
  )
  const [buscaSetor, setBuscaSetor] = useState('')
  const [buscaOperacao, setBuscaOperacao] = useState('')
  const [imagemFrente, setImagemFrente] = useState<ProdutoImagemDraft>(() =>
    criarImagemDraftInicial(produto, 'frente')
  )
  const [imagemCosta, setImagemCosta] = useState<ProdutoImagemDraft>(() =>
    criarImagemDraftInicial(produto, 'costa')
  )
  const [setoresSelecionadosIds, setSetoresSelecionadosIds] = useState<string[]>(() =>
    deduplicarSetoresIniciais(produtoInicial)
  )
  const [setorAtivoId, setSetorAtivoId] = useState<string | null>(() => {
    const primeiroSetor = produtoInicial?.roteiro.find((item) => item.setorId)?.setorId
    return primeiroSetor ?? null
  })

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  useEffect(() => {
    return () => {
      ;[imagemFrente.objectUrl, imagemCosta.objectUrl].forEach((objectUrl) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl)
        }
      })
    }
  }, [imagemCosta.objectUrl, imagemFrente.objectUrl])

  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
  const setoresDisponiveis = listarSetoresDisponiveis(setores, operacoes)
  const setoresPorId = new Map(setoresDisponiveis.map((setor) => [setor.id, setor]))
  const setoresSelecionados = ordenarSetoresSelecionados(setoresDisponiveis, setoresSelecionadosIds)
  const primeiroSetorSelecionadoId = setoresSelecionados[0]?.id ?? null

  useEffect(() => {
    if (setorAtivoId && setoresSelecionadosIds.includes(setorAtivoId)) {
      return
    }

    if (primeiroSetorSelecionadoId !== setorAtivoId) {
      setSetorAtivoId(primeiroSetorSelecionadoId)
    }
  }, [primeiroSetorSelecionadoId, setorAtivoId, setoresSelecionadosIds])

  useEffect(() => {
    setBuscaOperacao('')
  }, [setorAtivoId])

  const roteiroIdsOrdenados = roteiroIds
  const operacoesSelecionadas = roteiroIdsOrdenados
    .map((operacaoId) => operacoesPorId.get(operacaoId))
    .filter((operacao): operacao is OperacaoListItem => Boolean(operacao))
  const roteiroPayload = JSON.stringify(
    roteiroIdsOrdenados.map((operacaoId, index) => ({
      operacaoId,
      sequencia: index + 1,
    }))
  )
  const tpProdutoMin = calcularTpProduto(
    operacoesSelecionadas.map((operacao) => ({
      tempoPadraoMin: operacao.tempo_padrao_min,
    }))
  )
  const termoBuscaSetor = buscaSetor.trim().toLocaleLowerCase()
  const setoresFiltrados = setoresDisponiveis.filter((setor) => {
    if (!termoBuscaSetor) {
      return true
    }

    return (
      setor.nome.toLocaleLowerCase().includes(termoBuscaSetor) ||
      String(setor.codigo).includes(termoBuscaSetor)
    )
  })
  const setoresDisponiveisParaAdicionar = setoresFiltrados.filter(
    (setor) => !setoresSelecionadosIds.includes(setor.id)
  )
  const setorAtivo = setorAtivoId ? setoresPorId.get(setorAtivoId) ?? null : null
  const operacoesDoSetorAtivo = setorAtivo?.operacoes ?? []
  const termoBuscaOperacao = buscaOperacao.trim().toLocaleLowerCase()
  const operacoesFiltradasDoSetorAtivo = operacoesDoSetorAtivo.filter((operacao) => {
    if (!termoBuscaOperacao) {
      return true
    }

    const correspondeAoTermo =
      operacao.codigo.toLocaleLowerCase().includes(termoBuscaOperacao) ||
      operacao.descricao.toLocaleLowerCase().includes(termoBuscaOperacao) ||
      (operacao.maquinaModelo?.toLocaleLowerCase().includes(termoBuscaOperacao) ?? false) ||
      (operacao.maquinaCodigo?.toLocaleLowerCase().includes(termoBuscaOperacao) ?? false)

    return correspondeAoTermo || roteiroIds.includes(operacao.id)
  })
  const modoEdicao = !!produto
  const modoDuplicacao = !produto && !!produtoBase
  const imagemLegadaInicial = produto?.imagem_url ?? ''
  const draftsImagem = {
    frente: imagemFrente,
    costa: imagemCosta,
  } satisfies Record<ProdutoImagemTipo, ProdutoImagemDraft>
  const inputsImagem = {
    frente: inputFrenteRef,
    costa: inputCostaRef,
  } satisfies Record<ProdutoImagemTipo, React.RefObject<HTMLInputElement | null>>

  function adicionarSetor(setorId: string) {
    setSetoresSelecionadosIds((setoresAtuais) => {
      if (setoresAtuais.includes(setorId)) {
        return setoresAtuais
      }

      return [...setoresAtuais, setorId]
    })
    setSetorAtivoId(setorId)
  }

  function removerSetor(setorId: string) {
    const operacoesDoSetor = setoresPorId.get(setorId)?.operacoes.map((operacao) => operacao.id) ?? []

    setSetoresSelecionadosIds((setoresAtuais) =>
      setoresAtuais.filter((setorAtualId) => setorAtualId !== setorId)
    )
    setRoteiroIds((roteiroAtual) =>
      roteiroAtual.filter((operacaoId) => !operacoesDoSetor.includes(operacaoId))
    )
  }

  function adicionarOperacao(operacaoId: string) {
    if (roteiroIds.includes(operacaoId)) {
      return
    }

    const setorId = operacoesPorId.get(operacaoId)?.setor_id

    if (setorId) {
      adicionarSetor(setorId)
    }

    setRoteiroIds((roteiroAtual) => [...roteiroAtual, operacaoId])
  }

  function removerOperacao(operacaoId: string) {
    setRoteiroIds((roteiroAtual) => roteiroAtual.filter((itemId) => itemId !== operacaoId))
  }

  function atualizarDraftImagem(
    tipo: ProdutoImagemTipo,
    atualizar: (draftAtual: ProdutoImagemDraft) => ProdutoImagemDraft
  ) {
    const setter = tipo === 'frente' ? setImagemFrente : setImagemCosta

    setter((draftAtual) => {
      const proximoDraft = atualizar(draftAtual)

      if (draftAtual.objectUrl && draftAtual.objectUrl !== proximoDraft.objectUrl) {
        URL.revokeObjectURL(draftAtual.objectUrl)
      }

      return proximoDraft
    })
  }

  function abrirSeletorImagem(tipo: ProdutoImagemTipo) {
    inputsImagem[tipo].current?.click()
  }

  function selecionarArquivoImagem(tipo: ProdutoImagemTipo, arquivo: File | null) {
    if (!arquivo) {
      return
    }

    const objectUrl = URL.createObjectURL(arquivo)

    atualizarDraftImagem(tipo, (draftAtual) => ({
      ...draftAtual,
      arquivo,
      objectUrl,
      previewUrl: objectUrl,
      removida: false,
    }))
  }

  function limparImagem(tipo: ProdutoImagemTipo) {
    atualizarDraftImagem(tipo, (draftAtual) => ({
      ...draftAtual,
      arquivo: null,
      objectUrl: null,
      previewUrl: null,
      removida: Boolean(draftAtual.urlInicial),
    }))

    if (inputsImagem[tipo].current) {
      inputsImagem[tipo].current.value = ''
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar produto' : modoDuplicacao ? 'Duplicar produto' : 'Novo produto'}
    >
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Produto' : modoDuplicacao ? 'Duplicar Produto' : 'Novo Produto'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal"
            title="Fechar formulario"
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form action={executar} className="flex flex-col gap-5 p-5">
          {estado.erro ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {estado.erro}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-12 md:items-start">
            <div className="flex flex-col gap-1 md:col-span-3">
              <label htmlFor="referencia" className="text-sm font-medium text-gray-700">
                Referencia <span aria-hidden>*</span>
              </label>
              <input
                id="referencia"
                name="referencia"
                type="text"
                required
                defaultValue={produto ? produto.referencia : obterReferenciaInicial(produtoBase)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-7">
              <label htmlFor="nome" className="text-sm font-medium text-gray-700">
                Nome <span aria-hidden>*</span>
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                defaultValue={produto ? produto.nome : obterNomeInicial(produtoBase)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 md:col-span-2 md:self-start">
              <p className="text-xs uppercase tracking-wide text-blue-700">T.P Produto</p>
              <p className="mt-1 text-2xl font-semibold text-blue-900">
                {tpProdutoMin.toFixed(2)}
              </p>
            </div>

            {modoEdicao ? (
              <div className="flex flex-col gap-1 md:col-span-2 md:col-start-11">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Situacao
                </label>
                <select
                  id="ativo"
                  name="ativo"
                  defaultValue={String(produto.ativo ?? true)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </div>
            ) : (
              <input type="hidden" name="ativo" value="true" />
            )}

            <div className="flex flex-col gap-2 md:col-span-12">
              <label htmlFor="descricao" className="text-sm font-medium text-gray-700">
                Descricao
              </label>
              <textarea
                id="descricao"
                name="descricao"
                rows={4}
                defaultValue={produto ? produto.descricao ?? '' : obterDescricaoInicial(produtoBase)}
                placeholder="Contexto administrativo do produto, observacoes de modelagem ou detalhes uteis para o cadastro."
                className="min-h-28 rounded-lg border border-gray-300 px-3 py-2 text-sm leading-6 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200/80 pb-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Imagens do produto</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Envie as vistas de frente e costa com preview grande para revisão antes de salvar.
                </p>
              </div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                JPG, PNG ou WEBP ate {TAMANHO_MAXIMO_IMAGEM_MB} MB
              </p>
            </div>

            {modoDuplicacao ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Na duplicacao, as imagens começam vazias para evitar vinculo cruzado com o produto-base.
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {PRODUTO_IMAGEM_CARDS.map((config) => {
                const draft = draftsImagem[config.tipo]
                const status = obterStatusImagem(draft)
                const inputId = `${prefixoIds}-${config.inputName}`

                return (
                  <div
                    key={config.tipo}
                    className="rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.45)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-slate-900">{config.titulo}</h4>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${obterClasseStatusImagem(draft)}`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{config.descricao}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_42%),linear-gradient(135deg,_rgba(248,250,252,1),_rgba(226,232,240,0.7))]">
                        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/70 to-transparent" />
                        <div className="relative flex aspect-[4/5] items-center justify-center p-4">
                          {draft.previewUrl ? (
                            <img
                              src={draft.previewUrl}
                              alt={`Preview da imagem de ${config.titulo.toLowerCase()} do produto`}
                              className="h-full w-full rounded-[18px] border border-slate-200 bg-white object-contain shadow-sm"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-300 bg-white/70 px-6 text-center">
                              <div className="rounded-full bg-slate-900 p-3 text-white shadow-sm">
                                <ImagePlus size={20} />
                              </div>
                              <p className="mt-4 text-sm font-medium text-slate-800">
                                Nenhuma imagem de {config.titulo.toLowerCase()} carregada
                              </p>
                              <p className="mt-1 max-w-xs text-sm text-slate-500">
                                Use uma foto nítida para facilitar conferência visual no cadastro e no detalhe do produto.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <input
                          ref={inputsImagem[config.tipo]}
                          id={inputId}
                          name={config.inputName}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(event) =>
                            selecionarArquivoImagem(config.tipo, event.target.files?.[0] ?? null)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => abrirSeletorImagem(config.tipo)}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                          {draft.previewUrl ? <RefreshCw size={15} /> : <Upload size={15} />}
                          {draft.previewUrl ? 'Trocar imagem' : 'Enviar imagem'}
                        </button>
                        <button
                          type="button"
                          onClick={() => limparImagem(config.tipo)}
                          disabled={!draft.previewUrl && !draft.arquivo && !draft.urlInicial}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Remover
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>Renderização otimizada para revisão administrativa.</span>
                        <span>Sem imagem obrigatória.</span>
                      </div>

                      <input
                        type="hidden"
                        name={config.removeFieldName}
                        value={draft.removida ? 'true' : 'false'}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <input type="hidden" name="imagem_url" value={imagemLegadaInicial} />

          <input type="hidden" name="roteiro" value={roteiroPayload} />

          <div className="rounded-xl border border-gray-200">
            <div className="border-b px-4 py-3">
              <h3 className="font-medium text-gray-900">Setores do roteiro</h3>
              <p className="mt-1 text-sm text-gray-500">
                Adicione os setores do produto na ordem oficial do fluxo. Dentro de cada setor,
                as operacoes seguem a ordem em que voce selecionar.
              </p>
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <label htmlFor="busca-setor" className="text-sm font-medium text-gray-700">
                Buscar setor
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                />
                <input
                  id="busca-setor"
                  type="text"
                  value={buscaSetor}
                  onChange={(event) => setBuscaSetor(event.target.value)}
                  placeholder="Digite o nome ou codigo do setor"
                  className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {setoresDisponiveisParaAdicionar.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    {termoBuscaSetor
                      ? 'Nenhum setor encontrado para o termo informado.'
                      : 'Todos os setores com operacoes ja foram adicionados ao roteiro.'}
                  </p>
                ) : (
                  setoresDisponiveisParaAdicionar.map((setor) => (
                    <button
                      key={setor.id}
                      type="button"
                      onClick={() => adicionarSetor(setor.id)}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Plus size={14} />
                      S{setor.codigo} • {setor.nome}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {setoresSelecionados.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Adicione o primeiro setor para montar o roteiro do produto.
                  </p>
                ) : (
                  setoresSelecionados.map((setor) => {
                    const setorAtivoAtual = setor.id === setorAtivoId
                    const totalSelecionadoNoSetor = roteiroIds.filter(
                      (operacaoId) => operacoesPorId.get(operacaoId)?.setor_id === setor.id
                    ).length

                    return (
                      <div
                        key={setor.id}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                          setorAtivoAtual
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSetorAtivoId(setor.id)}
                          className="text-left"
                        >
                          <p className="text-sm font-medium text-gray-900">
                            S{setor.codigo} • {setor.nome}
                          </p>
                          <p className="text-xs text-gray-500">
                            {totalSelecionadoNoSetor} de {setor.operacoes.length} operacoes
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removerSetor(setor.id)}
                          aria-label={`Remover setor ${setor.nome}`}
                          title={`Remover setor ${setor.nome} do roteiro`}
                          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="rounded-xl border border-gray-200">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">Operacoes do setor</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {setorAtivo
                    ? `Selecione as operacoes de S${setorAtivo.codigo} • ${setorAtivo.nome}.`
                    : 'Escolha um setor acima para selecionar as operacoes.'}
                </p>
              </div>
              {setorAtivo ? (
                <div className="border-b border-gray-100 px-4 py-3">
                  <label htmlFor="busca-operacao" className="text-sm font-medium text-gray-700">
                    Buscar operacao no setor
                  </label>
                  <div className="relative mt-2">
                    <Search
                      size={16}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      id="busca-operacao"
                      type="text"
                      value={buscaOperacao}
                      onChange={(event) => setBuscaOperacao(event.target.value)}
                      placeholder="Digite codigo, descricao ou tipo"
                      className="w-full rounded-lg border border-gray-300 py-2 pr-3 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {termoBuscaOperacao
                      ? `${operacoesFiltradasDoSetorAtivo.length} de ${operacoesDoSetorAtivo.length} operacoes visiveis. Operacoes ja selecionadas continuam disponiveis.`
                      : `${operacoesDoSetorAtivo.length} operacoes disponiveis neste setor.`}
                  </p>
                </div>
              ) : null}
              <div className="max-h-[360px] overflow-y-auto">
                {!setorAtivo ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Adicione um setor para liberar a selecao das operacoes.
                  </div>
                ) : operacoesDoSetorAtivo.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma operacao disponivel neste setor.
                  </div>
                ) : operacoesFiltradasDoSetorAtivo.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma operacao encontrada para o termo informado neste setor.
                  </div>
                ) : (
                  operacoesFiltradasDoSetorAtivo.map((operacao) => {
                    const selecionada = roteiroIds.includes(operacao.id)

                    return (
                      <div
                        key={operacao.id}
                        className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-600">
                            <span className="font-medium text-gray-900">{operacao.codigo}</span>{' '}
                            • {operacao.descricao} • {operacao.maquinaModelo ?? 'Sem máquina'} •
                            {' '}T.P {operacao.tempo_padrao_min}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            selecionada
                              ? removerOperacao(operacao.id)
                              : adicionarOperacao(operacao.id)
                          }
                          title={
                            selecionada
                              ? `Remover ${operacao.codigo} do roteiro`
                              : `Adicionar ${operacao.codigo} ao roteiro`
                          }
                          className={`ml-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            selecionada
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          {selecionada ? (
                            <>
                              <Trash2 size={16} />
                              Remover
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              Adicionar
                            </>
                          )}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">Roteiro selecionado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  O roteiro final respeita a ordem oficial dos setores e a ordem de selecao das
                  operacoes em cada setor.
                </p>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {operacoesSelecionadas.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Adicione setores e selecione operacoes para montar o roteiro do produto.
                  </div>
                ) : (
                  setoresSelecionados.map((setor) => {
                    const operacoesDoSetor = roteiroIdsOrdenados
                      .map((operacaoId) => operacoesPorId.get(operacaoId))
                      .filter(
                        (operacao): operacao is OperacaoListItem =>
                          operacao !== undefined && operacao.setor_id === setor.id
                      )

                    return (
                      <div key={setor.id} className="border-b border-gray-100 px-4 py-4 last:border-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wide text-gray-500">
                              Setor {setor.codigo}
                            </p>
                            <p className="font-medium text-gray-900">{setor.nome}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerSetor(setor.id)}
                            aria-label={`Remover setor ${setor.nome}`}
                            title={`Remover setor ${setor.nome} do roteiro`}
                            className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {operacoesDoSetor.length === 0 ? (
                          <p className="mt-3 text-sm text-gray-400">
                            Nenhuma operacao selecionada neste setor ainda.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {operacoesDoSetor.map((operacao, index) => {
                              const sequenciaGlobal = roteiroIdsOrdenados.indexOf(operacao.id) + 1

                              return (
                                <div
                                  key={operacao.id}
                                  className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-xs uppercase tracking-wide text-gray-500">
                                      Seq. {sequenciaGlobal} • Ordem no setor {index + 1}
                                    </p>
                                    <p className="truncate text-sm text-gray-600">
                                      <span className="font-medium text-gray-900">
                                        {operacao.codigo}
                                      </span>{' '}
                                      • {operacao.descricao} • {operacao.maquinaModelo ?? 'Sem máquina'} • T.P {operacao.tempo_padrao_min}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removerOperacao(operacao.id)}
                                    aria-label={`Remover ${operacao.codigo}`}
                                    title={`Remover ${operacao.codigo} do roteiro`}
                                    className="rounded-lg border border-red-200 p-2 text-red-600 transition-colors hover:bg-red-50"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              title="Cancelar edicao"
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pendente}
              title={pendente ? 'Salvando produto' : 'Salvar produto'}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {pendente ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
