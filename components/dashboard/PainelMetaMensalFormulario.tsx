'use client'

import { useActionState, useEffect, useState } from 'react'
import { PencilLine, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  criarMetaMensalFormulario,
  editarMetaMensalFormulario,
} from '@/lib/actions/metas-mensais'
import { obterDiasDaCompetencia } from '@/lib/utils/data'
import type { MetaMensal, MetaMensalActionState } from '@/types'

interface PainelMetaMensalFormularioProps {
  competencia: string
  metaMensal: MetaMensal | null
  descricao?: string
}

const estadoInicial: MetaMensalActionState = {
  erro: undefined,
  sucesso: false,
}

function formatarCompetenciaLabel(competencia: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Fortaleza',
  }).format(new Date(`${competencia}T12:00:00-03:00`))
}

export function PainelMetaMensalFormulario({
  competencia,
  metaMensal,
  descricao = 'O lançamento sempre atua sobre a competência selecionada na `Visão Geral`.',
}: PainelMetaMensalFormularioProps) {
  const router = useRouter()
  const [estaEditando, setEstaEditando] = useState(metaMensal === null)
  const acao = metaMensal
    ? editarMetaMensalFormulario.bind(null, metaMensal.id)
    : criarMetaMensalFormulario
  const [estado, executar, pendente] = useActionState(acao, estadoInicial)
  const diasMaximosCompetencia = obterDiasDaCompetencia(competencia)
  const competenciaLabel = formatarCompetenciaLabel(competencia)

  useEffect(() => {
    setEstaEditando(metaMensal === null)
  }, [competencia, metaMensal])

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    setEstaEditando(false)
    router.refresh()
  }, [estado.sucesso, router])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">Gestão da meta mensal</h3>
          <p className="text-sm text-slate-600">{descricao}</p>
        </div>

        {metaMensal ? (
          <button
            type="button"
            onClick={() => setEstaEditando((estadoAtual) => !estadoAtual)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
            aria-label={estaEditando ? 'Fechar edição da meta mensal' : 'Editar meta mensal'}
          >
            {estaEditando ? <X size={16} /> : <PencilLine size={16} />}
            {estaEditando ? 'Fechar edição' : 'Editar meta'}
          </button>
        ) : null}
      </div>

      {metaMensal && !estaEditando ? (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Competência</p>
            <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{competenciaLabel}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Meta em peças</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{metaMensal.metaPecas}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Dias produtivos</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{metaMensal.diasProdutivos}</p>
          </div>

          {metaMensal.observacao ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Observação</p>
              <p className="mt-2 text-sm text-slate-700">{metaMensal.observacao}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {estaEditando ? (
        <form
          key={`${metaMensal?.id ?? 'nova'}:${competencia}`}
          action={executar}
          className="mt-5 space-y-4"
        >
          <input type="hidden" name="competencia" value={competencia} />

          {estado.erro ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {estado.erro}
            </div>
          ) : null}

          {estado.sucesso ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Meta mensal salva com sucesso para {competenciaLabel}.
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="meta_pecas" className="text-sm font-medium text-slate-700">
                Meta mensal em peças
              </label>
              <input
                id="meta_pecas"
                name="meta_pecas"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={metaMensal?.metaPecas ?? ''}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="dias_produtivos" className="text-sm font-medium text-slate-700">
                Dias produtivos
              </label>
              <input
                id="dias_produtivos"
                name="dias_produtivos"
                type="number"
                min={1}
                max={diasMaximosCompetencia}
                step={1}
                required
                defaultValue={metaMensal?.diasProdutivos ?? ''}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <p className="text-xs text-slate-500">
                Máximo de {diasMaximosCompetencia} dia(s) nesta competência.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="observacao" className="text-sm font-medium text-slate-700">
              Observação
            </label>
            <textarea
              id="observacao"
              name="observacao"
              rows={3}
              defaultValue={metaMensal?.observacao ?? ''}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pendente}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {metaMensal ? <PencilLine size={16} /> : <Plus size={16} />}
              {pendente
                ? 'Salvando...'
                : metaMensal
                  ? 'Salvar ajustes da meta'
                  : 'Cadastrar meta mensal'}
            </button>

            {metaMensal ? (
              <button
                type="button"
                onClick={() => setEstaEditando(false)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </section>
  )
}
