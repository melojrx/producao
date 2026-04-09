'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Gauge, TableProperties, Timer } from 'lucide-react'
import type { ResumoEficienciaOperacionalTurnoV2 } from '@/types'

interface EficienciaOperacionalTurnoV2Props {
  resumo: ResumoEficienciaOperacionalTurnoV2 | undefined
  operadoresDisponiveis: number
}

const ITENS_POR_PAGINA_OPERACAO = 10

function formatarHora(valor: string): string {
  const data = new Date(valor)

  if (Number.isNaN(data.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(data)
}

function formatarData(valor: string): string {
  const [ano, mes, dia] = valor.split('-')

  if (!ano || !mes || !dia) {
    return valor
  }

  return `${dia}/${mes}/${ano}`
}

function formatarNumero(valor: number, decimals = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valor)
}

function classeEficiencia(eficienciaPct: number): string {
  if (eficienciaPct >= 100) {
    return 'bg-emerald-100 text-emerald-700'
  }

  if (eficienciaPct >= 70) {
    return 'bg-blue-100 text-blue-700'
  }

  if (eficienciaPct >= 50) {
    return 'bg-amber-100 text-amber-700'
  }

  return 'bg-rose-100 text-rose-700'
}

function calcularTotalPaginas(totalItens: number, itensPorPagina: number): number {
  if (totalItens <= 0) {
    return 1
  }

  return Math.ceil(totalItens / itensPorPagina)
}

function paginarItens<T>(itens: T[], paginaAtual: number, itensPorPagina: number): T[] {
  const inicio = (paginaAtual - 1) * itensPorPagina
  return itens.slice(inicio, inicio + itensPorPagina)
}

function formatarResumoPaginacao(
  totalItens: number,
  paginaAtual: number,
  itensPorPagina: number,
  legenda: string
): string {
  if (totalItens === 0) {
    return `Mostrando 0 de 0 ${legenda}`
  }

  const inicio = (paginaAtual - 1) * itensPorPagina + 1
  const fim = Math.min(paginaAtual * itensPorPagina, totalItens)

  return `Mostrando ${inicio}-${fim} de ${totalItens} ${legenda}`
}

function PaginacaoTabela({
  paginaAtual,
  totalPaginas,
  totalItens,
  itensPorPagina,
  legenda,
  onChange,
}: {
  paginaAtual: number
  totalPaginas: number
  totalItens: number
  itensPorPagina: number
  legenda: string
  onChange: (pagina: number) => void
}) {
  const paginas = Array.from({ length: totalPaginas }, (_, index) => index + 1)

  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <p className="truncate whitespace-nowrap text-sm text-slate-600">
        {formatarResumoPaginacao(totalItens, paginaAtual, itensPorPagina, legenda)}
      </p>

      <div className="flex min-w-max items-center gap-2 overflow-x-auto whitespace-nowrap">
        <button
          type="button"
          onClick={() => onChange(1)}
          disabled={paginaAtual === 1}
          aria-label="Primeira página"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange(paginaAtual - 1)}
          disabled={paginaAtual === 1}
          aria-label="Página anterior"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <div
          aria-live="polite"
          className="inline-flex h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700"
        >
          {paginaAtual} / {paginas.length}
        </div>

        <button
          type="button"
          onClick={() => onChange(paginaAtual + 1)}
          disabled={paginaAtual === totalPaginas}
          aria-label="Próxima página"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onChange(totalPaginas)}
          disabled={paginaAtual === totalPaginas}
          aria-label="Última página"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  )
}

