import { ListaOperacoes } from '../../(admin)/operacoes/ListaOperacoes'
import { listarMaquinas } from '@/lib/queries/maquinas'
import { listarOperacoes } from '@/lib/queries/operacoes'
import { listarSetores } from '@/lib/queries/setores'

export default async function AdminOperacoesPage() {
  const [operacoes, maquinas, setores] = await Promise.all([
    listarOperacoes(),
    listarMaquinas(),
    listarSetores(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre operações com setor obrigatório, T.P e vínculo estrutural para derivar os setores dos produtos.
        </p>
      </div>

      <ListaOperacoes operacoesIniciais={operacoes} maquinas={maquinas} setores={setores} />
    </div>
  )
}
