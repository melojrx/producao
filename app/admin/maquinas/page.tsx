import { ListaMaquinas } from '../../(admin)/maquinas/ListaMaquinas'
import { listarMaquinas } from '@/lib/queries/maquinas'

export default async function AdminMaquinasPage() {
  const maquinas = await listarMaquinas()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Máquinas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre máquinas como patrimônio, imprima etiquetas QR e altere o status operacional
          sem vincular o cadastro a tipo ou setor.
        </p>
      </div>

      <ListaMaquinas maquinasIniciais={maquinas} />
    </div>
  )
}
