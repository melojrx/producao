'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Factory, IdCard } from 'lucide-react'
import { ConfirmacaoRegistro } from '@/components/scanner/ConfirmacaoRegistro'
import { QRScanner } from '@/components/scanner/QRScanner'
import { useScanner } from '@/hooks'
import { registrarProducao } from '@/lib/actions/producao'
import type { QRScanResult, QRTipo } from '@/types'

const ETAPAS_CONFIG = {
  scan_operador: {
    tipoEsperado: 'operador' as QRTipo,
    titulo: 'Escaneie seu crachá',
    descricao: 'Aponte a câmera para o QR Code do operador para iniciar a sessão.',
  },
  scan_maquina: {
    tipoEsperado: 'maquina' as QRTipo,
    titulo: 'Escaneie a máquina',
    descricao: 'Depois de identificar o operador, leia a etiqueta da máquina em uso.',
  },
  scan_operacao: {
    tipoEsperado: 'operacao' as QRTipo,
    titulo: 'Escaneie a operação',
    descricao: 'Leia o cartão da operação para carregar meta individual e meta por hora.',
  },
  confirmar: {
    tipoEsperado: 'operacao' as QRTipo,
    titulo: 'Confirmar produção',
    descricao: 'Ajuste a quantidade produzida e confirme o registro.',
  },
} as const

export default function ScannerPage() {
  const [mensagemTela, setMensagemTela] = useState<string | null>(null)
  const [tipoMensagem, setTipoMensagem] = useState<'erro' | 'sucesso'>('erro')
  const {
    estado,
    erro,
    estaCarregando,
    scanOperador,
    scanMaquina,
    scanOperacao,
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
      setTipoMensagem('erro')
      setMensagemTela(
        `QR incorreto. Nesta etapa, escaneie um QR do tipo ${etapaAtual.tipoEsperado}.`
      )
      return
    }

    const resposta =
      estado.etapa === 'scan_operador'
        ? await scanOperador(resultado.token)
        : estado.etapa === 'scan_maquina'
          ? await scanMaquina(resultado.token)
          : await scanOperacao(resultado.token)

    if (!resposta.sucesso && resposta.erro) {
      setTipoMensagem('erro')
      setMensagemTela(resposta.erro)
    }
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
              Máquina
            </div>
            <p className="mt-3 text-sm font-medium text-white">
              {'maquina' in estado ? estado.maquina.codigo : 'Aguardando leitura'}
            </p>
          </div>
        </section>

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
            operacao={estado.operacao}
            estaRegistrando={estaCarregando}
            onRegistrar={registrar}
            onRegistroConcluido={() => {
              setTipoMensagem('sucesso')
              setMensagemTela('Produção registrada com sucesso. Escaneie a próxima operação.')
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
