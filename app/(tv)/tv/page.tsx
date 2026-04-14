import { PainelTvCliente } from '@/components/tv/PainelTvCliente'
import { buscarResumoMetaMensalDashboard } from '@/lib/queries/metas-mensais'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'
import { obterCompetenciaMesAtual } from '@/lib/utils/data'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

export const metadata = {
  title: 'Painel TV — Produção em Tempo Real',
}

export default async function PainelTvPage() {
  const [planejamento, resumoMetaMensal] = await Promise.all([
    buscarTurnoAbertoOuUltimoEncerrado().catch(() => null as PlanejamentoTurnoDashboardV2 | null),
    buscarResumoMetaMensalDashboard(obterCompetenciaMesAtual()),
  ])

  return (
    <PainelTvCliente
      initialPlanning={planejamento}
      resumoMetaMensal={resumoMetaMensal}
    />
  )
}
