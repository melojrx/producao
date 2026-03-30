import { QRCodeDisplay } from '@/components/qrcode/QRCodeDisplay'
import { gerarValorQROperacionalSetorOp } from '@/lib/utils/qrcode'
import type { PlanejamentoTurnoDashboardV2, TurnoOpV2, TurnoSetorOpV2 } from '@/types'

interface QROperacionaisTurnoV2Props {
  planejamento: PlanejamentoTurnoDashboardV2 | null
}

interface SecaoComContexto extends TurnoSetorOpV2 {
  numeroOp: string
  produtoNome: string
  produtoReferencia: string
}

function mapearSecoesComContexto(
  secoes: TurnoSetorOpV2[],
  ops: TurnoOpV2[]
): SecaoComContexto[] {
  const opPorId = new Map(ops.map((op) => [op.id, op]))

  return secoes
    .map((secao) => {
      const op = opPorId.get(secao.turnoOpId)
      if (!op) {
        return null
      }

      return {
        ...secao,
        numeroOp: op.numeroOp,
        produtoNome: op.produtoNome,
        produtoReferencia: op.produtoReferencia,
      }
    })
    .filter((secao): secao is SecaoComContexto => Boolean(secao))
    .sort((primeiraSecao, segundaSecao) => {
      const comparacaoNumeroOp = primeiraSecao.numeroOp.localeCompare(segundaSecao.numeroOp)

      if (comparacaoNumeroOp !== 0) {
        return comparacaoNumeroOp
      }

      return primeiraSecao.setorNome.localeCompare(segundaSecao.setorNome)
    })
}

export function QROperacionaisTurnoV2({ planejamento }: QROperacionaisTurnoV2Props) {
  if (!planejamento || planejamento.secoesSetorOp.length === 0) {
    return null
  }

  const secoes = mapearSecoesComContexto(planejamento.secoesSetorOp, planejamento.ops)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">QRs Operacionais do Turno</h2>
        <p className="max-w-3xl text-sm text-slate-600">
          Cada combinação <strong>setor + OP</strong> recebe um QR temporário próprio. Esse QR vale
          apenas no contexto do turno atual e muda quando um novo turno é aberto.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {secoes.map((secao) => (
          <article
            key={secao.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
          >
            <div className="mb-4 space-y-1">
              <div className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {secao.numeroOp}
              </div>
              <h3 className="text-base font-semibold text-slate-900">{secao.setorNome}</h3>
              <p className="text-sm text-slate-600">
                {secao.produtoNome} ({secao.produtoReferencia})
              </p>
            </div>

            <div className="flex justify-center">
              <QRCodeDisplay
                valor={gerarValorQROperacionalSetorOp(secao.qrCodeToken)}
                titulo={`${secao.numeroOp}-${secao.setorNome}`}
                tamanho={170}
              />
            </div>

            <dl className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">Quantidade planejada</dt>
                <dd className="font-semibold text-slate-900">{secao.quantidadePlanejada}</dd>
              </div>

              <div className="flex items-center justify-between gap-4">
                <dt className="font-medium text-slate-500">Status</dt>
                <dd className="font-semibold text-slate-900">{secao.status}</dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="font-medium text-slate-500">Token temporário</dt>
                <dd className="max-w-52 break-all text-right font-mono text-xs text-slate-700">
                  {secao.qrCodeToken}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  )
}
