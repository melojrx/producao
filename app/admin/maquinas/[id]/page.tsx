import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { MaquinaLifecycleActions } from '@/components/admin/actions/MaquinaLifecycleActions'
import { DetailField } from '@/components/admin/DetailField'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { buscarMaquinaPorId } from '@/lib/queries/maquinas'

interface MaquinaDetalhePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function MaquinaDetalhePage({
  params,
}: MaquinaDetalhePageProps) {
  const { id } = await params
  const maquina = await buscarMaquinaPorId(id)

  if (!maquina) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/maquinas"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Voltar para máquinas
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">{maquina.codigo}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dados cadastrais da máquina e QR Code da etiqueta.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Modelo" value={maquina.modelo ?? 'Não informado'} />
        <DetailField label="Marca" value={maquina.marca ?? 'Não informada'} />
        <DetailField label="Patrimônio" value={maquina.numero_patrimonio ?? 'Não informado'} />
        <DetailField label="Status" value={maquina.status ?? 'ativa'} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gray-900">QR Code da etiqueta</h2>
          <p className="mt-1 text-sm text-gray-500">
            Use este QR para impressão da etiqueta física da máquina.
          </p>
        </div>

        <div className="flex justify-center">
          <QRCodeDisplay
            valor={`maquina:${maquina.qr_code_token}`}
            titulo={maquina.codigo}
            tamanho={152}
          />
        </div>
      </div>

      <MaquinaLifecycleActions
        maquinaId={maquina.id}
        codigo={maquina.codigo}
        statusAtual={maquina.status}
      />
    </div>
  )
}
