import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Pencil } from 'lucide-react'
import { OperacaoLifecycleActions } from '@/components/admin/actions/OperacaoLifecycleActions'
import { DetailField } from '@/components/admin/DetailField'
import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { buscarOperacaoPorId } from '@/lib/queries/operacoes'

interface OperacaoDetalhePageProps {
  params: Promise<{
    id: string
  }>
}

export default async function OperacaoDetalhePage({
  params,
}: OperacaoDetalhePageProps) {
  const { id } = await params
  const operacao = await buscarOperacaoPorId(id)

  if (!operacao) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link
            href="/admin/operacoes"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft size={16} />
            Voltar para operações
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{operacao.codigo}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Dados cadastrais da operação e QR Code do cartão de produção.
          </p>
        </div>

        <Link
          href="/admin/operacoes"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Pencil size={16} />
          Editar na listagem
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailField label="Descrição" value={operacao.descricao} />
        <DetailField
          label="Máquina"
          value={
            operacao.maquinaModelo
              ? `${operacao.maquinaModelo}${operacao.maquinaCodigo ? ` • ${operacao.maquinaCodigo}` : ''}`
              : 'Não informada'
          }
        />
        <DetailField label="Setor" value={operacao.setorNome ?? 'Não definido'} />
        <DetailField label="T.P Operação" value={String(operacao.tempo_padrao_min)} />
        <DetailField label="Meta / hora" value={String(operacao.meta_hora ?? 0)} />
        <DetailField label="Meta / dia" value={String(operacao.meta_dia ?? 0)} />
        <DetailField label="Status" value={operacao.ativa ?? true ? 'ativa' : 'inativa'} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">QR Code do cartão</h2>
          <p className="mt-1 text-sm text-gray-500">
            Use este QR para impressão do cartão da operação.
          </p>
        </div>

        <QRCodeDisplay valor={`operacao:${operacao.qr_code_token}`} titulo={operacao.codigo} tamanho={220} />
      </div>

      <OperacaoLifecycleActions
        operacaoId={operacao.id}
        codigo={operacao.codigo}
        ativa={operacao.ativa ?? true}
      />
    </div>
  )
}
