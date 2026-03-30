import { ListaSetores } from '../../(admin)/setores/ListaSetores'
import { listarSetores } from '@/lib/queries/setores'

export default async function AdminSetoresPage() {
  try {
    const setores = await listarSetores()

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setores</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os setores produtivos que serão usados pela V2 de turno, OP e scanner.
          </p>
        </div>

        <ListaSetores setoresIniciais={setores} />
      </div>
    )
  } catch (error) {
    const mensagem =
      error instanceof Error ? error.message : 'Não foi possível carregar os setores.'

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setores</h1>
          <p className="mt-1 text-sm text-gray-500">
            O cadastro está implementado no app, mas a migração SQL ainda precisa ser aplicada no
            banco.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {mensagem}
        </div>
      </div>
    )
  }
}
