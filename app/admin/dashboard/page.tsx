import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { buscarResumoMetaMensalDashboard } from '@/lib/queries/metas-mensais'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

export default async function AdminDashboardPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const competenciaSelecionada =
    normalizarCompetenciaMensal(valorString(resolvedSearchParams.competencia)) ??
    obterCompetenciaMesAtual()

  const [produtosCatalogo, planejamentoTurnoV2, resumoMetaMensal] = await Promise.all([
    listarProdutos(),
    buscarTurnoAbertoOuUltimoEncerrado(),
    buscarResumoMetaMensalDashboard(competenciaSelecionada),
  ])

  return (
    <main className="w-full space-y-6">
      <MonitorPlanejamentoTurnoV2
        initialPlanning={planejamentoTurnoV2}
        resumoMetaMensal={resumoMetaMensal}
        produtosCatalogo={produtosCatalogo}
      />
    </main>
  )
}
