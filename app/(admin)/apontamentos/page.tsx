import { executarPaginaAdminDjango } from '@/lib/auth/tratar-erro-sessao-django'
import {
  normalizarAbaApontamentos,
  renderPaginaApontamentosAdmin,
  resolverCompetenciaApontamentos,
} from '@/lib/pages/apontamentos-admin-page'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

export default async function AdminApontamentosPage(props: {
  searchParams: SearchParams
}) {
  return executarPaginaAdminDjango(async () => {
    const resolvedSearchParams = await props.searchParams

    return renderPaginaApontamentosAdmin({
      abaInicial: normalizarAbaApontamentos(valorString(resolvedSearchParams.aba)),
      competenciaSelecionada: resolverCompetenciaApontamentos(
        valorString(resolvedSearchParams.competencia)
      ),
      turnoOpIdSelecionado: valorString(resolvedSearchParams.turnoOpId),
    })
  })
}
