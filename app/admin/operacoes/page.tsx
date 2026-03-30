import { ListaOperacoes } from '../../(admin)/operacoes/ListaOperacoes'
import { listarTiposMaquina } from '@/lib/queries/maquinas'
import { listarOperacoes } from '@/lib/queries/operacoes'
import { listarSetores } from '@/lib/queries/setores'

export default async function AdminOperacoesPage() {
  const [operacoes, tiposMaquina, setores] = await Promise.all([
    listarOperacoes(),
    listarTiposMaquina(),
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

      <ListaOperacoes operacoesIniciais={operacoes} tiposMaquina={tiposMaquina} setores={setores} />
    </div>
  )
}
