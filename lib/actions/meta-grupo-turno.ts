'use server'

import { estaUsandoDjango } from '@/lib/django/flags'
import type { RegistroProducaoTurnoHora } from '@/types'

export async function listarRegistrosMetaGrupoTurnoV2Action(
  turnoId: string,
  turnoOpIds: string[]
): Promise<RegistroProducaoTurnoHora[]> {
  if (estaUsandoDjango('dashboard_reads')) {
    const { listarRegistrosMetaGrupoTurnoV2Django } = await import(
      '@/lib/django/queries/meta-grupo-turno'
    )
    return listarRegistrosMetaGrupoTurnoV2Django(turnoId, turnoOpIds)
  }

  const { listarRegistrosMetaGrupoTurnoV2 } = await import(
    '@/lib/queries/meta-grupo-turno-v2-client'
  )
  return listarRegistrosMetaGrupoTurnoV2(turnoOpIds)
}
