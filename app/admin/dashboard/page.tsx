import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'

export default async function AdminDashboardPage() {
  const [produtosCatalogo, planejamentoTurnoV2] = await Promise.all([
    listarProdutos(),
    buscarTurnoAbertoOuUltimoEncerrado(),
  ])

  return (
    <main className="w-full space-y-6">
      <MonitorPlanejamentoTurnoV2
        initialPlanning={planejamentoTurnoV2}
        produtosCatalogo={produtosCatalogo}
      />
    </main>
  )
}
