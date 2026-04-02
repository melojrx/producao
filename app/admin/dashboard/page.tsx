import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { listarMaquinas } from '@/lib/queries/maquinas'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'

export default async function AdminDashboardPage() {
  const [produtosCatalogo, maquinas, planejamentoTurnoV2] = await Promise.all([
    listarProdutos(),
    listarMaquinas(),
    buscarTurnoAbertoOuUltimoEncerrado(),
  ])

  return (
    <main className="w-full space-y-6">
      <MonitorPlanejamentoTurnoV2
        initialPlanning={planejamentoTurnoV2}
        produtosCatalogo={produtosCatalogo}
        maquinas={maquinas}
      />
    </main>
  )
}
