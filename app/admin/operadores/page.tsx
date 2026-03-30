import { listarOperadores } from '@/lib/queries/operadores'
import { ListaOperadores } from '../../(admin)/operadores/ListaOperadores'

export default async function AdminOperadoresPage() {
  const operadores = await listarOperadores()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operadores</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie operadores, carga horária diária e QR Codes de crachá.
        </p>
      </div>

      <ListaOperadores operadoresIniciais={operadores} />
    </div>
  )
}
