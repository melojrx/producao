import Link from 'next/link'
import { CalendarRange, SquarePen } from 'lucide-react'
import { DashboardCompetenciaMensalNav } from '@/components/dashboard/DashboardCompetenciaMensalNav'
import { PainelMetaMensalFormulario } from '@/components/dashboard/PainelMetaMensalFormulario'
import type { MetaMensal } from '@/types'

interface PainelMetaMensalApontamentosProps {
  competencia: string
  metaMensal: MetaMensal | null
}

function formatarCompetenciaLabel(competencia: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Fortaleza',
  }).format(new Date(`${competencia}T12:00:00-03:00`))
}

export function PainelMetaMensalApontamentos({
  competencia,
  metaMensal,
}: PainelMetaMensalApontamentosProps) {
  return (
    <section className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <CalendarRange size={14} />
              Gestão mensal em apontamentos
            </div>
            <h2 className="text-lg font-semibold capitalize text-slate-900">
              Meta mensal da fábrica • {formatarCompetenciaLabel(competencia)}
            </h2>
            <p className="max-w-2xl text-sm text-slate-600">
              O cadastro e a edição da meta mensal ficam nesta página para manter a gestão
              administrativa junto da superfície de registros.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 xl:items-end">
            <DashboardCompetenciaMensalNav competencia={competencia} />
            <Link
              href={`/admin/dashboard?competencia=${competencia}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white"
            >
              <SquarePen size={16} />
              Ver leitura gerencial
            </Link>
          </div>
        </div>

        {metaMensal ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Competência {competencia} com meta mensal cadastrada e pronta para ajuste
            administrativo.
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Ainda não existe meta mensal cadastrada para a competência {competencia}. O lançamento
            pode ser feito aqui mesmo, sem depender de turno aberto.
          </div>
        )}
      </section>

      <PainelMetaMensalFormulario
        competencia={competencia}
        metaMensal={metaMensal}
        descricao="O lançamento atua sobre a competência selecionada nesta página de apontamentos."
      />
    </section>
  )
}
