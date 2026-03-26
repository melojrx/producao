'use client'

import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  buscarConfiguracaoTurnoComBlocosHojeClient,
  listarProducaoHoje,
  listarProducaoPorHora,
  listarResumoBlocosHoje,
  listarStatusMaquinas,
} from '@/lib/queries/producao'
import type {
  ConfiguracaoTurnoComBlocos,
  ProducaoBlocoResumo,
  ProducaoHojeRegistro,
  ProducaoPorHoraRegistro,
  StatusMaquinaRegistro,
} from '@/types'

interface SnapshotProducao {
  registros: ProducaoHojeRegistro[]
  producaoPorHora: ProducaoPorHoraRegistro[]
  statusMaquinas: StatusMaquinaRegistro[]
  configuracaoTurno: ConfiguracaoTurnoComBlocos | null
  blocosResumo: ProducaoBlocoResumo[]
}

export type StatusConexaoRealtime = 'conectando' | 'ativo' | 'erro'

export interface UseRealtimeProducaoResultado {
  registros: ProducaoHojeRegistro[]
  producaoPorHora: ProducaoPorHoraRegistro[]
  statusMaquinas: StatusMaquinaRegistro[]
  totalPecas: number
  eficienciaMedia: number
  configuracaoTurno: ConfiguracaoTurnoComBlocos | null
  blocosResumo: ProducaoBlocoResumo[]
  ultimaAtualizacao: Date | null
  statusConexao: StatusConexaoRealtime
  estaCarregando: boolean
  erro: string | null
  recarregar: () => Promise<void>
}

function calcularTotalPecas(registros: ProducaoHojeRegistro[]): number {
  return registros.reduce((soma, registro) => soma + registro.totalPecas, 0)
}

function calcularEficienciaMedia(registros: ProducaoHojeRegistro[]): number {
  if (registros.length === 0) {
    return 0
  }

  const somaEficiencia = registros.reduce((soma, registro) => soma + registro.eficienciaPct, 0)
  return Math.round((somaEficiencia / registros.length) * 100) / 100
}

async function carregarSnapshot(): Promise<SnapshotProducao> {
  const [registros, producaoPorHora, statusMaquinas, configuracaoTurno, blocosResumo] = await Promise.all([
    listarProducaoHoje(),
    listarProducaoPorHora(),
    listarStatusMaquinas(),
    buscarConfiguracaoTurnoComBlocosHojeClient(),
    listarResumoBlocosHoje(),
  ])

  return {
    registros,
    producaoPorHora,
    statusMaquinas,
    configuracaoTurno,
    blocosResumo,
  }
}

export function useRealtimeProducao(): UseRealtimeProducaoResultado {
  const [registros, setRegistros] = useState<ProducaoHojeRegistro[]>([])
  const [producaoPorHora, setProducaoPorHora] = useState<ProducaoPorHoraRegistro[]>([])
  const [statusMaquinas, setStatusMaquinas] = useState<StatusMaquinaRegistro[]>([])
  const [configuracaoTurno, setConfiguracaoTurno] = useState<ConfiguracaoTurnoComBlocos | null>(null)
  const [blocosResumo, setBlocosResumo] = useState<ProducaoBlocoResumo[]>([])
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null)
  const [statusConexao, setStatusConexao] = useState<StatusConexaoRealtime>('conectando')
  const [estaCarregando, setEstaCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const recargaEmAndamentoRef = useRef<Promise<void> | null>(null)

  const aplicarSnapshot = useEffectEvent((snapshot: SnapshotProducao) => {
    startTransition(() => {
      setRegistros(snapshot.registros)
      setProducaoPorHora(snapshot.producaoPorHora)
      setStatusMaquinas(snapshot.statusMaquinas)
      setConfiguracaoTurno(snapshot.configuracaoTurno)
      setBlocosResumo(snapshot.blocosResumo)
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

    const recarga = carregarSnapshot()
      .then((snapshot) => {
        aplicarSnapshot(snapshot)
      })
      .catch((error: unknown) => {
        const mensagem =
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar os dados de produção em tempo real.'
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
      .channel('dashboard-producao-hoje')
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
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'maquinas',
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
          registrarErro('Não foi possível conectar o dashboard ao Realtime do Supabase.')
        }
      })

    void recarregar()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [recarregar, registrarErro])

  return {
    registros,
    producaoPorHora,
    statusMaquinas,
    totalPecas: calcularTotalPecas(registros),
    eficienciaMedia: calcularEficienciaMedia(registros),
    configuracaoTurno,
    blocosResumo,
    ultimaAtualizacao,
    statusConexao,
    estaCarregando,
    erro,
    recarregar,
  }
}
