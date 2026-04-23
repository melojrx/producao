import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, ImageOff, Pencil } from 'lucide-react'
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

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,_rgba(248,250,252,0.98),_rgba(241,245,249,0.88))] shadow-[0_30px_90px_-55px_rgba(15,23,42,0.45)]">
        <div className="grid gap-0 xl:grid-cols-[1.15fr,0.95fr]">
          <div className="border-b border-slate-200/80 p-4 sm:p-5 xl:border-r xl:border-b-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Referência visual
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Imagem da operação
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Apoio visual administrativo para conferência rápida da operação cadastrada.
                </p>
              </div>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  operacao.imagem_url
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {operacao.imagem_url ? 'Imagem disponível' : 'Sem imagem'}
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_38%),linear-gradient(160deg,_rgba(255,255,255,1),_rgba(226,232,240,0.82))] px-4 py-5 sm:px-6 sm:py-6">
              <div className="relative mx-auto flex h-[320px] w-full max-w-3xl items-center justify-center rounded-[24px] border border-slate-200 bg-white shadow-sm sm:h-[380px]">
                {operacao.imagem_url ? (
                  <Image
                    src={operacao.imagem_url}
                    alt={`Imagem da operação ${operacao.codigo}`}
                    fill
                    sizes="(max-width: 1280px) 100vw, 720px"
                    className="object-contain p-4 sm:p-6"
                    priority
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-[22px] border border-dashed border-slate-300 bg-white/75 px-6 text-center">
                    <div className="rounded-full bg-slate-900 p-3 text-white">
                      <ImageOff size={22} />
                    </div>
                    <p className="mt-4 text-base font-semibold text-slate-900">
                      Nenhuma imagem cadastrada
                    </p>
                    <p className="mt-1 max-w-md text-sm text-slate-500">
                      Esta operação segue válida sem imagem, mas o detalhe mostra o estado vazio de forma explícita.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="rounded-[24px] border border-slate-200 bg-white/85 p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Resumo técnico
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
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
            </div>
          </div>
        </div>
      </section>

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
