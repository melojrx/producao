import { ListaMaquinas } from '../../(admin)/maquinas/ListaMaquinas'
import { listarMaquinas, listarTiposMaquina } from '@/lib/queries/maquinas'
import { listarSetores } from '@/lib/queries/setores'

export default async function AdminMaquinasPage() {
  const [maquinas, tiposMaquina, setores] = await Promise.all([
    listarMaquinas(),
    listarTiposMaquina(),
    listarSetores(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Máquinas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre máquinas por setor, imprima etiquetas QR e altere o status com um clique.
        </p>
      </div>

      <ListaMaquinas maquinasIniciais={maquinas} tiposMaquina={tiposMaquina} setores={setores} />
    </div>
  )
}
