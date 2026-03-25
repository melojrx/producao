'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings2, X } from 'lucide-react'
import {
  salvarConfiguracaoTurnoFormulario,
  type ConfiguracaoTurnoActionState,
} from '@/lib/actions/turno'
import { calcularMetaGrupo } from '@/lib/utils/producao'
import type { ConfiguracaoTurno, ProdutoTurnoOption } from '@/types'

interface ModalConfiguracaoTurnoProps {
  produtos: ProdutoTurnoOption[]
  configuracaoAtual: ConfiguracaoTurno | null
  bloqueante?: boolean
  aoFechar?: () => void
}

const estadoInicial: ConfiguracaoTurnoActionState = {
  erro: undefined,
  sucesso: false,
  metaGrupo: undefined,
}

export function ModalConfiguracaoTurno({
  produtos,
  configuracaoAtual,
  bloqueante = false,
  aoFechar,
}: ModalConfiguracaoTurnoProps) {
  const router = useRouter()
  const [estado, executar, pendente] = useActionState(
    salvarConfiguracaoTurnoFormulario,
    estadoInicial
  )
  const [funcionariosAtivos, setFuncionariosAtivos] = useState(
    configuracaoAtual ? String(configuracaoAtual.funcionariosAtivos) : '20'
  )
  const [minutosTurno, setMinutosTurno] = useState(
    configuracaoAtual ? String(configuracaoAtual.minutosTurno) : '540'
  )
  const [produtoId, setProdutoId] = useState(configuracaoAtual?.produtoId ?? '')

  useEffect(() => {
    if (!estado.sucesso) {
      return
    }

    if (aoFechar) {
      aoFechar()
    }

    router.refresh()
  }, [aoFechar, estado.sucesso, router])

  const produtoSelecionado =
    produtos.find((produto) => produto.id === produtoId) ?? null

  const funcionariosPreview = Number.parseInt(funcionariosAtivos, 10)
  const minutosPreview = Number.parseInt(minutosTurno, 10)
  const tpProdutoPreview = produtoSelecionado?.tpProdutoMin ?? 0
  const metaGrupoPreview =
    Number.isInteger(funcionariosPreview) &&
    Number.isInteger(minutosPreview) &&
    produtoSelecionado
      ? calcularMetaGrupo(funcionariosPreview, minutosPreview, tpProdutoPreview)
      : 0

  const titulo = configuracaoAtual ? 'Editar Configuração do Turno' : 'Configurar Turno de Hoje'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
              <Settings2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
              <p className="text-sm text-slate-500">
                Defina operadores ativos, minutos de trabalho e o produto do dia.
              </p>
            </div>
          </div>

          {!bloqueante && aoFechar ? (
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar configuração do turno"
              title="Fechar"
              className="text-slate-400 transition-colors hover:text-slate-600"
            >
              <X size={20} />
            </button>
          ) : null}
        </div>

        <form action={executar} className="flex flex-col gap-5 p-6">
          {estado.erro ? (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {estado.erro}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="funcionarios_ativos" className="text-sm font-medium text-slate-700">
                Funcionários ativos <span aria-hidden>*</span>
              </label>
              <input
                id="funcionarios_ativos"
                name="funcionarios_ativos"
                type="number"
                min="1"
                step="1"
                required
                value={funcionariosAtivos}
                onChange={(event) => setFuncionariosAtivos(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="minutos_turno" className="text-sm font-medium text-slate-700">
                Minutos do turno <span aria-hidden>*</span>
              </label>
              <input
                id="minutos_turno"
                name="minutos_turno"
                type="number"
                min="1"
                step="1"
                required
                value={minutosTurno}
                onChange={(event) => setMinutosTurno(event.target.value)}
                className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500">Sugestão: 480 ou 540 minutos.</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="produto_id" className="text-sm font-medium text-slate-700">
              Produto do dia <span aria-hidden>*</span>
            </label>
            <select
              id="produto_id"
              name="produto_id"
              required
              value={produtoId}
              onChange={(event) => setProdutoId(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Selecione um produto ativo
              </option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} ({produto.referencia}) • T.P {produto.tpProdutoMin.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 rounded-2xl border border-blue-100 bg-linear-to-br from-blue-50 to-cyan-50 p-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                T.P Produto
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {tpProdutoPreview.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Soma das operações do roteiro do produto selecionado.
              </p>
            </div>

            <div>
              <p className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                Meta Grupo
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{metaGrupoPreview}</p>
              <p className="mt-1 text-sm text-slate-600">
                Produtos completos previstos para o turno de hoje.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {produtoSelecionado ? (
              <p>
                Produto selecionado: <span className="font-medium text-slate-900">{produtoSelecionado.nome}</span>{' '}
                ({produtoSelecionado.referencia}).
              </p>
            ) : (
              <p>Selecione um produto ativo para visualizar o T.P Produto e a Meta Grupo.</p>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            {!bloqueante && aoFechar ? (
              <button
                type="button"
                onClick={aoFechar}
                title="Cancelar edição"
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancelar
              </button>
            ) : null}

            <button
              type="submit"
              disabled={pendente || produtos.length === 0}
              title={pendente ? 'Salvando configuração do turno' : 'Salvar configuração do turno'}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendente ? 'Salvando...' : 'Salvar configuração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
