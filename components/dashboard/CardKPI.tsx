'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface CardKPIProps {
  titulo: string
  valor: number
  descricao: string
  icone: LucideIcon
  sufixo?: string
  decimals?: number
  destaque?: 'blue' | 'emerald' | 'amber' | 'slate'
  desabilitado?: boolean
  motivoDesabilitado?: string
}

function formatarNumero(valor: number, decimals: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(valor)
}

export function CardKPI({
  titulo,
  valor,
  descricao,
  icone: Icone,
  sufixo = '',
  decimals = 0,
  destaque = 'slate',
  desabilitado = false,
  motivoDesabilitado = 'Indisponível no contexto atual.',
}: CardKPIProps) {
  const [valorAnimado, setValorAnimado] = useState(valor)

  useEffect(() => {
    let frameId = 0
    const valorInicial = valorAnimado
    const diferenca = valor - valorInicial
    const duracao = 420
    const inicio = performance.now()

    function animar(agora: number) {
      const progresso = Math.min((agora - inicio) / duracao, 1)
      const suavizado = 1 - Math.pow(1 - progresso, 3)

      setValorAnimado(valorInicial + diferenca * suavizado)

      if (progresso < 1) {
        frameId = window.requestAnimationFrame(animar)
      }
    }

    frameId = window.requestAnimationFrame(animar)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [valor])

  const tema =
    desabilitado
      ? {
          fundo: 'from-slate-50 to-slate-100',
          borda: 'border-slate-200',
          icone: 'bg-slate-200 text-slate-500',
          titulo: 'text-slate-500',
        }
      : destaque === 'blue'
      ? {
          fundo: 'from-blue-50 to-cyan-50',
          borda: 'border-blue-100',
          icone: 'bg-blue-100 text-blue-700',
          titulo: 'text-blue-700',
        }
      : destaque === 'emerald'
        ? {
            fundo: 'from-emerald-50 to-teal-50',
            borda: 'border-emerald-100',
            icone: 'bg-emerald-100 text-emerald-700',
            titulo: 'text-emerald-700',
          }
        : destaque === 'amber'
          ? {
              fundo: 'from-amber-50 to-orange-50',
              borda: 'border-amber-100',
              icone: 'bg-amber-100 text-amber-700',
              titulo: 'text-amber-700',
            }
          : {
              fundo: 'from-slate-50 to-slate-100',
              borda: 'border-slate-200',
              icone: 'bg-slate-200 text-slate-700',
              titulo: 'text-slate-600',
            }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-2xl border bg-linear-to-br ${tema.fundo} ${tema.borda} p-5 shadow-sm`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-medium tracking-wide uppercase ${tema.titulo}`}>{titulo}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {desabilitado ? '—' : `${formatarNumero(valorAnimado, decimals)}${sufixo}`}
          </p>
        </div>

        <div className={`rounded-2xl p-3 ${tema.icone}`}>
          <Icone size={20} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {desabilitado ? motivoDesabilitado : descricao}
      </p>
    </motion.article>
  )
}
