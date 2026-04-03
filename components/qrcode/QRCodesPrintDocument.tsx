'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import QRCode from 'react-qr-code'
import { ArrowLeft, Printer } from 'lucide-react'
import { gerarValorQROperacionalTurnoSetor } from '@/lib/utils/qrcode'
import {
  dividirItensPorPagina,
  obterLayoutImpressaoQRCodes,
  QRCODES_PRINT_LAYOUTS,
  resumirDemandasParaImpressao,
} from '@/lib/utils/qrcode-print'
import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'

interface QRCodesPrintDocumentProps {
  autoPrint?: boolean
  iniciadoEm: string
  layoutId?: string
  turnoId: string
  setores: TurnoSetorDashboardItem[]
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
}

export function QRCodesPrintDocument({
  autoPrint = false,
  iniciadoEm,
  layoutId,
  turnoId,
  setores,
}: QRCodesPrintDocumentProps) {
  const layoutSelecionado = obterLayoutImpressaoQRCodes(layoutId)
  const paginas = dividirItensPorPagina(setores, layoutSelecionado.id)
  const iniciadoEmFormatado = formatarDataHora(iniciadoEm)
  const retornoAdmin = `/admin/qrcodes?turnoId=${turnoId}`

  useEffect(() => {
    if (!autoPrint) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      window.print()
    }, 150)

    return () => window.clearTimeout(timeoutId)
  }, [autoPrint])

  return (
    <div className="min-h-screen bg-slate-100 print:min-h-0 print:bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 print:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Documento de impressão
              </p>
              <h1 className="text-2xl font-bold text-slate-900">QR Codes do Turno</h1>
              <p className="text-sm text-slate-600">
                Documento dedicado para impressão. A régua de layout abaixo altera a peça final,
                não a tela administrativa.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={retornoAdmin}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <ArrowLeft size={16} />
                Voltar ao relatório
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <Printer size={16} />
                Imprimir
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {QRCODES_PRINT_LAYOUTS.map((layout) => {
              const ativo = layout.id === layoutSelecionado.id
              const href = `/impressao/qrcodes?turnoId=${turnoId}&layout=${layout.id}`

              return (
                <Link
                  key={layout.id}
                  href={href}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                    ativo
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {layout.rotulo}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {paginas.map((pagina, indicePagina) => (
        <section
          key={`impressao-pagina-${indicePagina + 1}`}
          className="mx-auto mb-6 w-[210mm] bg-white px-[8mm] py-[8mm] shadow-sm print:mb-0 print:w-auto print:px-0 print:py-0 print:shadow-none"
          style={
            indicePagina < paginas.length - 1
              ? { breakAfter: 'page', pageBreakAfter: 'always' }
              : undefined
          }
        >
          <header className="mb-[5mm] flex items-start justify-between border-b border-slate-200 pb-[3mm]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Relatório operacional de QR Codes
              </p>
              <h2 className="text-[18px] font-semibold text-slate-900">
                Turno iniciado em {iniciadoEmFormatado}
              </h2>
            </div>
            <p className="text-[11px] text-slate-600">
              Página {indicePagina + 1} de {paginas.length}
            </p>
          </header>

          <div
            className="grid content-start gap-[4mm]"
            style={{
              gridTemplateColumns: `repeat(${layoutSelecionado.colunas}, minmax(0, 1fr))`,
            }}
          >
            {pagina.map((setor) => {
              const { demandasOcultas, demandasVisiveis } = resumirDemandasParaImpressao(
                setor.demandas,
                layoutSelecionado.maxDemandasImpressao
              )

              return (
                <article
                  key={setor.id}
                  className="break-inside-avoid rounded-[4mm] border border-slate-200 bg-white px-[4mm] py-[3.5mm]"
                >
                  <div className="space-y-[1mm] text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Setor {setor.setorCodigo}
                    </p>
                    <h3 className="text-[16px] font-semibold leading-tight text-slate-900">
                      {setor.setorNome}
                    </h3>
                    <p className="text-[10px] text-slate-500">Turno {turnoId.slice(0, 8)}</p>
                  </div>

                  <div className="mt-[3mm] flex justify-center">
                    <div className="rounded-[3mm] border border-slate-200 bg-white p-[2.5mm]">
                      <div
                        className="aspect-square"
                        style={{ width: `${layoutSelecionado.qrSizeMm}mm` }}
                      >
                        <QRCode
                          value={gerarValorQROperacionalTurnoSetor(setor.qrCodeToken)}
                          size={256}
                          style={{ height: '100%', width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-[3mm] space-y-[1mm] text-center">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500">
                      Demandas ativas
                    </p>
                    <div className="space-y-[0.5mm] text-[10px] leading-tight text-slate-700">
                      {demandasVisiveis.map((demanda) => (
                        <p key={demanda.id}>
                          {demanda.numeroOp} • {demanda.produtoReferencia}
                        </p>
                      ))}
                      {demandasOcultas > 0 ? (
                        <p className="font-medium text-slate-500">
                          +{demandasOcultas} demanda(s) adicional(is)
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
