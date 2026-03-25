'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Minus, Plus, ScanQrCode } from 'lucide-react'
import type { OperacaoScaneada } from '@/types'
import type { ResultadoScannerAction } from '@/hooks'

interface ConfirmacaoRegistroProps {
  operacao: OperacaoScaneada
  estaRegistrando: boolean
  onRegistrar: (quantidade: number) => Promise<ResultadoScannerAction>
  onRegistroConcluido: () => void
  onErro: (mensagem: string) => void
}

const DURACAO_FEEDBACK_SUCESSO_MS = 800

export function ConfirmacaoRegistro({
  operacao,
  estaRegistrando,
  onRegistrar,
  onRegistroConcluido,
  onErro,
}: ConfirmacaoRegistroProps) {
  const [quantidade, setQuantidade] = useState(1)
  const [exibindoSucesso, setExibindoSucesso] = useState(false)
  const timeoutSucessoRef = useRef<number | null>(null)

  useEffect(() => {
    setQuantidade(1)
  }, [operacao.id])

  useEffect(() => {
    return () => {
      if (timeoutSucessoRef.current !== null) {
        window.clearTimeout(timeoutSucessoRef.current)
      }
    }
  }, [])

  function ajustarQuantidade(valor: number) {
    setQuantidade((quantidadeAtual) => Math.max(1, quantidadeAtual + valor))
  }

  async function handleRegistrar() {
    const resultado = await onRegistrar(quantidade)

    if (!resultado.sucesso) {
      onErro(resultado.erro ?? 'Não foi possível registrar a produção.')
      return
    }

    if (navigator.vibrate) {
      navigator.vibrate(200)
    }

    setExibindoSucesso(true)

    timeoutSucessoRef.current = window.setTimeout(() => {
      setExibindoSucesso(false)
      setQuantidade(1)
      onRegistroConcluido()
    }, DURACAO_FEEDBACK_SUCESSO_MS)
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <AnimatePresence>
        {exibindoSucesso ? (
          <motion.div
            key="feedback-sucesso"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-emerald-500 px-6 text-center text-slate-950"
          >
            <motion.div
              initial={{ scale: 0.84 }}
              animate={{ scale: [0.84, 1.06, 1] }}
              transition={{ duration: 0.5, times: [0, 0.7, 1] }}
              className="rounded-full bg-white/20 p-4"
            >
              <CheckCircle2 size={36} />
            </motion.div>
            <p className="text-xl font-semibold">Registro salvo</p>
            <p className="text-sm font-medium">Preparando a próxima operação...</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="flex items-center gap-2 text-sm text-emerald-300">
        <ScanQrCode size={18} />
        Operação carregada
      </div>

      <h2 className="mt-3 text-xl font-semibold text-white">{operacao.descricao}</h2>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Meta do dia</p>
          <p className="mt-2 text-2xl font-semibold text-white">{operacao.metaIndividual}</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Meta/hora</p>
          <p className="mt-2 text-2xl font-semibold text-white">{operacao.metaHora}</p>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-sm font-medium text-slate-200" htmlFor="quantidade-producao">
          Quantidade produzida
        </label>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 p-3">
          <button
            type="button"
            onClick={() => ajustarQuantidade(-1)}
            aria-label="Diminuir quantidade"
            disabled={estaRegistrando || exibindoSucesso}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Minus size={22} />
          </button>

          <input
            id="quantidade-producao"
            type="number"
            min={1}
            value={quantidade}
            onChange={(event) => {
              const proximoValor = Number.parseInt(event.target.value, 10)
              setQuantidade(Number.isNaN(proximoValor) || proximoValor < 1 ? 1 : proximoValor)
            }}
            disabled={estaRegistrando || exibindoSucesso}
            className="w-full bg-transparent text-center text-4xl font-semibold text-white outline-none disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() => ajustarQuantidade(1)}
            aria-label="Aumentar quantidade"
            disabled={estaRegistrando || exibindoSucesso}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleRegistrar()}
        disabled={estaRegistrando || exibindoSucesso}
        className="mt-5 flex min-h-14 w-full items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-lg font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {estaRegistrando ? 'Registrando...' : 'Registrar'}
      </button>
    </section>
  )
}