export function EficienciaOperacionalTurnoV2({
  resumo,
  operadoresDisponiveis,
}: EficienciaOperacionalTurnoV2Props) {
  const porHora = resumo?.porHora ?? []
  const porDia = resumo?.porDia ?? []
  const porOperacao = resumo?.porOperacao ?? []
  const itensPorPaginaSuperior = Math.max(1, operadoresDisponiveis)
  const [paginaHora, setPaginaHora] = useState(1)
  const [paginaDia, setPaginaDia] = useState(1)
  const [paginaOperacao, setPaginaOperacao] = useState(1)

  const totalPaginasHora = useMemo(
    () => calcularTotalPaginas(porHora.length, itensPorPaginaSuperior),
    [itensPorPaginaSuperior, porHora.length]
  )
  const totalPaginasDia = useMemo(
    () => calcularTotalPaginas(porDia.length, itensPorPaginaSuperior),
    [itensPorPaginaSuperior, porDia.length]
  )
  const totalPaginasOperacao = useMemo(
    () => calcularTotalPaginas(porOperacao.length, ITENS_POR_PAGINA_OPERACAO),
    [porOperacao.length]
  )

  useEffect(() => {
    setPaginaHora((paginaAtual) => Math.min(paginaAtual, totalPaginasHora))
  }, [totalPaginasHora])

  useEffect(() => {
    setPaginaDia((paginaAtual) => Math.min(paginaAtual, totalPaginasDia))
  }, [totalPaginasDia])

  useEffect(() => {
    setPaginaOperacao((paginaAtual) => Math.min(paginaAtual, totalPaginasOperacao))
  }, [totalPaginasOperacao])

  const porHoraPaginado = useMemo(
    () => paginarItens(porHora, paginaHora, itensPorPaginaSuperior),
    [itensPorPaginaSuperior, paginaHora, porHora]
  )
  const porDiaPaginado = useMemo(
    () => paginarItens(porDia, paginaDia, itensPorPaginaSuperior),
    [itensPorPaginaSuperior, paginaDia, porDia]
  )
  const porOperacaoPaginado = useMemo(
    () => paginarItens(porOperacao, paginaOperacao, ITENS_POR_PAGINA_OPERACAO),
    [paginaOperacao, porOperacao]
  )

  const destaqueResumo = useMemo(() => {
    const melhorEficienciaDia = porDia.reduce((maior, registro) => {
      return registro.eficienciaPct > maior ? registro.eficienciaPct : maior
    }, 0)

    const mediaEficienciaDia =
      porDia.length > 0
        ? porDia.reduce((soma, registro) => soma + registro.eficienciaPct, 0) / porDia.length
        : 0

    return {
      horasConsolidadas: porHora.length,
      operacoesDetalhadas: porOperacao.length,
      melhorEficienciaDia,
      mediaEficienciaDia,
    }
  }, [porDia, porHora.length, porOperacao.length])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Eficiência operacional</h2>
        <p className="text-sm text-slate-600">
          A aba separa três leituras complementares: eficiência consolidada da hora, eficiência do
          dia por operador e detalhamento de eficiência por operação.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          title="Horas consolidadas por operador no turno carregado."
          aria-label="Horas consolidadas por operador no turno carregado."
          className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Horas consolidadas
            </p>
            <TableProperties size={18} className="text-blue-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.horasConsolidadas)}
          </p>
        </div>

        <div
          title="Linhas detalhadas de eficiência por operação no turno carregado."
          aria-label="Linhas detalhadas de eficiência por operação no turno carregado."
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Operações detalhadas
            </p>
            <Gauge size={18} className="text-slate-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.operacoesDetalhadas)}
          </p>
        </div>

        <div
          title="Maior eficiência individual encontrada no resumo diário do turno."
          aria-label="Maior eficiência individual encontrada no resumo diário do turno."
          className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Melhor eficiência dia
            </p>
            <Timer size={18} className="text-emerald-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.melhorEficienciaDia, 2)}%
          </p>
        </div>

        <div
          title="Média simples das eficiências diárias exibidas no turno atual."
          aria-label="Média simples das eficiências diárias exibidas no turno atual."
          className="rounded-2xl border border-amber-100 bg-amber-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">
              Média eficiência dia
            </p>
            <Gauge size={18} className="text-amber-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.mediaEficienciaDia, 2)}%
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eficiência por hora</h3>
            <p className="text-sm text-slate-600">
              Consolidado por hora e operador, somando todas as operações realizadas naquele
              período.
            </p>
          </div>

          {porHora.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Ainda não há apontamentos suficientes no turno para montar a leitura consolidada de
              eficiência por hora.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Hora</th>
                      <th className="px-4 py-3">Operador</th>
                      <th className="px-4 py-3">Operações</th>
                      <th className="px-4 py-3">Peças</th>
                      <th className="px-4 py-3">Min. padrão</th>
                      <th className="px-4 py-3">Efic%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {porHoraPaginado.map((registro) => (
                      <tr key={`${registro.hora}:${registro.operadorId}`}>
                        <td className="px-4 py-3 align-top font-medium text-slate-900">
                          {formatarHora(registro.hora)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-slate-900">{registro.operadorNome}</div>
                          <div className="text-xs text-slate-500">{registro.operadorMatricula}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          <div className="font-medium text-slate-900">
                            {formatarNumero(registro.totalOperacoes)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {registro.totalOperacoes === 1
                              ? 'Uma operação nesta hora'
                              : 'Mais de uma operação nesta hora'}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {formatarNumero(registro.quantidadeRealizada)}
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {formatarNumero(registro.minutosPadraoRealizados, 2)} min
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classeEficiencia(registro.eficienciaPct)}`}
                          >
                            {formatarNumero(registro.eficienciaPct, 2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginacaoTabela
                paginaAtual={paginaHora}
                totalPaginas={totalPaginasHora}
                totalItens={porHora.length}
                itensPorPagina={itensPorPaginaSuperior}
                legenda="horas consolidadas"
                onChange={setPaginaHora}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eficiência do dia por operador</h3>
            <p className="text-sm text-slate-600">
              Consolidado diário do turno usando os minutos configurados na jornada do próprio
              turno.
            </p>
          </div>

          {porDia.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              O resumo diário será exibido assim que houver apontamentos válidos para o turno.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Operador</th>
                      <th className="px-4 py-3">Peças</th>
                      <th className="px-4 py-3">Efic%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {porDiaPaginado.map((registro) => (
                      <tr key={`${registro.data}:${registro.operadorId}`}>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatarData(registro.data)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{registro.operadorNome}</div>
                          <div className="text-xs text-slate-500">{registro.operadorMatricula}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatarNumero(registro.quantidadeRealizada)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classeEficiencia(registro.eficienciaPct)}`}
                          >
                            {formatarNumero(registro.eficienciaPct, 2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginacaoTabela
                paginaAtual={paginaDia}
                totalPaginas={totalPaginasDia}
                totalItens={porDia.length}
                itensPorPagina={itensPorPaginaSuperior}
                legenda="operadores no resumo diário"
                onChange={setPaginaDia}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Eficiência por operação</h3>
          <p className="text-sm text-slate-600">
            Detalhamento de cada operação que compôs a eficiência do operador dentro de cada hora.
          </p>
        </div>

        {porOperacao.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
            O detalhamento por operação será exibido assim que houver apontamentos válidos para o
            turno.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3">Operação</th>
                    <th className="px-4 py-3">T.P.</th>
                    <th className="px-4 py-3">Meta/hora</th>
                    <th className="px-4 py-3">Realizado</th>
                    <th className="px-4 py-3">Efic%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {porOperacaoPaginado.map((registro) => (
                    <tr key={`${registro.hora}:${registro.operadorId}:${registro.operacaoId}`}>
                      <td className="px-4 py-3 align-top font-medium text-slate-900">
                        {formatarHora(registro.hora)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">{registro.operadorNome}</div>
                        <div className="text-xs text-slate-500">{registro.operadorMatricula}</div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="font-medium text-slate-900">{registro.operacaoDescricao}</div>
                        <div className="text-xs text-slate-500">{registro.operacaoCodigo}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatarNumero(registro.tempoPadraoMinSnapshot, 2)} min
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatarNumero(registro.metaHora)}
                      </td>
                      <td className="px-4 py-3 align-top text-slate-700">
                        {formatarNumero(registro.quantidadeRealizada)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classeEficiencia(registro.eficienciaPct)}`}
                        >
                          {formatarNumero(registro.eficienciaPct, 2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginacaoTabela
              paginaAtual={paginaOperacao}
              totalPaginas={totalPaginasOperacao}
              totalItens={porOperacao.length}
              itensPorPagina={ITENS_POR_PAGINA_OPERACAO}
              legenda="operações detalhadas"
              onChange={setPaginaOperacao}
            />
          </div>
        )}
      </div>
    </section>
  )
}
