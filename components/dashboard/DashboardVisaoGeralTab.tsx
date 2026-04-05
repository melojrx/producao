'use client'

import { Boxes, CalendarRange, ClipboardList, PackageCheck, Target, TrendingUp } from 'lucide-react'
import { CardKPI } from '@/components/dashboard/CardKPI'
import { DashboardCompetenciaMensalNav } from '@/components/dashboard/DashboardCompetenciaMensalNav'
import { GraficoMetaMensalVisaoGeral } from '@/components/dashboard/GraficoMetaMensalVisaoGeral'
import type { MetaMensalResumoDashboard } from '@/types'

interface DashboardVisaoGeralTabProps {
  resumoMetaMensal: MetaMensalResumoDashboard
}

export function DashboardVisaoGeralTab({
  resumoMetaMensal,
}: DashboardVisaoGeralTabProps) {
  const competenciaLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Fortaleza',
  }).format(new Date(`${resumoMetaMensal.competencia}T12:00:00-03:00`))

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <CalendarRange size={14} />
              Visão Geral mensal
            </div>
            <h2 className="text-lg font-semibold capitalize text-slate-900">
              Meta mensal da fábrica • {competenciaLabel}
            </h2>
            <p className="text-sm text-slate-600">
              Leitura gerencial da competência selecionada, independente da existência de turno
              ativo.
            </p>
          </div>

          <div className="space-y-3">
            <DashboardCompetenciaMensalNav competencia={resumoMetaMensal.competencia} />

            {resumoMetaMensal.metaMensal ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">
                  {resumoMetaMensal.diasProdutivos} dia(s) produtivo(s) planejado(s)
                </p>
                <p className="mt-1">
                  Competência {resumoMetaMensal.competencia} com meta oficial cadastrada.
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {!resumoMetaMensal.metaMensal ? (
          <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Ainda não existe meta mensal cadastrada para a competência {resumoMetaMensal.competencia}.
            Cadastre a meta na página de apontamentos para liberar a leitura gerencial completa.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <CardKPI
              titulo="Meta Mensal"
              valor={resumoMetaMensal.metaPecas}
              descricao="Quantidade total de peças que a fábrica precisa alcançar nesta competência."
              icone={Target}
              destaque="blue"
            />
            <CardKPI
              titulo="Alcançado"
              valor={resumoMetaMensal.alcancadoMes}
              descricao="Soma da quantidade concluída consolidada por OP/dia dentro da competência."
              icone={PackageCheck}
              destaque="emerald"
            />
            <CardKPI
              titulo="Saldo"
              valor={resumoMetaMensal.saldoMes}
              descricao="Peças que ainda faltam para atingir a meta mensal cadastrada."
              icone={ClipboardList}
              destaque="amber"
            />
            <CardKPI
              titulo="Atingimento"
              valor={resumoMetaMensal.atingimentoPct}
              descricao="Percentual acumulado de atingimento da meta mensal até o momento."
              icone={TrendingUp}
              sufixo="%"
              decimals={2}
              destaque="slate"
            />
            <CardKPI
              titulo="Meta diária média"
              valor={resumoMetaMensal.metaDiariaMedia}
              descricao="Referência média diária calculada a partir da meta mensal e dos dias produtivos."
              icone={Boxes}
              decimals={2}
              destaque="slate"
            />
          </div>
        )}
      </section>

      <GraficoMetaMensalVisaoGeral resumoMetaMensal={resumoMetaMensal} />
    </>
  )
}
