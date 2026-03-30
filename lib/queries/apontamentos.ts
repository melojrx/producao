import { createClient } from '@/lib/supabase/server'
import {
  listarTurnoSetorOperacoesDoTurnoComClient,
  listarTurnoSetorOperacoesPorSecaoComClient,
} from '@/lib/queries/turno-setor-operacoes-base'
import type { TurnoSetorOperacaoApontamentoV2 } from '@/types'

export async function listarTurnoSetorOperacoesPorSecao(
  turnoSetorOpId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = await createClient()
  return listarTurnoSetorOperacoesPorSecaoComClient(supabase, turnoSetorOpId)
}

export async function listarTurnoSetorOperacoesDoTurno(
  turnoId: string
): Promise<TurnoSetorOperacaoApontamentoV2[]> {
  const supabase = await createClient()
  return listarTurnoSetorOperacoesDoTurnoComClient(supabase, turnoId)
}
