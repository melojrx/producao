import { ComparativoMetaGrupoChart } from '@/components/relatorios/ComparativoMetaGrupoChart'
import { FiltrosRelatorios } from '@/components/relatorios/FiltrosRelatorios'
import { ResumoRelatorios } from '@/components/relatorios/ResumoRelatorios'
import { TabelaRelatorios } from '@/components/relatorios/TabelaRelatorios'
import { listarOperadores } from '@/lib/queries/operadores'
import { buscarPaginaRelatoriosV2 } from '@/lib/queries/relatorios-v2'
import { obterDataHojeLocal } from '@/lib/utils/data'
import type { RelatorioFiltros, RelatorioSortField, SortDirection } from '@/types'

const PAGE_SIZE = 12
const RELATORIO_SORT_FIELDS: RelatorioSortField[] = [
  'origem',
  'numeroOp',
  'setorNome',
  'operadorNome',
  'operacaoCodigo',
  'quantidadeApontada',
  'quantidadeRealizadaOperacao',
  'quantidadeRealizadaSecao',
  'quantidadeRealizadaOp',
  'statusOp',
  'ultimaLeituraEm',
]

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
  sortBy: RelatorioSortField
  sortDir: SortDirection
} {
  const hoje = obterDataHojeLocal()
  const dataInicio = valorString(searchParams.dataInicio) || adicionarDias(hoje, -6)
  const dataFim = valorString(searchParams.dataFim) || hoje
  const turnoId = valorString(searchParams.turnoId)
  const turnoOpId = valorString(searchParams.turnoOpId)
  const setorId = valorString(searchParams.setorId)
  const operadorId = valorString(searchParams.operadorId)
  const pageParam = Number.parseInt(valorString(searchParams.page), 10)
  const sortByParam = valorString(searchParams.sortBy)
  const sortDirParam = valorString(searchParams.sortDir)

  return {
    filtros: {
      dataInicio: dataInicio <= dataFim ? dataInicio : dataFim,
      dataFim: dataFim >= dataInicio ? dataFim : dataInicio,
      turnoId,
      turnoOpId,
      setorId,
      operadorId,
    },
    page: Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1,
    sortBy: RELATORIO_SORT_FIELDS.includes(sortByParam as RelatorioSortField)
      ? (sortByParam as RelatorioSortField)
      : 'ultimaLeituraEm',
    sortDir: sortDirParam === 'asc' ? 'asc' : 'desc',
  }
}

export default async function AdminRelatoriosPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const { filtros, page, sortBy, sortDir } = normalizarFiltros(resolvedSearchParams)

  const [operadores, paginaRelatorios] = await Promise.all([
    listarOperadores(),
    buscarPaginaRelatoriosV2({
      filtros,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    }),
  ])

  return (
    <main className="w-full space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="mt-1 text-sm text-slate-600">
          Consolidação V2 por turno, OP, setor, operação e operador, sem supercontar a produção ao
          subir de operação para seção e de seção para OP, preservando a leitura do histórico legado
          durante a transição.
        </p>
      </section>

      <FiltrosRelatorios
        filtros={filtros}
        ops={paginaRelatorios.ops}
        operadores={operadores}
        setores={paginaRelatorios.setores}
        turnos={paginaRelatorios.turnos}
      />

      <ResumoRelatorios resumo={paginaRelatorios.resumo} />

      <TabelaRelatorios
        itens={paginaRelatorios.items}
        filtros={filtros}
        page={paginaRelatorios.page}
        pageSize={paginaRelatorios.pageSize}
        sortBy={paginaRelatorios.sortBy}
        sortDir={paginaRelatorios.sortDir}
        total={paginaRelatorios.total}
      />

      <ComparativoMetaGrupoChart dados={paginaRelatorios.comparativo} />
    </main>
  )
}
