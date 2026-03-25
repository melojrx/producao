'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, Factory, Wrench } from 'lucide-react'
import { ALERTA_MAQUINA_PARADA } from '@/lib/constants'
import type { StatusMaquinaRegistro } from '@/types'

interface StatusMaquinasProps {
  maquinas: StatusMaquinaRegistro[]
  estaCarregando?: boolean
}

function formatarUltimoUso(ultimoUso: string | null): string {
  if (!ultimoUso) {
    return 'Sem uso hoje'
  }

  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Fortaleza',
  }).format(new Date(ultimoUso))
}

function obterTemaMaquina(maquina: StatusMaquinaRegistro): {
  container: string
  badge: string
  pisca: boolean
  rotulo: string
} {
  if (maquina.status === 'manutencao') {
    return {
      container: 'border-amber-200 bg-amber-50',
      badge: 'bg-amber-100 text-amber-800',
      pisca: false,
      rotulo: 'Manutenção',
    }
  }

  if (maquina.status === 'parada') {
    return {
      container: 'border-slate-300 bg-slate-100',
      badge: 'bg-slate-200 text-slate-700',
      pisca: false,
      rotulo: 'Parada',
    }
  }

  if (maquina.minutosSemUso > ALERTA_MAQUINA_PARADA) {
    return {
      container: 'border-red-300 bg-red-50',
      badge: 'bg-red-100 text-red-800',
      pisca: true,
      rotulo: 'Ativa sem uso',
    }
  }

  return {
    container: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-800',
    pisca: false,
    rotulo: 'Ativa',
  }
}

export function StatusMaquinas({
  maquinas,
  estaCarregando = false,
}: StatusMaquinasProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Status das máquinas</h3>
          <p className="mt-1 text-sm text-slate-600">
            Alerta vermelho quando a máquina passa do limite de {ALERTA_MAQUINA_PARADA} minutos sem uso.
          </p>
        </div>
        {estaCarregando ? <span className="text-xs text-slate-500">Sincronizando...</span> : null}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {maquinas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500 sm:col-span-2 xl:col-span-3">
            Nenhuma máquina encontrada para exibir no dashboard.
          </div>
        ) : (
          maquinas.map((maquina) => {
            const tema = obterTemaMaquina(maquina)

            return (
              <motion.article
                key={maquina.id}
                animate={
                  tema.pisca
                    ? {
                        boxShadow: [
                          '0 0 0 rgba(239,68,68,0)',
                          '0 0 0 6px rgba(239,68,68,0.14)',
                          '0 0 0 rgba(239,68,68,0)',
                        ],
                      }
                    : undefined
                }
                transition={
                  tema.pisca
                    ? {
                        duration: 1.4,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: 'easeInOut',
                      }
                    : undefined
                }
                className={`rounded-2xl border p-4 shadow-sm ${tema.container}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {maquina.status === 'manutencao' ? (
                      <Wrench size={18} className="text-amber-700" />
                    ) : (
                      <Factory size={18} className="text-slate-700" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{maquina.codigo}</p>
                      <p className="text-xs text-slate-600">{maquina.tipoNome}</p>
                    </div>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tema.badge}`}>
                    {tema.rotulo}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Min sem uso</span>
                    <strong>{Math.max(0, Math.round(maquina.minutosSemUso))}</strong>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Último uso</span>
                    <strong>{formatarUltimoUso(maquina.ultimoUso)}</strong>
                  </div>
                </div>

                {tema.pisca ? (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-white/60 px-3 py-2 text-xs font-medium text-red-700">
                    <AlertTriangle size={14} />
                    Acima do limite de parada
                  </div>
                ) : null}
              </motion.article>
            )
          })
        )}
      </div>
    </section>
  )
}
