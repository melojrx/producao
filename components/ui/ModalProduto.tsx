'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus, Search, Trash2, X } from 'lucide-react'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
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

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }

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
  const [roteiroIds, setRoteiroIds] = useState<string[]>(
    produtoInicial ? produtoInicial.roteiro.map((item) => item.operacaoId) : []
  )
  const [buscaSetor, setBuscaSetor] = useState('')
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

  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
  const setoresDisponiveis = listarSetoresDisponiveis(setores, operacoes)
  const setoresPorId = new Map(setoresDisponiveis.map((setor) => [setor.id, setor]))
  const setoresSelecionados = setoresDisponiveis.filter((setor) =>
    setoresSelecionadosIds.includes(setor.id)
  )
  const primeiroSetorSelecionadoId = setoresSelecionados[0]?.id ?? null

  useEffect(() => {
    if (setorAtivoId && setoresSelecionadosIds.includes(setorAtivoId)) {
      return
    }

    if (primeiroSetorSelecionadoId !== setorAtivoId) {
      setSetorAtivoId(primeiroSetorSelecionadoId)
    }
  }, [primeiroSetorSelecionadoId, setorAtivoId, setoresSelecionadosIds])

  const roteiroIdsOrdenados = setoresDisponiveis.flatMap((setor) =>
    roteiroIds.filter((operacaoId) => operacoesPorId.get(operacaoId)?.setor_id === setor.id)
  )
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
  const modoEdicao = !!produto
  const modoDuplicacao = !produto && !!produtoBase

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
          </div>
          {/*
            Campo mantido comentado por decisão de produto.
            A URL da imagem permanece oculta até a futura entrega de inclusao real da imagem.
            Quando esse fluxo for retomado, reintroduzir o bloco abaixo e substituir o hidden input.

            <div className="flex flex-col gap-1 md:col-span-10">
              <label htmlFor="imagem_url" className="text-sm font-medium text-gray-700">
                URL da imagem
              </label>
              <input
                id="imagem_url"
                name="imagem_url"
                type="url"
                defaultValue={produto?.imagem_url ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          */}
          <input type="hidden" name="imagem_url" value={produtoInicial?.imagem_url ?? ''} />

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
              <div className="max-h-[360px] overflow-y-auto">
                {!setorAtivo ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Adicione um setor para liberar a selecao das operacoes.
                  </div>
                ) : operacoesDoSetorAtivo.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma operacao disponivel neste setor.
                  </div>
                ) : (
                  operacoesDoSetorAtivo.map((operacao) => {
                    const selecionada = roteiroIds.includes(operacao.id)

                    return (
                      <div
                        key={operacao.id}
                        className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-gray-600">
                            <span className="font-medium text-gray-900">{operacao.codigo}</span>{' '}
                            • {operacao.descricao} • {operacao.tipoNome ?? 'Sem tipo'} • T.P{' '}
                            {operacao.tempo_padrao_min}
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
                                      • {operacao.descricao} • {operacao.tipoNome ?? 'Sem tipo'} •
                                      {' '}T.P {operacao.tempo_padrao_min}
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
