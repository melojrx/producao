'use client'

import { useActionState, useEffect } from 'react'
import { X } from 'lucide-react'
import {
  criarTipoDefeitoQualidade,
  editarTipoDefeitoQualidade,
} from '@/lib/actions/qualidade-defeitos'
import type { FormActionState, QualidadeTipoDefeitoListItem } from '@/types'

interface ModalTipoDefeitoProps {
  tipoDefeito?: QualidadeTipoDefeitoListItem
  aoFechar: () => void
}

const estadoInicial: FormActionState = {
  erro: undefined,
  sucesso: false,
}

const classificacoes = [
  { value: 'processo', label: 'Processo' },
  { value: 'operador', label: 'Operador' },
  { value: 'maquina', label: 'Máquina' },
  { value: 'materia_prima', label: 'Matéria-prima' },
] as const

export function ModalTipoDefeito({ tipoDefeito, aoFechar }: ModalTipoDefeitoProps) {
  const acao = tipoDefeito
    ? editarTipoDefeitoQualidade.bind(null, tipoDefeito.id)
    : criarTipoDefeitoQualidade
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const modoEdicao = Boolean(tipoDefeito)

  useEffect(() => {
    if (estado.sucesso) {
      aoFechar()
    }
  }, [aoFechar, estado.sucesso])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={modoEdicao ? 'Editar tipo de defeito' : 'Novo tipo de defeito'}
    >
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            {modoEdicao ? 'Editar Tipo de Defeito' : 'Novo Tipo de Defeito'}
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

        <form action={executar} className="flex flex-col gap-4 p-5">
          {estado.erro ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {estado.erro}
            </div>
          ) : null}

          {modoEdicao ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              {tipoDefeito?.totalVinculosHistoricos ?? 0} vínculo(s) histórico(s) em revisões.
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <label htmlFor="nome" className="text-sm font-medium text-gray-700">
              Nome <span aria-hidden>*</span>
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              defaultValue={tipoDefeito?.nome ?? ''}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="flex flex-col gap-1">
              <label htmlFor="classificacao" className="text-sm font-medium text-gray-700">
                Classificação interna
              </label>
              <select
                id="classificacao"
                name="classificacao"
                defaultValue={tipoDefeito?.classificacao ?? 'processo'}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {classificacoes.map((classificacao) => (
                  <option key={classificacao.value} value={classificacao.value}>
                    {classificacao.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="ordem" className="text-sm font-medium text-gray-700">
                Ordem
              </label>
              <input
                id="ordem"
                name="ordem"
                type="number"
                min={0}
                step={1}
                required
                defaultValue={tipoDefeito?.ordem ?? 0}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="ativo" className="text-sm font-medium text-gray-700">
              Situação
            </label>
            <select
              id="ativo"
              name="ativo"
              defaultValue={String(tipoDefeito?.ativo ?? true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="true">Ativo</option>
              <option value="false">Inativo</option>
            </select>
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
              title={pendente ? 'Salvando tipo de defeito' : 'Salvar tipo de defeito'}
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
