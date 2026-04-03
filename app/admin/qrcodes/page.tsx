import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { RelatorioQRCodesTurno } from '@/components/qrcode/RelatorioQRCodesTurno'
import { buscarRelatorioQRCodesTurno } from '@/lib/queries/qrcodes'

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function valorString(param: string | string[] | undefined): string {
  return typeof param === 'string' ? param : ''
}

export default async function AdminQRCodesPage(props: {
  searchParams: SearchParams
}) {
  const resolvedSearchParams = await props.searchParams
  const turnoId = valorString(resolvedSearchParams.turnoId)
  const relatorio = await buscarRelatorioQRCodesTurno(turnoId)

  if (!relatorio) {
    return (
      <main className="w-full space-y-6">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-2xl font-bold">QR Codes do Turno</h1>
          <p className="mt-2 text-sm">
            Nenhum turno aberto foi encontrado para impressão de QRs neste momento.
          </p>
          <Link
            href="/admin/dashboard"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-900 hover:text-amber-950"
          >
            <ArrowLeft size={16} />
            Voltar à dashboard
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="w-full">
      <RelatorioQRCodesTurno
        turnoId={relatorio.planejamento.turno.id}
        iniciadoEm={relatorio.planejamento.turno.iniciadoEm}
        statusTurno={relatorio.planejamento.turno.status}
        setores={relatorio.setores}
      />
    </main>
  )
}
