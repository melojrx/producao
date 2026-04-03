'use client'

import { createClient } from '@/lib/supabase/client'
import type { RegistroProducaoTurnoHora } from '@/types'
import type { Tables } from '@/types/supabase'

type RegistroResumoTurnoRow = Pick<
  Tables<'registros_producao'>,
  'hora_registro' | 'quantidade' | 'turno_setor_operacao_id'
>

export async function listarRegistrosMetaGrupoTurnoV2(
  turnoOpIds: string[]
): Promise<RegistroProducaoTurnoHora[]> {
  const idsValidos = Array.from(new Set(turnoOpIds.filter(Boolean)))

  if (idsValidos.length === 0) {
    return []
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('registros_producao')
    .select('hora_registro, quantidade, turno_setor_operacao_id')
    .in('turno_op_id', idsValidos)
    .not('hora_registro', 'is', null)
    .not('turno_setor_operacao_id', 'is', null)
    .order('hora_registro', { ascending: true })
    .returns<RegistroResumoTurnoRow[]>()

  if (error) {
    throw new Error(`Erro ao listar registros horários do turno: ${error.message}`)
  }

  return (data ?? [])
    .filter(
      (
        registro
      ): registro is RegistroResumoTurnoRow & {
        hora_registro: string
        turno_setor_operacao_id: string
      } => Boolean(registro.hora_registro && registro.turno_setor_operacao_id)
    )
    .map((registro) => ({
      horaRegistro: registro.hora_registro,
      quantidade: registro.quantidade ?? 0,
      turnoSetorOperacaoId: registro.turno_setor_operacao_id,
    }))
}
