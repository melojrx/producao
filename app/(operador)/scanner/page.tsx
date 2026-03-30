'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Factory,
  IdCard,
  ShieldAlert,
} from 'lucide-react'
import { ConfirmacaoRegistro } from '@/components/scanner/ConfirmacaoRegistro'
import { QRScanner } from '@/components/scanner/QRScanner'
import { useScanner } from '@/hooks'
import { registrarProducao } from '@/lib/actions/producao'
import { isScannerV2Enabled } from '@/lib/utils/feature-flags'
import { descreverTipoQRCode } from '@/lib/utils/qrcode'
import type { QRScanResult, QRTipo } from '@/types'

const ETAPAS_CONFIG = {
  scan_operador: {
    tipoEsperado: 'operador' as QRTipo,
    titulo: 'Escaneie seu crachá',
    descricao: 'Aponte a câmera para o QR Code do operador para iniciar a sessão.',
  },
  scan_setor_op: {
    tipoEsperado: 'setor-op' as QRTipo,
    titulo: 'Escaneie o QR operacional',
    descricao:
      'Depois de identificar o operador, leia o QR temporário do setor e da OP para abrir a seção do turno.',
  },
  confirmar: {
    tipoEsperado: 'setor-op' as QRTipo,
    titulo: 'Confirmar quantidade',
    descricao:
      'Revise o contexto da seção do turno, informe a quantidade executada e siga para o lançamento.',
  },
} as const

function formatarTurnoResumido(iniciadoEm: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iniciadoEm))
}

export default function ScannerPage() {
  const scannerV2Habilitado = isScannerV2Enabled()
  const [mensagemTela, setMensagemTela] = useState<string | null>(null)
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso'>('erro')
  const {
    estado,
    erro,
    estaCarregando,
    scanOperador,
    scanSetorOp,
    registrar,
    resetarOperacao,
    resetarTudo,
  } = useScanner({ onRegistrar: registrarProducao })

  const etapaAtual = ETAPAS_CONFIG[estado.etapa]

  const mensagemAtiva = useMemo(() => {
    if (erro) {
      return { texto: erro, tipo: 'erro' as const }
    }

    if (mensagemTela) {
      return { texto: mensagemTela, tipo: tipoMensagem }
    }

    return null
  }, [erro, mensagemTela, tipoMensagem])

  async function handleScan(resultado: QRScanResult) {
    setMensagemTela(null)

    if (resultado.tipo !== etapaAtual.tipoEsperado) {
      const tipoLido = descreverTipoQRCode(resultado.tipo)
      const tipoEsperado = descreverTipoQRCode(etapaAtual.tipoEsperado)

      setTipoMensagem('erro')
      setMensagemTela(
        `QR incorreto. O scanner reconheceu ${tipoLido}, mas nesta etapa é esperado ${tipoEsperado}.`
      )
      return
    }

    const resposta =
      estado.etapa === 'scan_operador'
        ? await scanOperador(resultado.token)
        : await scanSetorOp(resultado.token)

    if (!resposta.sucesso && resposta.erro) {
      setTipoMensagem('erro')
      setMensagemTela(resposta.erro)
    }
  }

  const secaoAtual = estado.etapa === 'confirmar' ? estado.secao : null

  if (!scannerV2Habilitado) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_100%)] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center gap-5">
          <section className="rounded-[28px] border border-amber-400/20 bg-slate-950/70 p-6 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
            <div className="flex items-center gap-3 text-amber-300">
              <ShieldAlert size={22} />
              <p className="text-xs font-semibold uppercase tracking-[0.28em]">
                Cutover controlado
              </p>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-white">Scanner V2 indisponível</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Este ambiente está com o fluxo operacional V2 bloqueado por feature flag. Para
              liberar o scanner, configure <code>NEXT_PUBLIC_SCANNER_V2_ENABLED=true</code> e
              publique novamente a aplicação.
            </p>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
              <p className="font-medium text-white">Fallback operacional durante o cutover</p>
              <p className="mt-2 leading-6 text-slate-300">
                Enquanto a flag estiver desligada, o supervisor deve registrar os incrementos pela
                tela administrativa de apontamentos e acompanhar o progresso na dashboard.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/admin/apontamentos"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-3xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Abrir apontamentos
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/admin/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Ir para dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f766e_0%,#0f172a_42%,#020617_100%)] px-4 py-6 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col gap-5">
        <section className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300/90">
                Scanner de produção
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-white">{etapaAtual.titulo}</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">{etapaAtual.descricao}</p>
            </div>

            <button
              type="button"
              onClick={resetarTudo}
              className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/8"
            >
              Reiniciar
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <IdCard size={16} className="text-cyan-300" />
              Operador
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {'operador' in estado ? estado.operador.nome : 'Aguardando leitura'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Factory size={16} className="text-amber-300" />
              Setor
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {secaoAtual ? secaoAtual.setorNome : 'Aguardando leitura'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Boxes size={16} className="text-emerald-300" />
              OP
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {secaoAtual ? secaoAtual.numeroOp : 'Aguardando leitura'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Boxes size={16} className="text-fuchsia-300" />
              Saldo
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {secaoAtual ? String(secaoAtual.saldoRestante) : 'Aguardando leitura'}
            </p>
          </div>
        </section>

        {secaoAtual ? (
          <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-200 backdrop-blur-md">
            <p className="font-semibold text-white">
              {secaoAtual.produtoReferencia} · {secaoAtual.produtoNome}
            </p>
            <p className="mt-2 text-slate-300">
              Turno aberto em {formatarTurnoResumido(secaoAtual.turnoIniciadoEm)}
            </p>
          </section>
        ) : null}

        {mensagemAtiva ? (
          <section
            className={`rounded-3xl border px-4 py-3 text-sm leading-6 ${
              mensagemAtiva.tipo === 'sucesso'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                : 'border-red-500/30 bg-red-500/10 text-red-100'
            }`}
          >
            <div className="flex items-start gap-3">
              {mensagemAtiva.tipo === 'sucesso' ? (
                <CheckCircle2 size={18} className="mt-1 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="mt-1 shrink-0" />
              )}
              <p>{mensagemAtiva.texto}</p>
            </div>
          </section>
        ) : null}

        {estado.etapa !== 'confirmar' ? (
          <QRScanner
            ativa={!estaCarregando}
            onScan={handleScan}
            onCodigoInvalido={() => {
              setTipoMensagem('erro')
              setMensagemTela('QR inválido. Use apenas os códigos gerados pelo sistema.')
            }}
            onErro={(mensagem) => {
              setTipoMensagem('erro')
              setMensagemTela(mensagem)
            }}
          />
        ) : (
          <ConfirmacaoRegistro
            secao={estado.secao}
            estaRegistrando={estaCarregando}
            onRegistrar={registrar}
            onRegistroConcluido={() => {
              setTipoMensagem('sucesso')
              setMensagemTela('Quantidade validada. Escaneie a próxima seção do turno.')
              resetarOperacao()
            }}
            onErro={(mensagem) => {
              setTipoMensagem('erro')
              setMensagemTela(mensagem)
            }}
          />
        )}
      </div>
    </main>
  )
}
