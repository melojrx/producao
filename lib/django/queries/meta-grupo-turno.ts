import { djangoFetch } from '../client.ts'
import { obterAccessTokenDjango } from './obter-token-servidor.ts'
import type { RegistroProducaoTurnoHora } from '@/types'

const PREFIXO_API = '/api/v1'

interface DjangoRegistroProducaoMetaGrupoJson {
  hora_registro: string | null
  quantidade: number | null
  turno_op: string | null
  turno_setor_operacao: string | null
}

export async function listarRegistrosMetaGrupoTurnoV2Django(
  turnoId: string,
  turnoOpIds: string[]
): Promise<RegistroProducaoTurnoHora[]> {
  const idsValidos = new Set(turnoOpIds.filter(Boolean))

  if (idsValidos.size === 0 || !turnoId) {
    return []
  }

  const accessToken = await obterAccessTokenDjango()
  const registros = await djangoFetch<DjangoRegistroProducaoMetaGrupoJson[]>(
    `${PREFIXO_API}/producao/registros/?turno=${encodeURIComponent(turnoId)}`,
    { accessToken }
  )

  return (registros ?? [])
    .filter(
      (
        registro
      ): registro is DjangoRegistroProducaoMetaGrupoJson & {
        hora_registro: string
        turno_setor_operacao: string
        turno_op: string
      } =>
        Boolean(
          registro.hora_registro &&
            registro.turno_setor_operacao &&
            registro.turno_op &&
            idsValidos.has(registro.turno_op)
        )
    )
    .map((registro) => ({
      horaRegistro: registro.hora_registro,
      quantidade: registro.quantidade ?? 0,
      turnoSetorOperacaoId: registro.turno_setor_operacao,
    }))
    .sort((a, b) => a.horaRegistro.localeCompare(b.horaRegistro))
}
