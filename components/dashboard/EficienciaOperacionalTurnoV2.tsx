'use client'

import { useMemo } from 'react'
import { Gauge, TableProperties, Timer } from 'lucide-react'
import type { ResumoEficienciaOperacionalTurnoV2 } from '@/types'

interface EficienciaOperacionalTurnoV2Props {
  resumo: ResumoEficienciaOperacionalTurnoV2 | undefined
}

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

export function EficienciaOperacionalTurnoV2({
  resumo,
}: EficienciaOperacionalTurnoV2Props) {
  const porHora = resumo?.porHora ?? []
  const porDia = resumo?.porDia ?? []

  const duplicidadeHoraOperador = useMemo(() => {
    const totais = new Map<string, number>()

    for (const registro of porHora) {
      const chave = `${registro.hora}:${registro.operadorId}`
      totais.set(chave, (totais.get(chave) ?? 0) + 1)
    }

    return totais
  }, [porHora])

  const destaqueResumo = useMemo(() => {
    const melhorEficienciaDia = porDia.reduce((maior, registro) => {
      return registro.eficienciaPct > maior ? registro.eficienciaPct : maior
    }, 0)

    const mediaEficienciaDia =
      porDia.length > 0
        ? porDia.reduce((soma, registro) => soma + registro.eficienciaPct, 0) / porDia.length
        : 0

    return {
      linhasHora: porHora.length,
      operadoresNoResumo: porDia.length,
      melhorEficienciaDia,
      mediaEficienciaDia,
    }
  }, [porDia, porHora.length])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Eficiência operacional</h2>
        <p className="text-sm text-slate-600">
          Leitura de produtividade do operador separada do progresso operacional da OP. A tabela
          horária mostra uma linha por operação efetivamente apontada naquela hora.
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div
          title="Buckets de `hora + operador + operação` disponíveis para leitura."
          aria-label="Linhas horárias: Buckets de hora, operador e operação disponíveis para leitura."
          className="rounded-2xl border border-blue-100 bg-blue-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Linhas horárias
            </p>
            <TableProperties size={18} className="text-blue-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.linhasHora)}
          </p>
        </div>

        <div
          title="Consolidado diário por operador no escopo do turno carregado."
          aria-label="Operadores no resumo: Consolidado diário por operador no escopo do turno carregado."
          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
              Operadores no resumo
            </p>
            <Gauge size={18} className="text-slate-700" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {formatarNumero(destaqueResumo.operadoresNoResumo)}
          </p>
        </div>

        <div
          title="Maior eficiência individual encontrada no resumo diário do turno."
          aria-label="Melhor eficiência dia: Maior eficiência individual encontrada no resumo diário do turno."
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
          aria-label="Média eficiência dia: Média simples das eficiências diárias exibidas no turno atual."
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

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eficiência por hora</h3>
            <p className="text-sm text-slate-600">
              Uma hora pode conter mais de uma linha para o mesmo operador quando houver troca de
              operação no período.
            </p>
          </div>

          {porHora.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              Ainda não há apontamentos suficientes no turno para montar a tabela horária de
              eficiência.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
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
                  {porHora.map((registro) => {
                    const temTrocaNaHora =
                      (duplicidadeHoraOperador.get(`${registro.hora}:${registro.operadorId}`) ?? 0) > 1

                    return (
                      <tr key={`${registro.hora}:${registro.operadorId}:${registro.operacaoId}`}>
                        <td className="px-4 py-3 align-top font-medium text-slate-900">
                          <div>{formatarHora(registro.hora)}</div>
                          {temTrocaNaHora ? (
                            <div className="mt-1 text-xs font-medium text-amber-700">
                              Mais de uma operação nesta hora
                            </div>
                          ) : null}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Eficiência do dia por operador</h3>
            <p className="text-sm text-slate-600">
              Consolidado diário do turno usando os minutos configurados na jornada do próprio turno.
            </p>
          </div>

          {porDia.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              O resumo diário será exibido assim que houver apontamentos válidos para o turno.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Operador</th>
                    <th className="px-4 py-3">Efic%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {porDia.map((registro) => (
                    <tr key={`${registro.data}:${registro.operadorId}`}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {formatarData(registro.data)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{registro.operadorNome}</div>
                        <div className="text-xs text-slate-500">{registro.operadorMatricula}</div>
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
          )}
        </div>
      </div>
    </section>
  )
}
