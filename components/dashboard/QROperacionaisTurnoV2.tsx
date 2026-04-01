import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { mapearSetoresTurnoParaDashboard } from '@/lib/utils/turno-setores'
import { gerarValorQROperacionalTurnoSetor } from '@/lib/utils/qrcode'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

interface QROperacionaisTurnoV2Props {
  planejamento: PlanejamentoTurnoDashboardV2 | null
}

export function QROperacionaisTurnoV2({ planejamento }: QROperacionaisTurnoV2Props) {
  if (!planejamento) {
    return null
  }

  const setores = mapearSetoresTurnoParaDashboard(planejamento)

  if (setores.length === 0) {
    return null
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">QRs Operacionais do Turno</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Cada <strong>setor ativo do turno</strong> recebe um QR temporário próprio. Quando uma
          nova OP entra no turno, os setores já ativos são reaproveitados e só surgem novos QRs se
          o novo produto exigir um setor inédito.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {setores.map((setor) => (
          <article
            key={setor.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="mb-4 space-y-1">
              <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                QR do setor
              </div>
              <h3 className="text-base font-semibold text-slate-900">{setor.setorNome}</h3>
              <p className="text-sm text-slate-600">
                {setor.demandas.length} demanda(s) ativa(s) dentro deste setor no turno atual.
              </p>
            </div>

            <div className="flex justify-center">
              <QRCodeDisplay
                valor={gerarValorQROperacionalTurnoSetor(setor.qrCodeToken)}
                titulo={`SETOR-${setor.setorNome}`}
                tamanho={170}
              />
            </div>

            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">Quantidade planejada</dt>
                <dd className="font-semibold text-slate-900">{setor.quantidadePlanejada}</dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">Quantidade realizada</dt>
                <dd className="font-semibold text-slate-900">{setor.quantidadeRealizada}</dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">Status</dt>
                <dd className="font-semibold text-slate-900">{setor.status}</dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="font-medium text-slate-500">Token temporário</dt>
                <dd className="max-w-52 break-all text-right font-mono text-xs text-slate-700">
                  {setor.qrCodeToken}
                </dd>
              </div>
            </dl>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                OPs e produtos neste setor
              </p>

              <div className="mt-3 space-y-2">
                {setor.demandas.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma demanda derivada foi vinculada a este setor até o momento.
                  </p>
                ) : (
                  setor.demandas.map((demanda) => (
                    <div
                      key={demanda.id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{demanda.numeroOp}</p>
                          <p className="text-sm text-slate-600">
                            {demanda.produtoNome} ({demanda.produtoReferencia})
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                          {demanda.status}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span>Planejado {demanda.quantidadePlanejada}</span>
                        <span>Realizado {demanda.quantidadeRealizada}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
