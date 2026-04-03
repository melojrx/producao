'use client'

import { Search, UserCheck, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { OperadorScaneado } from '@/types'

interface SelecaoOperadorManualProps {
  carregando: boolean
  onFechar: () => void
  onSelecionarOperador: (operadorId: string) => void | Promise<void>
  operadores: OperadorScaneado[]
}

function normalizarTextoBusca(valor: string): string {
  return valor.trim().toLowerCase()
}

export function SelecaoOperadorManual({
  carregando,
  onFechar,
  onSelecionarOperador,
  operadores,
}: SelecaoOperadorManualProps) {
  const [busca, setBusca] = useState('')
  const termoBusca = normalizarTextoBusca(busca)

  const operadoresFiltrados = useMemo(() => {
    if (!termoBusca) {
      return operadores
    }

    return operadores.filter((operador) => {
      const nome = normalizarTextoBusca(operador.nome)
      const matricula = normalizarTextoBusca(operador.matricula)
      return nome.includes(termoBusca) || matricula.includes(termoBusca)
    })
  }, [operadores, termoBusca])

  return (
    <section className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5 shadow-[0_20px_48px_rgba(2,6,23,0.45)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-cyan-300">
            <UserCheck size={18} />
            Seleção manual de operador
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Use este fallback quando o QR do operador não puder ser lido no momento. Apenas
            operadores ativos aparecem nesta lista.
          </p>
        </div>

        <button
          type="button"
          onClick={onFechar}
          className="rounded-full border border-white/12 p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
          aria-label="Fechar seleção manual de operador"
        >
          <X size={16} />
        </button>
      </div>

      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar por nome ou matrícula"
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          aria-label="Buscar operador por nome ou matrícula"
        />
      </label>

      {carregando ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          Carregando operadores ativos...
        </div>
      ) : operadoresFiltrados.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/12 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
          Nenhum operador ativo encontrado para esta busca.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {operadoresFiltrados.map((operador) => (
            <button
              key={operador.id}
              type="button"
              onClick={() => void onSelecionarOperador(operador.id)}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/8"
            >
              <p className="text-sm font-semibold text-white">{operador.nome}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                Matrícula {operador.matricula}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
