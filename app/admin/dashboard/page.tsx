import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { DjangoTokenAusenteError } from '@/lib/django/queries/obter-token-servidor'
import { buscarResumoMetaMensalDashboard } from '@/lib/queries/metas-mensais'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import { normalizarCompetenciaMensal, obterCompetenciaMesAtual } from '@/lib/utils/data'
import { redirect } from 'next/navigation'
import type { ProdutoListItem } from '@/types'

/** Fluxo operacional oficial: turno V2 via API Django. `configuracao_turno` é somente histórico. */

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

  const [produtosCatalogoResultado, planejamentoTurnoV2, resumoMetaMensal] = await Promise.all([
    listarProdutos().catch(() => [] as ProdutoListItem[]),
    buscarTurnoAbertoOuUltimoEncerrado().catch((error: unknown) => {
      if (error instanceof DjangoTokenAusenteError) {
        redirect('/login?erro=sessao-expirada')
      }
      throw error
    }),
    buscarResumoMetaMensalDashboard(competenciaSelecionada).catch((error: unknown) => {
      if (error instanceof DjangoTokenAusenteError) {
        redirect('/login?erro=sessao-expirada')
      }
      throw error
    }),
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
}
