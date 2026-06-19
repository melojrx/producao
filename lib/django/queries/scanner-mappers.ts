import type {
  OperadorScaneado,
  TurnoSetorDemandaScaneada,
  TurnoSetorScaneado,
} from '@/types'

export interface DjangoOperadorScannerJson {
  id: string
  nome: string
  matricula: string
  foto_url: string
}

export interface DjangoTurnoSetorScannerJson {
  id: string
  turno_id: string
  turno_iniciado_em: string
  setor_id: string
  setor_nome: string
  setor_modo_apontamento: string
  quantidade_planejada: number
  quantidade_realizada: number
  qr_code_token: string
  status: string
}

export interface DjangoTurnoSetorDemandaScannerJson {
  id: string
  turno_setor_id: string
  turno_id: string
  turno_op_id: string
  produto_id: string
  setor_id: string
  turno_setor_op_legacy_id: string | null
  quantidade_planejada: number
  quantidade_herdada_setor: number
  quantidade_realizada: number
  quantidade_liberada_setor: number
  status: string
  numero_op: string
  produto_nome: string
  produto_referencia: string
}

function textoOuNull(valor: string | null | undefined): string | null {
  if (!valor || !valor.trim()) {
    return null
  }

  return valor
}

export function mapearOperadorScaneadoDjango(
  django: DjangoOperadorScannerJson
): OperadorScaneado {
  return {
    id: django.id,
    nome: django.nome,
    matricula: django.matricula,
    fotoUrl: textoOuNull(django.foto_url),
  }
}

export function mapearTurnoSetorScaneadoBaseDjango(
  django: DjangoTurnoSetorScannerJson,
  modoApontamento: TurnoSetorScaneado['modoApontamento']
): TurnoSetorScaneado {
  return {
    id: django.id,
    turnoId: django.turno_id,
    turnoIniciadoEm: django.turno_iniciado_em,
    setorId: django.setor_id,
    setorNome: django.setor_nome,
    modoApontamento,
    quantidadePlanejada: django.quantidade_planejada,
    quantidadeRealizada: django.quantidade_realizada,
    quantidadeConcluida: django.quantidade_realizada,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(django.quantidade_planejada - django.quantidade_realizada, 0),
    qrCodeToken: django.qr_code_token,
    status: django.status as TurnoSetorScaneado['status'],
  }
}

export function mapearTurnoSetorDemandaScaneadaDjango(
  django: DjangoTurnoSetorDemandaScannerJson
): TurnoSetorDemandaScaneada {
  return {
    id: django.id,
    turnoSetorId: django.turno_setor_id,
    turnoId: django.turno_id,
    turnoOpId: django.turno_op_id,
    setorId: django.setor_id,
    numeroOp: django.numero_op || 'OP sem número',
    produtoId: django.produto_id,
    produtoNome: django.produto_nome || 'Produto sem nome',
    produtoReferencia: django.produto_referencia || 'Sem referência',
    quantidadePlanejada: django.quantidade_planejada,
    quantidadeRealizada: django.quantidade_realizada,
    quantidadeHerdadaSetor: django.quantidade_herdada_setor,
    quantidadeConcluida: django.quantidade_realizada,
    quantidadeLiberadaSetor: django.quantidade_liberada_setor,
    progressoOperacionalPct: 0,
    cargaPlanejadaTp: 0,
    cargaRealizadaTp: 0,
    saldoRestante: Math.max(
      django.quantidade_planejada -
        django.quantidade_herdada_setor -
        django.quantidade_realizada,
      0
    ),
    status: django.status as TurnoSetorDemandaScaneada['status'],
    turnoSetorOpLegacyId: django.turno_setor_op_legacy_id,
  }
}

export function mapearDemandasScaneadasDjango(
  demandas: DjangoTurnoSetorDemandaScannerJson[]
): TurnoSetorDemandaScaneada[] {
  return demandas.map(mapearTurnoSetorDemandaScaneadaDjango)
}
