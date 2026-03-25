import { ListaOperacoes } from '../../(admin)/operacoes/ListaOperacoes'
import { listarTiposMaquina } from '@/lib/queries/maquinas'
import { listarOperacoes } from '@/lib/queries/operacoes'

export default async function AdminOperacoesPage() {
  const [operacoes, tiposMaquina] = await Promise.all([
    listarOperacoes(),
    listarTiposMaquina(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Operações</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cadastre operações com T.P, meta/hora, meta/dia e QR Code para impressão.
        </p>
      </div>

      <ListaOperacoes operacoesIniciais={operacoes} tiposMaquina={tiposMaquina} />
    </div>
  )
}
