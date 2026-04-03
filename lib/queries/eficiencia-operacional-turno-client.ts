import { listarResumoEficienciaOperacionalTurnoComClient } from '@/lib/queries/eficiencia-operacional-turno-base'
import { createClient } from '@/lib/supabase/client'
import type {
  EficienciaOperacionalDiaRegistroV2,
  EficienciaOperacionalHoraRegistroV2,
  ResumoEficienciaOperacionalTurnoV2,
} from '@/types'

export async function listarResumoEficienciaOperacionalTurnoClient(
  turnoId: string
): Promise<ResumoEficienciaOperacionalTurnoV2> {
  const supabase = createClient()
  return listarResumoEficienciaOperacionalTurnoComClient(supabase, turnoId)
}

export async function listarEficienciaOperacionalHoraDoTurnoClient(
  turnoId: string
): Promise<EficienciaOperacionalHoraRegistroV2[]> {
  const resumo = await listarResumoEficienciaOperacionalTurnoClient(turnoId)
  return resumo.porHora
}

export async function listarEficienciaOperacionalDiaDoTurnoClient(
  turnoId: string
): Promise<EficienciaOperacionalDiaRegistroV2[]> {
  const resumo = await listarResumoEficienciaOperacionalTurnoClient(turnoId)
  return resumo.porDia
}
