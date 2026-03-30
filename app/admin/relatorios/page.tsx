import { ComparativoMetaGrupoChart } from '@/components/relatorios/ComparativoMetaGrupoChart'
import { FiltrosRelatorios } from '@/components/relatorios/FiltrosRelatorios'
import { ResumoRelatorios } from '@/components/relatorios/ResumoRelatorios'
import { TabelaRelatorios } from '@/components/relatorios/TabelaRelatorios'
import { listarOperadores } from '@/lib/queries/operadores'
import { buscarPaginaRelatoriosV2 } from '@/lib/queries/relatorios-v2'
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
  const turnoId = valorString(searchParams.turnoId)
  const turnoOpId = valorString(searchParams.turnoOpId)
  const setorId = valorString(searchParams.setorId)
  const operadorId = valorString(searchParams.operadorId)
  const pageParam = Number.parseInt(valorString(searchParams.page), 10)

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
  }
}

export default async function AdminRelatoriosPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const { filtros, page } = normalizarFiltros(resolvedSearchParams)

  const [operadores, paginaRelatorios] = await Promise.all([
    listarOperadores(),
    buscarPaginaRelatoriosV2({
      filtros,
      page,
      pageSize: PAGE_SIZE,
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
        itens={paginaRelatorios.itens}
        filtros={filtros}
        page={page}
        pageSize={PAGE_SIZE}
        total={paginaRelatorios.total}
      />

      <ComparativoMetaGrupoChart dados={paginaRelatorios.comparativo} />
    </main>
  )
}
