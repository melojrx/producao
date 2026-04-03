import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { QRCodesPrintDocument } from '@/components/qrcode/QRCodesPrintDocument'
import { requireAdminUser } from '@/lib/auth/require-admin-user'
import { buscarRelatorioQRCodesTurno } from '@/lib/queries/qrcodes'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

export default async function ImpressaoQRCodesPage(props: {
  searchParams: SearchParams
}) {
  await requireAdminUser()

  const resolvedSearchParams = await props.searchParams
  const turnoId = valorString(resolvedSearchParams.turnoId)
  const layout = valorString(resolvedSearchParams.layout)
  const autoPrint = valorString(resolvedSearchParams.autoPrint) === '1'
  const relatorio = await buscarRelatorioQRCodesTurno(turnoId)

  if (!relatorio) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-4 py-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">Documento de impressão indisponível</h1>
          <p className="mt-2 text-sm">
            Nenhum turno aberto foi encontrado para gerar o documento de QR Codes.
          </p>
          <Link
            href="/admin/qrcodes"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-900 hover:text-amber-950"
          >
            <ArrowLeft size={16} />
            Voltar ao relatório de QRs
          </Link>
        </section>
      </main>
    )
  }

  return (
    <QRCodesPrintDocument
      autoPrint={autoPrint}
      turnoId={relatorio.planejamento.turno.id}
      iniciadoEm={relatorio.planejamento.turno.iniciadoEm}
      layoutId={layout}
      setores={relatorio.setores}
    />
  )
}
