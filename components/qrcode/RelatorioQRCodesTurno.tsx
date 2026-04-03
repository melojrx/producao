'use client'

import Link from 'next/link'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { ArrowLeft, ExternalLink, Printer } from 'lucide-react'
import { gerarValorQROperacionalTurnoSetor } from '@/lib/utils/qrcode'
import {
  dividirItensPorPagina,
  obterLayoutImpressaoQRCodes,
  QRCODES_PRINT_LAYOUTS,
  resumirDemandasParaImpressao,
} from '@/lib/utils/qrcode-print'
import type { TurnoSetorDashboardItem } from '@/lib/utils/turno-setores'
import type { TurnoStatusV2 } from '@/types'

interface RelatorioQRCodesTurnoProps {
  turnoId: string
  iniciadoEm: string
  statusTurno: TurnoStatusV2
  setores: TurnoSetorDashboardItem[]
}

function formatarDataHora(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Fortaleza',
  }).format(new Date(valor))
}

export function RelatorioQRCodesTurno({
  turnoId,
  iniciadoEm,
  statusTurno,
  setores,
}: RelatorioQRCodesTurnoProps) {
  const [layoutSelecionadoId, setLayoutSelecionadoId] = useState(4)
  const layoutSelecionado = obterLayoutImpressaoQRCodes(layoutSelecionadoId)
  const paginas = dividirItensPorPagina(setores, layoutSelecionado.id)
  const iniciadoEmFormatado = formatarDataHora(iniciadoEm)
  const hrefImpressao = `/impressao/qrcodes?turnoId=${turnoId}&layout=${layoutSelecionado.id}&autoPrint=1`

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">QR Codes do Turno</h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Esta tela serve para selecionar o preset e abrir o documento de impressão limpo,
              separado da interface administrativa.
            </p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                Turno {turnoId.slice(0, 8)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                Iniciado em {iniciadoEmFormatado}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                Status {statusTurno}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
                {setores.length} QR(s)
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row xl:items-center">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Voltar à dashboard
            </Link>
            <Link
              href={hrefImpressao}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Printer size={16} />
              Abrir documento de impressão
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {QRCODES_PRINT_LAYOUTS.map((layout) => {
            const ativo = layout.id === layoutSelecionado.id

            return (
              <button
                key={layout.id}
                type="button"
                onClick={() => setLayoutSelecionadoId(layout.id)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  ativo
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {layout.rotulo}
              </button>
            )
          })}
        </div>

        <p className="mt-4 text-sm text-slate-500">
          O documento de impressão abre em nova aba, sem menu lateral nem cabeçalho do admin,
          seguindo um layout específico para papel.
        </p>
      </div>

      {paginas.map((pagina, indicePagina) => (
        <section
          key={`preview-pagina-${indicePagina + 1}`}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-end justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pré-visualização
              </p>
              <h2 className="text-lg font-semibold text-slate-900">
                Página {indicePagina + 1} de {paginas.length}
              </h2>
            </div>
            <Link
              href={hrefImpressao}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              <ExternalLink size={16} />
              Abrir versão final
            </Link>
          </div>

          <div
            className="grid gap-4"
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="space-y-1 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Setor {setor.setorCodigo}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">{setor.setorNome}</h3>
                    <p className="text-xs text-slate-500">Turno {turnoId.slice(0, 8)}</p>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <QRCode
                        value={gerarValorQROperacionalTurnoSetor(setor.qrCodeToken)}
                        size={144}
                      />
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-center">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Demandas ativas
                    </p>
                    <div className="space-y-1 text-sm text-slate-700">
                      {demandasVisiveis.map((demanda) => (
                        <p key={demanda.id}>
                          {demanda.numeroOp} • {demanda.produtoReferencia}
                        </p>
                      ))}
                      {demandasOcultas > 0 ? (
                        <p className="text-xs font-medium text-slate-500">
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
    </section>
  )
}
