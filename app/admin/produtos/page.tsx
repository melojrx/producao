import { ListaProdutos } from '../../(admin)/produtos/ListaProdutos'
import { listarOperacoes } from '@/lib/queries/operacoes'
import { listarProdutos } from '@/lib/queries/produtos'

export default async function AdminProdutosPage() {
  const [produtos, operacoes] = await Promise.all([
    listarProdutos(),
    listarOperacoes(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monte o roteiro do produto e acompanhe o T.P total usado para a meta do grupo.
        </p>
      </div>

      <ListaProdutos produtosIniciais={produtos} operacoes={operacoes} />
    </div>
  )
}
