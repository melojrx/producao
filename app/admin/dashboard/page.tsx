import { PainelConfiguracaoTurno } from '@/components/dashboard/PainelConfiguracaoTurno'
import { buscarConfiguracaoHoje, listarProdutosAtivosParaTurno } from '@/lib/queries/turno'

export default async function AdminDashboardPage() {
  const [configuracaoAtual, produtos] = await Promise.all([
    buscarConfiguracaoHoje(),
    listarProdutosAtivosParaTurno(),
  ])

  return (
    <div className="space-y-6">
      <PainelConfiguracaoTurno
        configuracaoAtual={configuracaoAtual}
        produtos={produtos}
      />
    </div>
  )
}
