import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { executarPaginaAdminDjango } from '@/lib/auth/tratar-erro-sessao-django'
import { buscarResumoMetaMensalDashboard } from '@/lib/queries/metas-mensais'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'

/** Fluxo operacional oficial: turno V2 via API Django. `configuracao_turno` é somente histórico. */

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

export default async function AdminDashboardPage(props: {
  searchParams: SearchParams
}) {
  return executarPaginaAdminDjango(async () => {
    const resolvedSearchParams = await props.searchParams
    const competenciaSelecionada =
      normalizarCompetenciaMensal(valorString(resolvedSearchParams.competencia)) ??
      obterCompetenciaMesAtual()

    const [produtosCatalogoResultado, planejamentoTurnoV2, resumoMetaMensal] = await Promise.all([
      listarProdutos(),
      buscarTurnoAbertoOuUltimoEncerrado(),
      buscarResumoMetaMensalDashboard(competenciaSelecionada),
    ])

    return (
      <main className="w-full space-y-6">
        <MonitorPlanejamentoTurnoV2
          initialPlanning={planejamentoTurnoV2}
          resumoMetaMensal={resumoMetaMensal}
          produtosCatalogo={produtosCatalogoResultado}
        />
      </main>
    )
  })
}
