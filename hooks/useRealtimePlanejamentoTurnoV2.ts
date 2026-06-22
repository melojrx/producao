'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { buscarPlanejamentoTurnoDashboardAction } from '@/lib/actions/dashboard-turno'
import { INTERVALO_POLLING_DASHBOARD_MS } from '@/lib/constants'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

export type StatusConexaoPlanejamentoTurnoV2 =
  | 'conectando'
  | 'ativo'
  | 'polling'
  | 'desligado'
  | 'erro'

/** @deprecated Use StatusConexaoPlanejamentoTurnoV2 */
export type StatusConexaoRealtimeTurnoV2 = StatusConexaoPlanejamentoTurnoV2

export function rotuloStatusConexaoPlanejamento(
  status: StatusConexaoPlanejamentoTurnoV2
): string {
  switch (status) {
    case 'ativo':
      return 'tempo real'
    case 'polling':
      return 'atualização automática'
    case 'desligado':
      return 'desligado'
    case 'erro':
      return 'com erro'
    default:
      return 'conectando'
  }
}

export interface UseRealtimePlanejamentoTurnoV2Resultado {
  planejamento: PlanejamentoTurnoDashboardV2 | null
  ultimaAtualizacao: Date | null
  statusConexao: StatusConexaoPlanejamentoTurnoV2
  estaCarregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

export function useRealtimePlanejamentoTurnoV2(
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
): UseRealtimePlanejamentoTurnoV2Resultado {
  const [planejamento, setPlanejamento] = useState<PlanejamentoTurnoDashboardV2 | null>(initialPlanning)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [statusConexao, setStatusConexao] = useState<StatusConexaoPlanejamentoTurnoV2>('polling')
  const [estaCarregando, setEstaCarregando] = useState(initialPlanning === null)
  const [erro, setErro] = useState<string | null>(null)
  const recargaEmAndamentoRef = useRef<Promise<void> | null>(null)

  const aplicarSnapshot = useCallback((snapshot: PlanejamentoTurnoDashboardV2 | null) => {
    startTransition(() => {
      setPlanejamento(snapshot)
      setUltimaAtualizacao(new Date())
      setErro(null)
      setEstaCarregando(false)
      setStatusConexao('polling')
    })
  }, [])

  const registrarErro = useCallback((mensagem: string) => {
    startTransition(() => {
      setErro(mensagem)
      setStatusConexao('erro')
      setEstaCarregando(false)
    })
  }, [])

  const recarregar = useCallback(async () => {
    if (recargaEmAndamentoRef.current) {
      return recargaEmAndamentoRef.current
    }

    setEstaCarregando(true)

    const recarga = buscarPlanejamentoTurnoDashboardAction()
      .then((snapshot) => {
        aplicarSnapshot(snapshot)
      })
      .catch((error: unknown) => {
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o planejamento do turno.'
        registrarErro(mensagem)
      })
      .finally(() => {
        recargaEmAndamentoRef.current = null
      })

    recargaEmAndamentoRef.current = recarga
    return recarga
  }, [aplicarSnapshot, registrarErro])

  useEffect(() => {
    if (initialPlanning) {
      setUltimaAtualizacao(new Date())
    }
  }, [initialPlanning])

  useEffect(() => {
    if (!initialPlanning) {
      void recarregar()
    }

    const intervalo = window.setInterval(() => {
      void recarregar()
    }, INTERVALO_POLLING_DASHBOARD_MS)

    return () => {
      window.clearInterval(intervalo)
    }
  }, [initialPlanning, recarregar])

  return {
    planejamento,
    ultimaAtualizacao,
    statusConexao,
    estaCarregando,
    erro,
    recarregar,
  }
}
