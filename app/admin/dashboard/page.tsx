import { MonitorPlanejamentoTurnoV2 } from '@/components/dashboard/MonitorPlanejamentoTurnoV2'
import { listarMaquinas } from '@/lib/queries/maquinas'
import { listarProdutos } from '@/lib/queries/produtos'
import { buscarConfiguracaoTurnoComBlocosHoje } from '@/lib/queries/turno-blocos'
import { listarProdutosAtivosParaTurno } from '@/lib/queries/turno'
import { buscarTurnoAbertoOuUltimoEncerrado } from '@/lib/queries/turnos'

export default async function AdminDashboardPage() {
  const [configuracaoAtual, produtos, produtosCatalogo, maquinas, planejamentoTurnoV2] = await Promise.all([
    buscarConfiguracaoTurnoComBlocosHoje(),
    listarProdutosAtivosParaTurno(),
    listarProdutos(),
    listarMaquinas(),
    buscarTurnoAbertoOuUltimoEncerrado(),
  ])

  return (
    <main className="w-full space-y-6">
      <MonitorPlanejamentoTurnoV2
        configuracaoAtual={configuracaoAtual}
        initialPlanning={planejamentoTurnoV2}
        produtos={produtos}
        produtosCatalogo={produtosCatalogo}
        maquinas={maquinas}
      />
    </main>
  )
}
