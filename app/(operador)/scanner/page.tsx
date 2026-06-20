import { ScannerPageClient } from '@/components/scanner/ScannerPageClient'
import { obterPerfilRevisorQualidadeOpcional } from '@/lib/auth/obter-perfil-revisor-qualidade'
import { listarCatalogoDefeitosQualidade } from '@/lib/queries/qualidade'

export default async function ScannerPage() {
  const [perfilRevisor, defeitosCatalogo] = await Promise.all([
    obterPerfilRevisorQualidadeOpcional(),
    listarCatalogoDefeitosQualidade(),
  ])

  return (
    <ScannerPageClient
      podeRegistrarQualidade={perfilRevisor?.podeRevisarQualidade === true}
      revisorNome={perfilRevisor?.nome ?? null}
      defeitosCatalogo={defeitosCatalogo}
    />
  )
}
