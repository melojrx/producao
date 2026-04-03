import { listarResumoEficienciaOperacionalTurnoComClient } from '@/lib/queries/eficiencia-operacional-turno-base'
import { createClient } from '@/lib/supabase/server'
import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  ResumoEficienciaOperacionalTurnoV2,
} from '@/types'

export async function listarResumoEficienciaOperacionalTurno(
  turnoId: string
): Promise<ResumoEficienciaOperacionalTurnoV2> {
  const supabase = await createClient()
  return listarResumoEficienciaOperacionalTurnoComClient(supabase, turnoId)
}

export async function listarEficienciaOperacionalHoraDoTurno(
  turnoId: string
): Promise<EficienciaOperacionalHoraRegistroV2[]> {
  const resumo = await listarResumoEficienciaOperacionalTurno(turnoId)
  return resumo.porHora
}

export async function listarEficienciaOperacionalDiaDoTurno(
  turnoId: string
): Promise<EficienciaOperacionalDiaRegistroV2[]> {
  const resumo = await listarResumoEficienciaOperacionalTurno(turnoId)
  return resumo.porDia
}
