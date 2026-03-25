import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { OperadorLifecycleActions } from '@/components/admin/actions/OperadorLifecycleActions'
import { DetailField } from '@/components/admin/DetailField'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { buscarOperadorPorId } from '@/lib/queries/operadores'

interface OperadorDetalhePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OperadorDetalhePage({
  params,
}: OperadorDetalhePageProps) {
  const { id } = await params
  const operador = await buscarOperadorPorId(id)

  if (!operador) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/operadores"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Voltar para operadores
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{operador.nome}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dados cadastrais do operador e QR Code do crachá.
          </p>
        </div>

        <Link
          href="/admin/operadores"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil size={16} />
          Editar na listagem
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Matrícula" value={operador.matricula} />
        <DetailField label="Setor" value={operador.setor ?? 'Não informado'} />
        <DetailField label="Função" value={operador.funcao ?? 'Não informada'} />
        <DetailField label="Status" value={operador.status ?? 'ativo'} />
        <DetailField label="Criado em" value={new Date(operador.created_at ?? '').toLocaleString('pt-BR')} />
        <DetailField label="Atualizado em" value={new Date(operador.updated_at ?? '').toLocaleString('pt-BR')} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">QR Code do crachá</h2>
          <p className="mt-1 text-sm text-gray-500">
            Use este QR para impressão e identificação do operador no scanner.
          </p>
        </div>

        <QRCodeDisplay valor={`operador:${operador.qr_code_token}`} titulo={operador.nome} tamanho={220} />
      </div>

      <OperadorLifecycleActions
        operadorId={operador.id}
        nome={operador.nome}
        statusAtual={operador.status}
      />
    </div>
  )
}
