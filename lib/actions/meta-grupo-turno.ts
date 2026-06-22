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

  return []
}
