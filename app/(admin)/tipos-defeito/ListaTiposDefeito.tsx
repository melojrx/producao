'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Archive, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react'
import {
  alterarStatusTipoDefeitoQualidade,
  excluirTipoDefeitoQualidade,
} from '@/lib/actions/qualidade-defeitos'
import { ModalTipoDefeito } from '@/components/ui/ModalTipoDefeito'
import type {
  QualidadeTipoDefeitoListItem,
  QualidadeTipoDefeitoStatusFiltro,
} from '@/types'

interface ListaTiposDefeitoProps {
  buscaInicial: string
  statusInicial: QualidadeTipoDefeitoStatusFiltro
  tiposDefeito: QualidadeTipoDefeitoListItem[]
}

const classificacaoLabel: Record<string, string> = {
  maquina: 'Máquina',
  operador: 'Operador',
  processo: 'Processo',
  materia_prima: 'Matéria-prima',
}

function statusBadge(ativo: boolean): string {
  return ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
}

export function ListaTiposDefeito({
  buscaInicial,
  statusInicial,
  tiposDefeito,
}: ListaTiposDefeitoProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [busca, setBusca] = useState(buscaInicial)
  const [status, setStatus] = useState<QualidadeTipoDefeitoStatusFiltro>(statusInicial)
  const [modalAberto, setModalAberto] = useState(false)
  const [tipoEditando, setTipoEditando] = useState<QualidadeTipoDefeitoListItem | undefined>()
  const [erro, setErro] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [pendente, startTransition] = useTransition()

  useEffect(() => {
    setBusca(buscaInicial)
  }, [buscaInicial])

  useEffect(() => {
    setStatus(statusInicial)
  }, [statusInicial])

  function atualizarUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) {
        params.delete(key)
        return
      }

      params.set(key, value)
    })

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  function aplicarFiltros(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    atualizarUrl({
      busca: busca.trim() || null,
      status: status === 'todos' ? null : status,
    })
  }

  function limparBusca() {
    setBusca('')
    atualizarUrl({
      busca: null,
      status: status === 'todos' ? null : status,
    })
  }

  function abrirCriar() {
    setTipoEditando(undefined)
    setModalAberto(true)
    setErro(null)
    setMensagem(null)
  }

  function abrirEditar(tipoDefeito: QualidadeTipoDefeitoListItem) {
    setTipoEditando(tipoDefeito)
    setModalAberto(true)
    setErro(null)
    setMensagem(null)
  }

  function alterarStatus(tipoDefeito: QualidadeTipoDefeitoListItem, ativo: boolean) {
    setErro(null)
    setMensagem(null)

    startTransition(async () => {
      const resultado = await alterarStatusTipoDefeitoQualidade(tipoDefeito.id, ativo)

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível alterar o status do tipo de defeito.')
        return
      }

      setMensagem(ativo ? 'Tipo de defeito reativado.' : 'Tipo de defeito inativado.')
      router.refresh()
    })
  }

  function excluirTipo(tipoDefeito: QualidadeTipoDefeitoListItem) {
    const mensagemConfirmacao =
      tipoDefeito.totalVinculosHistoricos > 0
        ? `O tipo "${tipoDefeito.nome}" possui histórico e será apenas inativado. Continuar?`
        : `Excluir permanentemente o tipo "${tipoDefeito.nome}"?`

    if (!confirm(mensagemConfirmacao)) {
      return
    }

    setErro(null)
    setMensagem(null)

    startTransition(async () => {
      const resultado = await excluirTipoDefeitoQualidade(tipoDefeito.id)

      if (!resultado.sucesso) {
        setErro(resultado.erro ?? 'Não foi possível excluir ou inativar o tipo de defeito.')
        return
      }

      setMensagem(
        tipoDefeito.totalVinculosHistoricos > 0
          ? 'Tipo de defeito inativado para preservar o histórico.'
          : 'Tipo de defeito excluído.'
      )
      router.refresh()
    })
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={aplicarFiltros} className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={busca}
              onChange={(event) => setBusca(event.target.value)}
              placeholder="Buscar por nome ou classificação..."
              aria-label="Buscar tipos de defeito"
              className="w-full rounded-lg border border-gray-300 py-2 pr-10 pl-9 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {busca ? (
              <button
                type="button"
                onClick={limparBusca}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as QualidadeTipoDefeitoStatusFiltro)
            }
            aria-label="Filtrar por status"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="todos">Todos</option>
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
          </select>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Search size={16} />
            Buscar
          </button>
        </form>

        <button
          type="button"
          onClick={abrirCriar}
          title="Cadastrar novo tipo de defeito"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Plus size={16} />
          Novo Tipo
        </button>
      </div>

      {erro ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      {mensagem ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {mensagem}
        </div>
      ) : null}

      <div className="mb-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">{tiposDefeito.length}</span> tipo(s)
        encontrado(s)
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Nome</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Classificação</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Ordem</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Histórico</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tiposDefeito.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    Nenhum tipo de defeito encontrado
                  </td>
                </tr>
              ) : (
                tiposDefeito.map((tipoDefeito) => (
                  <tr key={tipoDefeito.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-gray-900">{tipoDefeito.nome}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {classificacaoLabel[tipoDefeito.classificacao] ?? tipoDefeito.classificacao}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{tipoDefeito.ordem}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(
                          tipoDefeito.ativo
                        )}`}
                      >
                        {tipoDefeito.ativo ? 'ativo' : 'inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {tipoDefeito.totalVinculosHistoricos}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrirEditar(tipoDefeito)}
                        aria-label={`Editar ${tipoDefeito.nome}`}
                        title={`Editar ${tipoDefeito.nome}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      {tipoDefeito.ativo ? (
                        <button
                          type="button"
                          onClick={() => alterarStatus(tipoDefeito, false)}
                          disabled={pendente}
                          aria-label={`Inativar ${tipoDefeito.nome}`}
                          title={`Inativar ${tipoDefeito.nome}`}
                          className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-amber-600 disabled:opacity-50"
                        >
                          <Archive size={16} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => alterarStatus(tipoDefeito, true)}
                          disabled={pendente}
                          aria-label={`Reativar ${tipoDefeito.nome}`}
                          title={`Reativar ${tipoDefeito.nome}`}
                          className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-emerald-600 disabled:opacity-50"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => excluirTipo(tipoDefeito)}
                        disabled={pendente}
                        aria-label={`Excluir ${tipoDefeito.nome}`}
                        title={`Excluir ${tipoDefeito.nome}`}
                        className="inline-flex p-1.5 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalAberto ? (
        <ModalTipoDefeito
          tipoDefeito={tipoEditando}
          aoFechar={() => {
            setModalAberto(false)
            router.refresh()
          }}
        />
      ) : null}
    </>
  )
}
