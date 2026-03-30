'use client'

import { useActionState, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { criarProduto, editarProduto } from '@/lib/actions/produtos'
import { calcularTpProduto } from '@/lib/utils/producao'
import type { FormActionState, OperacaoListItem, ProdutoListItem } from '@/types'

interface ModalProdutoProps {
  produto?: ProdutoListItem
  operacoes: OperacaoListItem[]
  aoFechar: () => void
}

const estadoInicial: FormActionState = { erro: undefined, sucesso: false }

export function ModalProduto({ produto, operacoes, aoFechar }: ModalProdutoProps) {
  const acao = produto ? editarProduto.bind(null, produto.id) : criarProduto
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const [roteiroIds, setRoteiroIds] = useState<string[]>(
    produto ? produto.roteiro.map((item) => item.operacaoId) : []
  )

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  const operacoesPorId = new Map(operacoes.map((operacao) => [operacao.id, operacao]))
  const operacoesSelecionadas = roteiroIds
    .map((operacaoId) => operacoesPorId.get(operacaoId))
    .filter((operacao): operacao is OperacaoListItem => Boolean(operacao))
  const roteiroPayload = JSON.stringify(
    roteiroIds.map((operacaoId, index) => ({
      operacaoId,
      sequencia: index + 1,
    }))
  )
  const tpProdutoMin = calcularTpProduto(
    operacoesSelecionadas.map((operacao) => ({
      tempoPadraoMin: operacao.tempo_padrao_min,
    }))
  )
  const modoEdicao = !!produto

  function adicionarOperacao(operacaoId: string) {
    if (roteiroIds.includes(operacaoId)) {
      return
    }

    setRoteiroIds((roteiroAtual) => [...roteiroAtual, operacaoId])
  }

  function removerOperacao(operacaoId: string) {
    setRoteiroIds((roteiroAtual) =>
      roteiroAtual.filter((itemId) => itemId !== operacaoId)
    )
  }

  function moverOperacao(index: number, direcao: 'up' | 'down') {
    setRoteiroIds((roteiroAtual) => {
      const novoRoteiro = roteiroAtual.slice()
      const destino = direcao === 'up' ? index - 1 : index + 1

      if (destino < 0 || destino >= novoRoteiro.length) {
        return roteiroAtual
      }

      const itemAtual = novoRoteiro[index]
      const itemDestino = novoRoteiro[destino]

      if (!itemAtual || !itemDestino) {
        return roteiroAtual
      }

      novoRoteiro[index] = itemDestino
      novoRoteiro[destino] = itemAtual

      return novoRoteiro
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar produto' : 'Novo produto'}
    >
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar modal"
            title="Fechar formulário"
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

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="referencia" className="text-sm font-medium text-gray-700">
                Referência <span aria-hidden>*</span>
              </label>
              <input
                id="referencia"
                name="referencia"
                type="text"
                required
                defaultValue={produto?.referencia ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="nome" className="text-sm font-medium text-gray-700">
                Nome <span aria-hidden>*</span>
              </label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                defaultValue={produto?.nome ?? ''}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr,220px]">
            <div className="flex flex-col gap-1">
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

            {modoEdicao ? (
              <div className="flex flex-col gap-1">
                <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
                  Situação
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

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs uppercase tracking-wide text-blue-700">T.P Produto</p>
            <p className="text-3xl font-semibold text-blue-900">{tpProdutoMin.toFixed(2)}</p>
            <p className="mt-1 text-sm text-blue-700">
              Soma das operações selecionadas no roteiro.
            </p>
          </div>

          <input type="hidden" name="roteiro" value={roteiroPayload} />

          <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-xl border border-gray-200">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">Operações disponíveis</h3>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {operacoes.map((operacao) => {
                  const selecionada = roteiroIds.includes(operacao.id)
                  const operacaoSemSetor = !operacao.setor_id

                  return (
                    <div
                      key={operacao.id}
                      className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{operacao.codigo}</p>
                        <p className="truncate text-sm text-gray-600">{operacao.descricao}</p>
                        <p className="text-xs text-gray-500">
                          {operacao.setorNome ?? 'Setor não definido'} • {operacao.tipoNome ?? 'Sem tipo'} • T.P {operacao.tempo_padrao_min}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!selecionada && operacaoSemSetor}
                        onClick={() =>
                          selecionada
                            ? removerOperacao(operacao.id)
                            : adicionarOperacao(operacao.id)
                        }
                        title={
                          operacaoSemSetor && !selecionada
                            ? `Defina um setor para ${operacao.codigo} antes de usar no roteiro`
                            : selecionada
                            ? `Remover ${operacao.codigo} do roteiro`
                            : `Adicionar ${operacao.codigo} ao roteiro`
                        }
                        className={`ml-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          operacaoSemSetor && !selecionada
                            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                            : selecionada
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
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">Roteiro selecionado</h3>
              </div>
              <div className="max-h-[360px] overflow-y-auto">
                {operacoesSelecionadas.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-gray-400">
                    Adicione operações para montar o roteiro do produto.
                  </div>
                ) : (
                  operacoesSelecionadas.map((operacao, index) => (
                    <div
                      key={operacao.id}
                      className="border-b border-gray-100 px-4 py-3 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Seq. {index + 1}
                          </p>
                          <p className="font-medium text-gray-900">{operacao.codigo}</p>
                          <p className="truncate text-sm text-gray-600">
                            {operacao.descricao}
                          </p>
                          <p className="text-xs text-gray-500">
                            {operacao.setorNome ?? 'Setor não definido'} • T.P {operacao.tempo_padrao_min}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => moverOperacao(index, 'up')}
                            disabled={index === 0}
                            aria-label={`Subir ${operacao.codigo}`}
                            title={`Mover ${operacao.codigo} para cima`}
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moverOperacao(index, 'down')}
                            disabled={index === operacoesSelecionadas.length - 1}
                            aria-label={`Descer ${operacao.codigo}`}
                            title={`Mover ${operacao.codigo} para baixo`}
                            className="rounded-lg border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown size={15} />
                          </button>
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={aoFechar}
              title="Cancelar edição"
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
