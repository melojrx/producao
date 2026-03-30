'use client'

import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buscarTurnoAbertoOuUltimoEncerradoClient } from '@/lib/queries/turnos-client'
import type { PlanejamentoTurnoDashboardV2 } from '@/types'

export type StatusConexaoRealtimeTurnoV2 = 'conectando' | 'ativo' | 'erro'

export interface UseRealtimePlanejamentoTurnoV2Resultado {
  planejamento: PlanejamentoTurnoDashboardV2 | null
  ultimaAtualizacao: Date | null
  statusConexao: StatusConexaoRealtimeTurnoV2
  estaCarregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

async function carregarSnapshotPlanejamento(): Promise<PlanejamentoTurnoDashboardV2 | null> {
  return buscarTurnoAbertoOuUltimoEncerradoClient()
}

export function useRealtimePlanejamentoTurnoV2(
  initialPlanning: PlanejamentoTurnoDashboardV2 | null
): UseRealtimePlanejamentoTurnoV2Resultado {
  const [planejamento, setPlanejamento] = useState<PlanejamentoTurnoDashboardV2 | null>(initialPlanning)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(
    initialPlanning ? new Date() : null
  )
  const [statusConexao, setStatusConexao] =
    useState<StatusConexaoRealtimeTurnoV2>('conectando')
  const [estaCarregando, setEstaCarregando] = useState(initialPlanning === null)
  const [erro, setErro] = useState<string | null>(null)
  const recargaEmAndamentoRef = useRef<Promise<void> | null>(null)

  const aplicarSnapshot = useEffectEvent((snapshot: PlanejamentoTurnoDashboardV2 | null) => {
    startTransition(() => {
      setPlanejamento(snapshot)
      setUltimaAtualizacao(new Date())
      setErro(null)
      setEstaCarregando(false)
    })
  })

  const registrarErro = useEffectEvent((mensagem: string) => {
    startTransition(() => {
      setErro(mensagem)
      setStatusConexao('erro')
      setEstaCarregando(false)
    })
  })

  const recarregar = useEffectEvent(async () => {
    if (recargaEmAndamentoRef.current) {
      return recargaEmAndamentoRef.current
    }

    setEstaCarregando(true)

    const recarga = carregarSnapshotPlanejamento()
      .then((snapshot) => {
        aplicarSnapshot(snapshot)
      })
      .catch((error: unknown) => {
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar o planejamento do turno em tempo real.'
        registrarErro(mensagem)
      })
      .finally(() => {
        recargaEmAndamentoRef.current = null
      })

    recargaEmAndamentoRef.current = recarga
    return recarga
  })

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-planejamento-turno-v2')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turnos',
        },
        () => {
          void recarregar()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turno_ops',
        },
        () => {
          void recarregar()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turno_setor_ops',
        },
        () => {
          void recarregar()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'turno_setor_operacoes',
        },
        () => {
          void recarregar()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'registros_producao',
        },
        () => {
          void recarregar()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setStatusConexao('ativo')
          return
        }

        if (status === 'CHANNEL_ERROR') {
          registrarErro('Não foi possível conectar a dashboard V2 ao Realtime do Supabase.')
        }
      })

    if (!initialPlanning) {
      void recarregar()
    }

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [initialPlanning, recarregar, registrarErro])

  return {
    planejamento,
    ultimaAtualizacao,
    statusConexao,
    estaCarregando,
    erro,
    recarregar,
  }
}
