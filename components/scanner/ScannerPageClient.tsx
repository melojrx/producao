'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  IdCard,
  ShieldAlert,
} from 'lucide-react'
import { ConfirmacaoQualidade } from '@/components/scanner/ConfirmacaoQualidade'
import { ConfirmacaoRegistro } from '@/components/scanner/ConfirmacaoRegistro'
import { QRScanner } from '@/components/scanner/QRScanner'
import { SelecaoOperadorManual } from '@/components/scanner/SelecaoOperadorManual'
import { SelecaoDemandaScanner } from '@/components/scanner/SelecaoDemandaScanner'
import { SelecaoOperacaoScanner } from '@/components/scanner/SelecaoOperacaoScanner'
import { useScanner } from '@/hooks'
import { registrarProducaoOperacao } from '@/lib/actions/producao'
import { registrarRevisaoQualidade } from '@/lib/actions/qualidade'
import { listarOperadoresAtivosScanner } from '@/lib/queries/scanner'
import { isScannerV2Enabled } from '@/lib/utils/feature-flags'
import { setorUsaRevisaoQualidade } from '@/lib/utils/qualidade'
import { descreverTipoQRCode } from '@/lib/utils/qrcode'
import type { OperadorScaneado, QRScanResult, QRTipo } from '@/types'

interface ScannerPageClientProps {
  podeRegistrarQualidade: boolean
  revisorNome: string | null
}

const ETAPAS_FLUXO_PRODUCAO = [
  { id: 'scan_setor', label: 'Setor' },
  { id: 'scan_operador', label: 'Operador' },
  { id: 'selecionar_demanda', label: 'OP/Produto' },
  { id: 'selecionar_operacao', label: 'Operação' },
  { id: 'informar_quantidade', label: 'Quantidade' },
] as const

const ETAPAS_FLUXO_QUALIDADE = [
  { id: 'scan_setor', label: 'Setor' },
  { id: 'selecionar_demanda_qualidade', label: 'OP/Produto' },
  { id: 'informar_qualidade', label: 'Revisão' },
] as const

const ETAPAS_CONFIG = {
  scan_setor: {
    tipoEsperado: 'turno-setor' as QRTipo,
    titulo: 'Escaneie o QR operacional',
    descricao: 'Leia o QR temporário do setor do turno para abrir a estrutura operacional ativa.',
  },
  scan_operador: {
    tipoEsperado: 'operador' as QRTipo,
    titulo: 'Escaneie o operador',
    descricao: 'Com o setor já aberto, leia o QR do operador que executou a produção.',
  },
  selecionar_demanda: {
    tipoEsperado: null,
    titulo: 'Selecione a OP/produto',
    descricao:
      'Escolha qual OP/produto será apontada dentro do setor aberto antes de selecionar a operação executada.',
  },
  selecionar_demanda_qualidade: {
    tipoEsperado: null,
    titulo: 'Selecione a OP/produto',
    descricao:
      'Escolha qual OP/produto revisada será recebida no setor Qualidade antes de lançar aprovadas, reprovadas e defeitos.',
  },
  selecionar_operacao: {
    tipoEsperado: null,
    titulo: 'Selecione a operação',
    descricao:
      'Revise as operações planejadas da OP/produto escolhida, selecione o trabalho executado e siga para informar a quantidade incremental.',
  },
  informar_quantidade: {
    tipoEsperado: null,
    titulo: 'Confirmar quantidade',
    descricao:
      'Revise a operação escolhida na demanda aberta, informe a quantidade executada e siga para o lançamento atômico.',
  },
  informar_qualidade: {
    tipoEsperado: null,
    titulo: 'Registrar revisão',
    descricao:
      'Informe aprovadas, reprovadas e distribua os defeitos nas operações produtivas de origem da OP revisada.',
  },
  registrar: {
    tipoEsperado: null,
    titulo: 'Registrando',
    descricao: 'Aguarde o envio transacional do apontamento atômico da operação.',
  },
  registrar_qualidade: {
    tipoEsperado: null,
    titulo: 'Registrando revisão',
    descricao: 'Aguarde o envio transacional da revisão de qualidade.',
  },
} as const

function formatarTurnoResumido(iniciadoEm: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iniciadoEm))
}

