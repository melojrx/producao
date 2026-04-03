'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'
import { listarRegistrosMetaGrupoTurnoV2 } from '@/lib/queries/meta-grupo-turno-v2-client'
import {
  calcularMetaGrupoTurnoV2,
  criarComparativoMetaGrupoHora,
} from '@/lib/utils/meta-grupo-turno'
import type {
  ComparativoMetaGrupoHoraItem,
  PlanejamentoTurnoDashboardV2,
  RegistroProducaoTurnoHora,
} from '@/types'

interface UseMetaGrupoTurnoV2Resultado {
  comparativoPorHora: ComparativoMetaGrupoHoraItem[]
  erro: string | null
  estaCarregando: boolean
  mediaTpProduto: number
  metaGrupo: number
}

export function useMetaGrupoTurnoV2(
  planejamento: PlanejamentoTurnoDashboardV2 | null,
  refreshKey: number
): UseMetaGrupoTurnoV2Resultado {
  const [registros, setRegistros] = useState<RegistroProducaoTurnoHora[]>([])
  const [estaCarregando, setEstaCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const resumoMetaGrupo = useMemo(() => {
    if (!planejamento) {
      return {
        mediaTpProduto: 0,
        metaGrupo: 0,
      }
    }

    return calcularMetaGrupoTurnoV2(planejamento.turno, planejamento.ops)
  }, [planejamento])

  const turnoOpIdsKey = planejamento?.ops.map((op) => op.id).join('|') ?? ''

  useEffect(() => {
    if (!planejamento) {
      startTransition(() => {
        setRegistros([])
        setErro(null)
        setEstaCarregando(false)
      })
      return
    }

    let ativo = true
    setEstaCarregando(true)

    listarRegistrosMetaGrupoTurnoV2(planejamento.ops.map((op) => op.id))
      .then((resultado) => {
        if (!ativo) {
          return
        }

        startTransition(() => {
          setRegistros(resultado)
          setErro(null)
          setEstaCarregando(false)
        })
      })
      .catch((error: unknown) => {
        if (!ativo) {
          return
        }

        startTransition(() => {
          setErro(
            error instanceof Error
              ? error.message
              : 'Não foi possível carregar a série horária da Meta do Grupo.'
          )
          setEstaCarregando(false)
        })
      })

    return () => {
      ativo = false
    }
  }, [planejamento, refreshKey, turnoOpIdsKey])

  const comparativoPorHora = useMemo(() => {
    if (!planejamento) {
      return []
    }

    return criarComparativoMetaGrupoHora(
      planejamento.turno,
      resumoMetaGrupo.metaGrupo,
      registros,
      planejamento.demandasSetor ?? [],
      planejamento.operacoesSecao
    )
  }, [
    planejamento,
    registros,
    resumoMetaGrupo.metaGrupo,
  ])

  return {
    comparativoPorHora,
    erro,
    estaCarregando,
    mediaTpProduto: resumoMetaGrupo.mediaTpProduto,
    metaGrupo: resumoMetaGrupo.metaGrupo,
  }
}
