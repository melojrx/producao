import { ListaTiposDefeito } from '../../(admin)/tipos-defeito/ListaTiposDefeito'
import { listarTiposDefeitoQualidade } from '@/lib/queries/qualidade-defeitos'
import type { QualidadeTipoDefeitoStatusFiltro } from '@/types'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

function normalizarStatus(param: string): QualidadeTipoDefeitoStatusFiltro {
  if (param === 'ativos' || param === 'inativos') {
    return param
  }

  return 'todos'
}

export default async function AdminTiposDefeitoPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const busca = valorString(resolvedSearchParams.busca)
  const status = normalizarStatus(valorString(resolvedSearchParams.status))
  const tiposDefeito = await listarTiposDefeitoQualidade({ busca, status })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tipos de Defeito</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre o catálogo usado pela revisão de qualidade e pelos rankings de defeito.
        </p>
      </div>

      <ListaTiposDefeito
        buscaInicial={busca}
        statusInicial={status}
        tiposDefeito={tiposDefeito}
      />
    </div>
  )
}