function IndicadorFluxoScanner({
  etapa,
  usaFluxoQualidade,
}: {
  etapa: keyof typeof ETAPAS_CONFIG
  usaFluxoQualidade: boolean
}) {
  const etapas = usaFluxoQualidade ? ETAPAS_FLUXO_QUALIDADE : ETAPAS_FLUXO_PRODUCAO
  const etapaAtual =
    etapa === 'registrar_qualidade'
      ? 'informar_qualidade'
      : etapa === 'registrar'
        ? 'informar_quantidade'
        : etapa
  const indiceAtual = etapas.findIndex((item) => item.id === etapaAtual)

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/40 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        {etapas.map((item, indice) => {
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

export function ScannerPageClient({
  podeRegistrarQualidade,
  revisorNome,
}: ScannerPageClientProps) {
  const scannerV2Habilitado = isScannerV2Enabled()
  const [mensagemTela, setMensagemTela] = useState<string | null>(null)
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso'>('erro')
  const [fallbackOperadorAberto, setFallbackOperadorAberto] = useState(false)
  const [carregandoOperadoresFallback, setCarregandoOperadoresFallback] = useState(false)
  const [operadoresFallback, setOperadoresFallback] = useState<OperadorScaneado[]>([])
  const {
    estado,
    erro,
    estaCarregando,
    scanSetor,
    scanOperador,
    selecionarOperadorManual,
    selecionarDemanda,
    selecionarOperacao,
    registrar,
    registrarQualidade,
    trocarDemanda,
    trocarOperacao,
    trocarOperador,
    reiniciarTotal,
  } = useScanner({
    onRegistrar: registrarProducaoOperacao,
    onRegistrarQualidade: (input) =>
      registrarRevisaoQualidade({
        ...input,
        origemLancamento: 'scanner_qualidade',
      }),
    podeRegistrarQualidade,
  })

  const etapaAtual = ETAPAS_CONFIG[estado.etapa]

  useEffect(() => {
    if (estado.etapa !== 'scan_operador') {
      setFallbackOperadorAberto(false)
      return
    }

    if (!fallbackOperadorAberto || operadoresFallback.length > 0) {
      return
    }

    let cancelado = false

    async function carregarOperadoresAtivos() {
      setCarregandoOperadoresFallback(true)

      try {
        const operadoresAtivos = await listarOperadoresAtivosScanner()

        if (!cancelado) {
          setOperadoresFallback(operadoresAtivos)
        }
      } finally {
        if (!cancelado) {
          setCarregandoOperadoresFallback(false)
        }
      }
    }

    void carregarOperadoresAtivos()

    return () => {
      cancelado = true
    }
  }, [estado.etapa, fallbackOperadorAberto, operadoresFallback.length])

  const mensagemAtiva = useMemo(() => {
    if (erro) {
      return { texto: erro, tipo: 'erro' as const }
    }

    if (mensagemTela) {
      return { texto: mensagemTela, tipo: tipoMensagem }
    }

    return null
  }, [erro, mensagemTela, tipoMensagem])

  const setorAtual = 'setor' in estado ? estado.setor : null
  const demandaAtual = 'demandaSelecionada' in estado ? estado.demandaSelecionada : null
  const usaFluxoQualidade = Boolean(
    setorAtual && setorUsaRevisaoQualidade(setorAtual.setorNome, setorAtual.modoApontamento)
  )

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
      estado.etapa === 'scan_setor'
        ? await scanSetor(resultado.token)
        : await scanOperador(resultado.token)

    if (!resposta.sucesso && resposta.erro) {
      setTipoMensagem('erro')
      setMensagemTela(resposta.erro)
    }
  }

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
                {usaFluxoQualidade ? 'Scanner de qualidade' : 'Scanner de produção'}
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

        <IndicadorFluxoScanner etapa={estado.etapa} usaFluxoQualidade={usaFluxoQualidade} />

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <IdCard size={16} className="text-cyan-300" />
              {usaFluxoQualidade ? 'Revisor' : 'Operador'}
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {usaFluxoQualidade
                ? revisorNome ?? 'Sessão sem nome'
                : 'operador' in estado
                  ? estado.operador.nome
                  : 'Aguardando leitura'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Factory size={16} className="text-amber-300" />
              Setor
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {setorAtual ? setorAtual.setorNome : 'Aguardando leitura'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Boxes size={16} className="text-emerald-300" />
              OP
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {demandaAtual ? demandaAtual.numeroOp : 'Aguardando seleção'}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Boxes size={16} className="text-fuchsia-300" />
              Disponível agora
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {demandaAtual
                ? String(
                    demandaAtual.quantidadeDisponivelApontamento ?? demandaAtual.saldoRestante
                  )
                : setorAtual
                  ? String(setorAtual.saldoRestante)
                  : 'Aguardando leitura'}
            </p>
          </div>
        </section>

        {setorAtual ? (
          <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 text-sm text-slate-200 backdrop-blur-md">
            <p className="font-semibold text-white">
              {setorAtual.setorNome}
              {demandaAtual
                ? ` · ${demandaAtual.produtoReferencia} · ${demandaAtual.produtoNome}`
                : ''}
            </p>
            <p className="mt-2 text-slate-300">
              Turno aberto em {formatarTurnoResumido(setorAtual.turnoIniciadoEm)}
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

        {estado.etapa === 'scan_setor' || estado.etapa === 'scan_operador' ? (
          <section className="space-y-4">
            <div className="rounded-[28px] border border-cyan-400/15 bg-cyan-400/8 p-4 text-sm leading-6 text-cyan-50">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100/80">
                Etapa ativa
              </p>
              <p className="mt-2 font-semibold text-white">{etapaAtual.titulo}</p>
              <p className="mt-2">
                {estado.etapa === 'scan_setor'
                  ? 'Aponte a câmera para o QR temporário do setor do turno. O scanner identifica automaticamente se o setor está em produção padrão ou em revisão de qualidade.'
                  : 'Com o setor aberto, leia o QR do operador que executou esta produção. O scanner avança sozinho para a escolha da OP/produto.'}
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

            {estado.etapa === 'scan_operador' ? (
              <>
                <button
                  type="button"
                  onClick={() => setFallbackOperadorAberto((estadoAtual) => !estadoAtual)}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-3xl border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
                >
                  {fallbackOperadorAberto
                    ? 'Fechar seleção manual'
                    : 'Selecionar operador manualmente'}
                </button>

                {fallbackOperadorAberto ? (
                  <SelecaoOperadorManual
                    carregando={carregandoOperadoresFallback}
                    operadores={operadoresFallback}
                    onFechar={() => setFallbackOperadorAberto(false)}
                    onSelecionarOperador={async (operadorId) => {
                      const resposta = await selecionarOperadorManual(operadorId)

                      if (!resposta.sucesso && resposta.erro) {
                        setTipoMensagem('erro')
                        setMensagemTela(resposta.erro)
                        return
                      }

                      setMensagemTela(null)
                      setFallbackOperadorAberto(false)
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </section>
        ) : estado.etapa === 'selecionar_demanda' ? (
          <SelecaoDemandaScanner
            demandas={estado.demandas}
            nomeResponsavel={estado.operador.nome}
            onSelecionarDemanda={async (demandaId) => {
              const resposta = await selecionarDemanda(demandaId)

              if (!resposta.sucesso && resposta.erro) {
                setTipoMensagem('erro')
                setMensagemTela(resposta.erro)
              }
            }}
            onAcaoSecundaria={trocarOperador}
            setor={estado.setor}
          />
        ) : estado.etapa === 'selecionar_demanda_qualidade' ? (
          <SelecaoDemandaScanner
            demandas={estado.demandas}
            nomeResponsavel={revisorNome ?? 'Revisor habilitado'}
            rotuloResponsavel="Revisor"
            acaoSecundariaLabel="Reiniciar scanner"
            onSelecionarDemanda={async (demandaId) => {
              const resposta = await selecionarDemanda(demandaId)

              if (!resposta.sucesso && resposta.erro) {
                setTipoMensagem('erro')
                setMensagemTela(resposta.erro)
              }
            }}
            onAcaoSecundaria={reiniciarTotal}
            setor={estado.setor}
          />
        ) : estado.etapa === 'selecionar_operacao' ? (
          <SelecaoOperacaoScanner
            demandaSelecionada={estado.demandaSelecionada}
            operacoes={estado.operacoes}
            operador={estado.operador}
            onSelecionarOperacao={selecionarOperacao}
            onTrocarDemanda={trocarDemanda}
            onTrocarOperador={trocarOperador}
            setor={estado.setor}
          />
        ) : estado.etapa === 'informar_qualidade' || estado.etapa === 'registrar_qualidade' ? (
          <ConfirmacaoQualidade
            demandaSelecionada={estado.demandaSelecionada}
            operacaoQualidade={estado.operacaoQualidade}
            operacoesOrigem={estado.operacoesOrigem}
            setor={estado.setor}
            revisorNome={revisorNome}
            estaRegistrando={estaCarregando}
            onRegistrar={registrarQualidade}
            onErro={(mensagem) => {
              setTipoMensagem('erro')
              setMensagemTela(mensagem)
            }}
            onTrocarDemanda={trocarDemanda}
            onReiniciarTudo={reiniciarTotal}
          />
        ) : (
          <ConfirmacaoRegistro
            demandaSelecionada={estado.demandaSelecionada}
            operacaoSelecionada={estado.operacaoSelecionada}
            operador={estado.operador}
            setor={estado.setor}
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
            onTrocarDemanda={trocarDemanda}
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
