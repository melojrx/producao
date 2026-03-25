import { ComparativoMetaGrupoChart } from '@/components/relatorios/ComparativoMetaGrupoChart'
import { FiltrosRelatorios } from '@/components/relatorios/FiltrosRelatorios'
import { TabelaRelatorios } from '@/components/relatorios/TabelaRelatorios'
import { listarOperacoes } from '@/lib/queries/operacoes'
import { listarOperadores } from '@/lib/queries/operadores'
import { buscarComparativoMetaGrupo, buscarRegistrosRelatorio } from '@/lib/queries/relatorios'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type { RelatorioFiltros } from '@/types'

const PAGE_SIZE = 12

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

function adicionarDias(dataBase: string, dias: number): string {
  const data = new Date(`${dataBase}T12:00:00`)
  data.setDate(data.getDate() + dias)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Fortaleza',
  }).format(data)
}

function normalizarFiltros(searchParams: Record<string, string | string[] | undefined>): {
  filtros: RelatorioFiltros
  page: number
} {
  const hoje = obterDataHojeLocal()
  const dataInicio = valorString(searchParams.dataInicio) || adicionarDias(hoje, -6)
  const dataFim = valorString(searchParams.dataFim) || hoje
  const operadorId = valorString(searchParams.operadorId)
  const operacaoId = valorString(searchParams.operacaoId)
  const pageParam = Number.parseInt(valorString(searchParams.page), 10)

  return {
    filtros: {
      dataInicio: dataInicio <= dataFim ? dataInicio : dataFim,
      dataFim: dataFim >= dataInicio ? dataFim : dataInicio,
      operadorId,
      operacaoId,
    },
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
  }
}

export default async function AdminRelatoriosPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const { filtros, page } = normalizarFiltros(resolvedSearchParams)

  const [operadores, operacoes, registros, comparativo] = await Promise.all([
    listarOperadores(),
    listarOperacoes(),
    buscarRegistrosRelatorio({
      ...filtros,
      page,
      pageSize: PAGE_SIZE,
    }),
    buscarComparativoMetaGrupo(filtros),
  ])

  return (
    <main className="w-full space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Filtre registros por período, operador e operação, e compare Meta Grupo vs realizado por dia.
        </p>
      </section>

      <FiltrosRelatorios
        filtros={filtros}
        operadores={operadores}
        operacoes={operacoes}
      />

      <TabelaRelatorios
        itens={registros.itens}
        filtros={filtros}
        page={page}
        pageSize={PAGE_SIZE}
        total={registros.total}
      />

      <ComparativoMetaGrupoChart dados={comparativo} />
    </main>
  )
}
