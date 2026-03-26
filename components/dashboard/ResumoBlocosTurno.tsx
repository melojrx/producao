'use client'

import { Layers3, Package, PencilRuler } from 'lucide-react'
import type { ProducaoBlocoResumo } from '@/types'

interface ResumoBlocosTurnoProps {
  blocos: ProducaoBlocoResumo[]
  estaCarregando: boolean
}

function formatarProgresso(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor)
}

export function ResumoBlocosTurno({
  blocos,
  estaCarregando,
}: ResumoBlocosTurnoProps) {
  const totalConcluidos = blocos.filter((bloco) => bloco.status === 'concluido').length
  const totalPendentes = blocos.filter((bloco) => bloco.status !== 'concluido').length

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Planejamento por bloco</h3>
          <p className="mt-1 text-sm text-slate-600">
            Total do dia consolidado e progresso de cada bloco planejado.
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          {totalConcluidos} concluídos • {totalPendentes} pendentes
        </div>
      </div>

      {estaCarregando && blocos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Carregando planejamento do dia...
        </div>
      ) : null}

      {!estaCarregando && blocos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Nenhum bloco planejado para hoje.
        </div>
      ) : null}

      <div className="space-y-3">
        {blocos.map((bloco) => {
          const porcentagemBarra = Math.min(bloco.progressoPct, 100)
          const IconeOrigem = bloco.origemTp === 'produto' ? Package : PencilRuler

          return (
            <article
              key={bloco.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      Bloco {bloco.sequencia}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        bloco.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-700'
                          : bloco.status === 'concluido'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {bloco.status === 'ativo'
                        ? 'Ativo'
                        : bloco.status === 'concluido'
                          ? 'Concluído'
                          : 'Planejado'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      <IconeOrigem size={12} />
                      {bloco.origemTp === 'produto' ? 'Produto' : 'Manual'}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-slate-900">{bloco.descricaoBloco}</h4>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{bloco.funcionariosAtivos} operadores</span>
                    <span>{bloco.minutosPlanejados} min</span>
                    <span>T.P {bloco.tpProdutoMin.toFixed(2)}</span>
                  </div>
                </div>

                <div className="grid gap-2 text-right text-sm text-slate-600 md:min-w-48">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <span>Realizado</span>
                    <strong className="text-slate-900">{bloco.realizado}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <span>Meta</span>
                    <strong className="text-slate-900">{bloco.metaGrupo}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                    <span>Progresso</span>
                    <strong className="text-slate-900">{formatarProgresso(bloco.progressoPct)}%</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Layers3 size={12} />
                    Andamento do bloco
                  </span>
                  <span>{formatarProgresso(bloco.progressoPct)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-[width] duration-300 ${
                      bloco.status === 'concluido'
                        ? 'bg-blue-500'
                        : bloco.status === 'ativo'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500'
                    }`}
                    style={{ width: `${porcentagemBarra}%` }}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
