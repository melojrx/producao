import { ListaProdutos } from '../../(admin)/produtos/ListaProdutos'
import { listarOperacoes } from '@/lib/queries/operacoes'
import { listarProdutos } from '@/lib/queries/produtos'
import { listarSetores } from '@/lib/queries/setores'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string | undefined {
  return typeof param === 'string' && param ? param : undefined
}

export default async function AdminProdutosPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const produtoDuplicarIdInicial = valorString(resolvedSearchParams.duplicar)
  const [produtos, operacoes, setores] = await Promise.all([
    listarProdutos(),
    listarOperacoes(),
    listarSetores(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monte o roteiro do produto, visualize os setores envolvidos e acompanhe o T.P total usado para a meta do grupo.
        </p>
      </div>

      <ListaProdutos
        produtosIniciais={produtos}
        operacoes={operacoes}
        produtoDuplicarIdInicial={produtoDuplicarIdInicial}
        setores={setores}
      />
    </div>
  )
}
