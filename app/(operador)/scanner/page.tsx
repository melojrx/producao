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
import { SelecaoOperacaoScanner } from '@/components/scanner/SelecaoOperacaoScanner'
import { useScanner } from '@/hooks'
import { registrarProducaoOperacao } from '@/lib/actions/producao'
import { isScannerV2Enabled } from '@/lib/utils/feature-flags'
import { descreverTipoQRCode } from '@/lib/utils/qrcode'
import type { QRScanResult, QRTipo } from '@/types'

const ETAPAS_FLUXO = [
  { id: 'scan_secao', label: 'Seção' },
  { id: 'scan_operador', label: 'Operador' },
  { id: 'selecionar_operacao', label: 'Operação' },
  { id: 'informar_quantidade', label: 'Quantidade' },
] as const

const ETAPAS_CONFIG = {
  scan_secao: {
    tipoEsperado: 'setor-op' as QRTipo,
    titulo: 'Escaneie o QR operacional',
    descricao: 'Leia o QR temporário do setor e da OP para abrir a seção do turno.',
  },
  scan_operador: {
    tipoEsperado: 'operador' as QRTipo,
    titulo: 'Escaneie o operador',
    descricao: 'Com a seção já aberta, leia o QR do operador que executou a produção.',
  },
  selecionar_operacao: {
    tipoEsperado: null,
    titulo: 'Selecione a operação',
    descricao:
      'Revise as operações planejadas da seção, escolha o trabalho executado e siga para informar a quantidade incremental.',
  },
  informar_quantidade: {
    tipoEsperado: null,
    titulo: 'Confirmar quantidade',
    descricao:
      'Revise a operação escolhida na seção aberta, informe a quantidade executada e siga para o lançamento atômico.',
  },
  registrar: {
    tipoEsperado: null,
    titulo: 'Registrando',
    descricao: 'Aguarde o envio transacional do apontamento atômico da operação.',
  },
} as const

function etapaFluxoAtual(etapa: keyof typeof ETAPAS_CONFIG): (typeof ETAPAS_FLUXO)[number]['id'] {
  if (etapa === 'registrar') {
    return 'informar_quantidade'
  }

  return etapa
}

function IndicadorFluxoScanner({ etapa }: { etapa: keyof typeof ETAPAS_CONFIG }) {
  const etapaAtual = etapaFluxoAtual(etapa)
  const indiceAtual = ETAPAS_FLUXO.findIndex((item) => item.id === etapaAtual)

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        {ETAPAS_FLUXO.map((item, indice) => {
          const concluida = indice < indiceAtual
          const ativa = item.id === etapaAtual

          return (
            <div key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  ativa
                    ? 'border-emerald-300 bg-emerald-400/20 text-emerald-100'
                    : concluida
                      ? 'border-cyan-300/70 bg-cyan-400/15 text-cyan-100'
                      : 'border-white/12 bg-white/5 text-slate-400'
                }`}
              >
                {indice + 1}
              </div>
              <div className="min-w-0">
                <p
                  className={`truncate text-xs font-semibold uppercase tracking-[0.18em] ${
                    ativa || concluida ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {item.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

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
    scanSecao,
    scanOperador,
    selecionarOperacao,
    registrar,
    trocarOperacao,
    trocarOperador,
    reiniciarTotal,
  } = useScanner({ onRegistrar: registrarProducaoOperacao })

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

    if (!etapaAtual.tipoEsperado) {
      return
    }

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
      estado.etapa === 'scan_secao'
        ? await scanSecao(resultado.token)
        : await scanOperador(resultado.token)

    if (!resposta.sucesso && resposta.erro) {
      setTipoMensagem('erro')
      setMensagemTela(resposta.erro)
    }
  }

  const secaoAtual = 'secao' in estado ? estado.secao : null

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
              onClick={reiniciarTotal}
              className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/25 hover:bg-white/8"
            >
              Reiniciar
            </button>
          </div>
        </section>

        <IndicadorFluxoScanner etapa={estado.etapa} />

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

        {estado.etapa === 'scan_secao' || estado.etapa === 'scan_operador' ? (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm leading-6 text-cyan-50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                Etapa ativa
              </p>
              <p className="mt-2 font-semibold text-white">{etapaAtual.titulo}</p>
              <p className="mt-2">
                {estado.etapa === 'scan_secao'
                  ? 'Aponte a câmera para o QR temporário do setor + OP. Depois disso, a mesma seção fica aberta para as próximas leituras.'
                  : 'Com a seção aberta, leia o QR do operador que executou esta produção. O scanner avança sozinho para a escolha da operação.'}
              </p>
            </div>

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
          </section>
        ) : estado.etapa === 'selecionar_operacao' ? (
          <SelecaoOperacaoScanner
            operacoes={estado.operacoes}
            operador={estado.operador}
            onSelecionarOperacao={selecionarOperacao}
            onTrocarOperador={trocarOperador}
            secao={estado.secao}
          />
        ) : (
          <ConfirmacaoRegistro
            operacaoSelecionada={estado.operacaoSelecionada}
            operador={estado.operador}
            secao={estado.secao}
            estaRegistrando={estaCarregando}
            onNovaQuantidade={() => {
              setMensagemTela(null)
            }}
            onRegistrar={registrar}
            onErro={(mensagem) => {
              setTipoMensagem('erro')
              setMensagemTela(mensagem)
            }}
            onReiniciarTudo={reiniciarTotal}
            onTrocarOperacao={trocarOperacao}
            onTrocarOperador={trocarOperador}
          />
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Contingência
          </p>
          <p className="mt-2 leading-6">
            Se o fluxo móvel precisar ser interrompido, o supervisor pode continuar os lançamentos
            pela tela administrativa sem perder o contexto atômico da V2.
          </p>
          <Link
            href="/admin/apontamentos"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Abrir /admin/apontamentos
          </Link>
        </section>
      </div>
    </main>
  )
}
