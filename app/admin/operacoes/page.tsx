import { ListaOperacoes } from '../../(admin)/operacoes/ListaOperacoes'
import { listarMaquinas } from '@/lib/queries/maquinas'
import { listarOperacoesPaginadas } from '@/lib/queries/operacoes'
import { listarSetores } from '@/lib/queries/setores'
import type { OperacaoSortField, SortDirection } from '@/types'

const PAGE_SIZE = 20

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const OPERACAO_SORT_FIELDS: OperacaoSortField[] = [
  'codigo',
  'descricao',
  'maquina',
  'setor',
  'tempo_padrao_min',
  'meta_hora',
  'meta_dia',
  'ativa',
]

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

function normalizarPage(param: string): number {
  const page = Number.parseInt(param, 10)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function normalizarSortBy(param: string): OperacaoSortField {
  return OPERACAO_SORT_FIELDS.includes(param as OperacaoSortField)
    ? (param as OperacaoSortField)
    : 'codigo'
}

function normalizarSortDir(param: string): SortDirection {
  return param === 'desc' ? 'desc' : 'asc'
}

export default async function AdminOperacoesPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const busca = valorString(resolvedSearchParams.busca)
  const page = normalizarPage(valorString(resolvedSearchParams.page))
  const sortBy = normalizarSortBy(valorString(resolvedSearchParams.sortBy))
  const sortDir = normalizarSortDir(valorString(resolvedSearchParams.sortDir))

  const [paginaOperacoes, maquinas, setores] = await Promise.all([
    listarOperacoesPaginadas({
      busca,
      page,
      pageSize: PAGE_SIZE,
      sortBy,
      sortDir,
    }),
    listarMaquinas(),
    listarSetores(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre operações com setor obrigatório, T.P e vínculo estrutural para derivar os
          setores dos produtos.
        </p>
      </div>

      <ListaOperacoes
        buscaInicial={paginaOperacoes.busca}
        maquinas={maquinas}
        operacoes={paginaOperacoes.items}
        page={paginaOperacoes.page}
        pageSize={paginaOperacoes.pageSize}
        setores={setores}
        sortBy={paginaOperacoes.sortBy}
        sortDir={paginaOperacoes.sortDir}
        total={paginaOperacoes.total}
        totalPages={paginaOperacoes.totalPages}
      />
    </div>
  )
}
